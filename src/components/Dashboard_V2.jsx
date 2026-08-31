import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// URL del backend se toma de una variable de entorno (VITE_API_URL).
// El valor por defecto es la URL pública del backend, no un secreto.
const API_BASE = (import.meta.env.VITE_API_URL || 'https://agroweb-vv4b.onrender.com/api').replace(/\/$/, '')

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

// Tiles estándar de OpenStreetMap (gratuitas, sin API key). El look oscuro se logra
// invirtiendo/oscureciendo solo la capa base con CSS (ver .dv2-map en cssBase), así los
// polígonos y marcadores de los lotes mantienen sus colores reales.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors'

const COLOR_VERDE = '#4CAF6D'
const COLOR_AMARILLO = '#FDD835'
const COLOR_GRIS = '#8FA396'
const COLOR_ROJO = '#E5534B'

// Filtros de estado por tipo de actividad: qué texto del nombre del tipo de
// actividad identifica cada uno, y desde cuándo se considera "al día" (mes calendario actual)
const FILTROS_ACTIVIDAD = {
  fumigacion: { label: '💨 Fumigación', patron: /fumig/i },
  abono: { label: '🌱 Abono / Fertilización', patron: /abon|fertiliz/i },
}

// ==================== CARGA DIFERIDA DE LEAFLET (sin tocar package.json) ====================
let leafletPromise = null
function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    try {
      if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = LEAFLET_CSS
        document.head.appendChild(link)
      }

      const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`)
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L))
        existing.addEventListener('error', () => reject(new Error('leaflet-load-error')))
        return
      }

      const script = document.createElement('script')
      script.src = LEAFLET_JS
      script.async = true
      script.onload = () => resolve(window.L)
      script.onerror = () => reject(new Error('leaflet-load-error'))
      document.head.appendChild(script)
    } catch {
      reject(new Error('leaflet-load-error'))
    }
  })

  return leafletPromise
}

// ==================== HELPERS DE DATOS (defensivos: el esquema real de geometría puede variar) ====================

// Intenta extraer un anillo de polígono [[lat,lng], ...] desde varios nombres de campo posibles
function extraerPoligono(lote) {
  const candidatos = [lote.poligono, lote.geom, lote.geojson, lote.coordenadas, lote.geometry]

  for (const raw of candidatos) {
    if (!raw) continue
    try {
      const valor = typeof raw === 'string' ? JSON.parse(raw) : raw
      const anillo = normalizarAnillo(valor)
      if (anillo && anillo.length >= 3) return anillo
    } catch {
      // geometría malformada en este campo, se prueba el siguiente candidato
    }
  }
  return null
}

function normalizarAnillo(valor) {
  // GeoJSON Polygon: coordinates[0] es un anillo de [lng, lat]
  if (valor && valor.type === 'Polygon' && Array.isArray(valor.coordinates?.[0])) {
    return valor.coordinates[0]
      .map((pt) => (Array.isArray(pt) && pt.length >= 2 ? [Number(pt[1]), Number(pt[0])] : null))
      .filter((pt) => pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
  }
  // Array simple de pares [lat, lng]
  if (Array.isArray(valor) && Array.isArray(valor[0])) {
    return valor
      .map((pt) => (Array.isArray(pt) && pt.length >= 2 ? [Number(pt[0]), Number(pt[1])] : null))
      .filter((pt) => pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1]))
  }
  return null
}

function extraerPunto(lote) {
  const lat = Number(lote.latitud ?? lote.lat ?? lote.latitude)
  const lng = Number(lote.longitud ?? lote.lng ?? lote.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]
  return null
}

function colorPorEstado(estado) {
  const e = (estado || '').toString().trim().toLowerCase()
  if (['activo', 'en_curso', 'sembrado', 'cultivado'].includes(e)) return COLOR_VERDE
  if (['en_proceso', 'pendiente', 'preparacion', 'preparación'].includes(e)) return COLOR_AMARILLO
  return COLOR_GRIS
}

// Si el lote no trae un campo "estado", se estima uno a partir de su actividad reciente
function estimarEstadoPorActividad(ultimaFecha) {
  if (!ultimaFecha) return 'sin_actividad'
  const dias = (Date.now() - new Date(ultimaFecha).getTime()) / 86400000
  if (!Number.isFinite(dias)) return 'sin_actividad'
  return dias <= 30 ? 'activo' : 'en_proceso'
}

// Intento best-effort de enriquecer los lotes con geometría desde el backend Django/REST.
// Si falla o no está disponible, se ignora y se sigue trabajando solo con Supabase.
async function obtenerGeometriaDesdeApi(fincaId) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return null

    const res = await fetch(`${API_BASE}/lotes/?finca_id=${encodeURIComponent(fincaId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null

    const json = await res.json()
    const lista = Array.isArray(json) ? json : Array.isArray(json?.results) ? json.results : null
    return lista
  } catch {
    console.error('No se pudo obtener geometría adicional del backend')
    return null
  }
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Dashboard_V2() {
  const [user, setUser] = useState(null)

  const [fincas, setFincas] = useState([])
  const [fincaId, setFincaId] = useState('')

  const [tiposActividad, setTiposActividad] = useState([])

  const [lotesGeo, setLotesGeo] = useState([])
  const [totalActividades6m, setTotalActividades6m] = useState(0)
  const [actividadesPorMes, setActividadesPorMes] = useState([])
  const [actividadesResumen, setActividadesResumen] = useState([])

  const [selectedLote, setSelectedLote] = useState(null)
  const [filtroActividad, setFiltroActividad] = useState(null)
  const [mapExpandido, setMapExpandido] = useState(false)

  const [filtroMesResumen, setFiltroMesResumen] = useState('')
  const [filtroTipoResumen, setFiltroTipoResumen] = useState('')
  const [filtroLoteResumen, setFiltroLoteResumen] = useState('')

  const [dataError, setDataError] = useState('')
  const [mapError, setMapError] = useState('')
  const [cargandoDatos, setCargandoDatos] = useState(false)

  const [leafletReady, setLeafletReady] = useState(false)

  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const layerGroupRef = useRef(null)
  const leafletRef = useRef(null)

  // ---------- Autenticación ----------
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user?.id || null)
      } catch {
        console.error('No se pudo obtener la sesión del usuario')
      }
    }
    getUser()
  }, [])

  // ---------- Fincas ----------
  useEffect(() => {
    if (!user) return

    const fetchFincas = async () => {
      try {
        const { data, error } = await supabase.from('api_finca').select('*').eq('user_id', user)
        if (error) throw error
        setFincas(data || [])
        if (data && data.length > 0) setFincaId(String(data[0].id))
      } catch {
        setDataError('No se pudieron cargar datos')
      }
    }

    fetchFincas()
  }, [user])

  // ---------- Tipos de actividad (catálogo compartido, para los filtros) ----------
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const { data, error } = await supabase.from('api_tipoactividad').select('id, nombre')
        if (error) throw error
        setTiposActividad(data || [])
      } catch {
        console.error('No se pudieron cargar los tipos de actividad')
      }
    }
    fetchTipos()
  }, [])

  // ---------- Lotes + geometría + actividades por finca ----------
  useEffect(() => {
    if (!user || !fincaId) return

    let cancelado = false

    const fetchTodo = async () => {
      setCargandoDatos(true)
      setDataError('')
      setSelectedLote(null)

      try {
        const fincaIdNum = parseInt(fincaId, 10)

        const [{ data: lotesData, error: lotesErr }, { data: relData, error: relErr }] = await Promise.all([
          supabase.from('api_lote').select('*').eq('finca_id', fincaIdNum),
          supabase
            .from('api_actividad_lote')
            .select('lote_id, api_actividad(id, fecha, tipo_id, finca_id, responsable, costo_total)'),
        ])

        if (lotesErr) throw lotesErr
        if (relErr) throw relErr

        // Solo las vinculaciones que corresponden a esta finca
        const relFinca = (relData || []).filter((rel) => rel.api_actividad?.finca_id === fincaIdNum)

        // Última fecha de actividad conocida por lote (para estimar estado si falta el campo)
        const ultimaActividadPorLote = {}
        for (const rel of relFinca) {
          const fecha = rel.api_actividad?.fecha
          if (!fecha) continue
          const actual = ultimaActividadPorLote[rel.lote_id]
          if (!actual || fecha > actual) ultimaActividadPorLote[rel.lote_id] = fecha
        }

        // Actividades por lote (para el panel de detalle y los filtros de fumigación/abono)
        const actividadesPorLote = {}
        for (const rel of relFinca) {
          const act = rel.api_actividad
          if (!act) continue
          if (!actividadesPorLote[rel.lote_id]) actividadesPorLote[rel.lote_id] = []
          actividadesPorLote[rel.lote_id].push(act)
        }

        const tipoNombrePorId = {}
        for (const t of tiposActividad) tipoNombrePorId[t.id] = t.nombre

        const ahora = new Date()
        const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`
        const idsFumigacion = tiposActividad.filter((t) => FILTROS_ACTIVIDAD.fumigacion.patron.test(t.nombre)).map((t) => t.id)
        const idsAbono = tiposActividad.filter((t) => FILTROS_ACTIVIDAD.abono.patron.test(t.nombre)).map((t) => t.id)

        // Productos aplicados por actividad (para el detalle de lote y el resumen general)
        const actividadIds = [...new Set(relFinca.map((rel) => rel.api_actividad?.id).filter(Boolean))]
        const productosPorActividad = {}
        if (actividadIds.length > 0) {
          const { data: prodData } = await supabase
            .from('api_actividad_producto')
            .select('actividad_id, cantidad, dosis_por_hectarea, api_producto(nombre, unidad)')
            .in('actividad_id', actividadIds)

          for (const p of prodData || []) {
            if (!productosPorActividad[p.actividad_id]) productosPorActividad[p.actividad_id] = []
            productosPorActividad[p.actividad_id].push({
              nombre: p.api_producto?.nombre || 'Producto',
              unidad: p.api_producto?.unidad || '',
              cantidad: p.cantidad,
              dosisPorHa: p.dosis_por_hectarea,
            })
          }
        }

        // Lotes por actividad (nombre + área actual) + lista deduplicada de actividades de la finca.
        // La dosis/ha se recalcula siempre en vivo (cantidad / área actual de los lotes vinculados) en
        // vez de confiar en dosis_por_hectarea guardada al registrar: si el área de algún lote cambió
        // desde entonces, ese valor guardado queda desactualizado y puede dar resultados imposibles
        // (una porción "de un lote" mayor que el total aplicado).
        const lotesPorActividad = {}
        const areaTotalPorActividad = {}
        const actividadesFincaMap = new Map()
        for (const rel of relFinca) {
          const act = rel.api_actividad
          if (!act) continue
          const loteRef = (lotesData || []).find((l) => l.id === rel.lote_id)
          const loteArea = Number(loteRef?.area_hectareas ?? loteRef?.superficie ?? 0) || 0
          if (!lotesPorActividad[act.id]) lotesPorActividad[act.id] = []
          lotesPorActividad[act.id].push({ id: rel.lote_id, nombre: loteRef?.nombre || 'Lote' })
          areaTotalPorActividad[act.id] = (areaTotalPorActividad[act.id] || 0) + loteArea
          actividadesFincaMap.set(act.id, act)
        }

        const conDosisRecalculada = (actividadId) => {
          const areaTotal = areaTotalPorActividad[actividadId] || 0
          return (productosPorActividad[actividadId] || []).map((p) => ({
            ...p,
            dosisPorHa: areaTotal > 0 ? Number((p.cantidad / areaTotal).toFixed(2)) : p.dosisPorHa,
          }))
        }

        // Costo prorrateado por lote: si la actividad tocó un solo lote, el costo es 100% suyo;
        // si tocó varios, se reparte proporcional al área de cada uno (mismo criterio que los productos).
        const costoParaLote = (act, areaLote) => {
          const numLotes = (lotesPorActividad[act.id] || []).length || 1
          const areaTotal = areaTotalPorActividad[act.id] || 0
          if (numLotes <= 1 || !areaLote || areaTotal <= 0) return act.costo_total || 0
          return (act.costo_total || 0) * (areaLote / areaTotal)
        }

        const resumenCompleto = [...actividadesFincaMap.values()]
          .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
          .map((act) => ({
            ...act,
            tipoNombre: tipoNombrePorId[act.tipo_id] || 'Actividad',
            lotes: lotesPorActividad[act.id] || [],
            productos: conDosisRecalculada(act.id),
          }))

        if (!cancelado) setActividadesResumen(resumenCompleto)

        // Enriquecimiento opcional de geometría desde el backend REST (no bloqueante)
        const geoApi = await obtenerGeometriaDesdeApi(fincaId)
        const geoApiPorId = new Map()
        if (Array.isArray(geoApi)) {
          for (const g of geoApi) {
            if (g && (g.id !== undefined && g.id !== null)) geoApiPorId.set(String(g.id), g)
          }
        }

        const procesados = (lotesData || []).map((lote) => {
          const fuenteGeo = geoApiPorId.get(String(lote.id)) || lote
          const poligono = extraerPoligono(fuenteGeo) || extraerPoligono(lote)
          const punto = poligono ? null : extraerPunto(fuenteGeo) || extraerPunto(lote)
          const estado = lote.estado || fuenteGeo.estado || estimarEstadoPorActividad(ultimaActividadPorLote[lote.id])

          const actividadesLote = (actividadesPorLote[lote.id] || [])
            .slice()
            .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

          const fumigadoEsteMes = actividadesLote.some((a) => idsFumigacion.includes(a.tipo_id) && a.fecha >= inicioMes)
          const abonadoEsteMes = actividadesLote.some((a) => idsAbono.includes(a.tipo_id) && a.fecha >= inicioMes)

          const areaLote = Number(lote.area_hectareas ?? lote.superficie ?? 0) || null

          // Costo histórico total del lote: suma del costo prorrateado de TODAS sus actividades
          // (no solo las 5 recientes que se muestran en el historial)
          const costoTotalLote = actividadesLote.reduce((sum, a) => sum + costoParaLote(a, areaLote), 0)
          const costoPorHa = areaLote ? Number((costoTotalLote / areaLote).toFixed(2)) : null

          return {
            ...lote,
            estado,
            poligono,
            punto,
            fumigadoEsteMes,
            abonadoEsteMes,
            costoTotalLote: Number(costoTotalLote.toFixed(2)),
            costoPorHa,
            actividadesRecientes: actividadesLote.slice(0, 5).map((a) => {
              const numLotes = (lotesPorActividad[a.id] || []).length || 1
              const compartido = numLotes > 1
              const areaTotalActividad = areaTotalPorActividad[a.id] || 0

              const productos = (productosPorActividad[a.id] || []).map((p) => {
                // Reparto proporcional por área actual: garantiza que la suma de las porciones de
                // todos los lotes de la actividad de vuelta a dar exactamente el total aplicado.
                const cantidadEsteLote =
                  compartido && areaLote != null && areaTotalActividad > 0
                    ? Number((p.cantidad * (areaLote / areaTotalActividad)).toFixed(2))
                    : null
                const dosisPorHa =
                  compartido && areaTotalActividad > 0
                    ? Number((p.cantidad / areaTotalActividad).toFixed(2))
                    : areaLote
                      ? Number((p.cantidad / areaLote).toFixed(2))
                      : p.dosisPorHa

                return { ...p, dosisPorHa, compartido, numLotes, cantidadEsteLote }
              })
              return {
                ...a,
                tipoNombre: tipoNombrePorId[a.tipo_id] || 'Actividad',
                productos,
                costoEsteLote: Number(costoParaLote(a, areaLote).toFixed(2)),
                compartidoConOtrosLotes: numLotes > 1,
              }
            }),
          }
        })

        if (!cancelado) setLotesGeo(procesados)
      } catch {
        if (!cancelado) setDataError('No se pudieron cargar datos')
      } finally {
        if (!cancelado) setCargandoDatos(false)
      }
    }

    const fetchActividades6Meses = async () => {
      try {
        const desde = new Date()
        desde.setMonth(desde.getMonth() - 5)
        desde.setDate(1)
        const desdeStr = desde.toISOString().slice(0, 10)

        const { data, error } = await supabase
          .from('api_actividad')
          .select('fecha')
          .eq('finca_id', parseInt(fincaId, 10))
          .eq('user_id', user)
          .gte('fecha', desdeStr)

        if (error) throw error

        const buckets = {}
        const ahora = new Date()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          buckets[key] = { key, label: MESES_CORTOS[d.getMonth()], total: 0 }
        }

        for (const act of data || []) {
          const key = (act.fecha || '').slice(0, 7)
          if (buckets[key]) buckets[key].total += 1
        }

        const serie = Object.values(buckets)
        if (!cancelado) {
          setActividadesPorMes(serie)
          setTotalActividades6m(serie.reduce((sum, b) => sum + b.total, 0))
        }
      } catch {
        if (!cancelado) setDataError((prev) => prev || 'No se pudieron cargar datos')
      }
    }

    fetchTodo()
    fetchActividades6Meses()

    return () => {
      cancelado = true
    }
  }, [user, fincaId, tiposActividad])

  // ---------- Carga de Leaflet ----------
  useEffect(() => {
    let activo = true
    cargarLeaflet()
      .then((L) => {
        if (activo) {
          leafletRef.current = L
          setLeafletReady(true)
        }
      })
      .catch(() => {
        if (activo) setMapError('Mapa no disponible')
      })
    return () => {
      activo = false
    }
  }, [])

  const handleSelectLote = useCallback((lote) => {
    setSelectedLote(lote)
  }, [])

  // ---------- Inicialización y actualización del mapa ----------
  useEffect(() => {
    const L = leafletRef.current
    if (!L || !mapContainerRef.current) return

    try {
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([-34.6, -58.4], 5)
        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(mapInstanceRef.current)
        layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current)
      }

      const layerGroup = layerGroupRef.current
      layerGroup.clearLayers()

      const conGeo = lotesGeo.filter((l) => l.poligono || l.punto)

      if (conGeo.length === 0) {
        setMapError(lotesGeo.length === 0 ? '' : 'No hay datos geográficos para los lotes de esta finca')
      } else {
        setMapError('')
      }

      const bounds = []

      for (const lote of conGeo) {
        let color
        if (filtroActividad === 'fumigacion') color = lote.fumigadoEsteMes ? COLOR_VERDE : COLOR_ROJO
        else if (filtroActividad === 'abono') color = lote.abonadoEsteMes ? COLOR_VERDE : COLOR_ROJO
        else color = colorPorEstado(lote.estado)
        let layer

        if (lote.poligono) {
          layer = L.polygon(lote.poligono, { color, fillColor: color, fillOpacity: 0.45, weight: 2 })
          lote.poligono.forEach((pt) => bounds.push(pt))
        } else if (lote.punto) {
          layer = L.circleMarker(lote.punto, { radius: 10, color, fillColor: color, fillOpacity: 0.8, weight: 2 })
          bounds.push(lote.punto)
        }

        if (layer) {
          layer.bindTooltip(lote.nombre || 'Lote', { direction: 'top' })
          layer.on('click', () => handleSelectLote(lote))
          layer.addTo(layerGroup)
        }
      }

      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
      }
    } catch {
      setMapError('Mapa no disponible')
    }
  }, [lotesGeo, handleSelectLote, leafletReady, filtroActividad])

  // Recalcular el tamaño del mapa de Leaflet cuando se expande/contrae el contenedor
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const id = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 260)
    return () => clearTimeout(id)
  }, [mapExpandido])

  // Limpieza del mapa al desmontar el componente
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        layerGroupRef.current = null
      }
    }
  }, [])

  const totalFincas = fincas.length
  const totalLotes = lotesGeo.length
  const maxMensual = Math.max(1, ...actividadesPorMes.map((b) => b.total))

  // Meses con actividades registradas, para poblar el filtro de mes
  const mesesDisponibles = [...new Set(actividadesResumen.map((a) => (a.fecha || '').slice(0, 7)).filter(Boolean))].sort().reverse()

  const actividadesFiltradas = actividadesResumen.filter((a) => {
    if (filtroMesResumen && !(a.fecha || '').startsWith(filtroMesResumen)) return false
    if (filtroTipoResumen && String(a.tipo_id) !== filtroTipoResumen) return false
    if (filtroLoteResumen && !a.lotes.some((l) => String(l.id) === filtroLoteResumen)) return false
    return true
  })
  const actividadesMostradas = actividadesFiltradas.slice(0, 50)
  const totalesFiltrados = {
    cantidad: actividadesFiltradas.length,
    costo: actividadesFiltradas.reduce((sum, a) => sum + (a.costo_total || 0), 0),
  }

  return (
    <div style={styles.page}>
      <style>{cssBase}</style>

      <div style={styles.headerRow}>
        <h2 style={styles.h2}>🗺️ Visualización Mapa</h2>

        <div style={styles.selectorFinca}>
          <label style={styles.label}>Finca</label>
          <select
            value={fincaId}
            onChange={(e) => setFincaId(e.target.value)}
            style={styles.select}
          >
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {dataError && (
        <div style={styles.alertaAmarilla}>⚠️ {dataError}</div>
      )}

      {/* CARDS RESUMEN */}
      <div style={styles.cardsRow}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Fincas</p>
          <p style={styles.cardValue}>{totalFincas}</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Lotes</p>
          <p style={styles.cardValue}>{totalLotes}</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Actividades (6 meses)</p>
          <p style={styles.cardValue}>{totalActividades6m}</p>
        </div>
      </div>

      {/* MAPA + PANEL DETALLE */}
      <div style={mapExpandido ? styles.mapRowExpandido : styles.mapRow}>
        <div style={styles.mapCard}>
          <div style={styles.mapHeader}>
            <h3 style={styles.h3}>🗺️ Mapa de Lotes</h3>
            <button type="button" onClick={() => setMapExpandido((v) => !v)} style={styles.botonExpandir}>
              {mapExpandido ? '⤡ Contraer mapa' : '⤢ Expandir mapa'}
            </button>
          </div>

          <div style={styles.filtrosRow}>
            {Object.entries(FILTROS_ACTIVIDAD).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFiltroActividad((f) => (f === key ? null : key))}
                style={filtroActividad === key ? styles.filtroPillActivo : styles.filtroPill}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {filtroActividad ? (
            <div style={styles.leyenda}>
              <span style={{ ...styles.leyendaDot, background: COLOR_VERDE }} /> Al día este mes
              <span style={{ ...styles.leyendaDot, background: COLOR_ROJO, marginLeft: 12 }} /> Pendiente
            </div>
          ) : (
            <div style={styles.leyenda}>
              <span style={{ ...styles.leyendaDot, background: COLOR_VERDE }} /> Activo
              <span style={{ ...styles.leyendaDot, background: COLOR_AMARILLO, marginLeft: 12 }} /> En proceso
              <span style={{ ...styles.leyendaDot, background: COLOR_GRIS, marginLeft: 12 }} /> Sin datos
            </div>
          )}

          <div style={mapExpandido ? styles.mapWrapperExpandido : styles.mapWrapper}>
            <div ref={mapContainerRef} className="dv2-map" style={styles.mapContainer} />
            {mapError && (
              <div style={styles.mapOverlay}>
                <p>🗺️ {mapError}</p>
              </div>
            )}
            {!leafletReady && !mapError && (
              <div style={styles.mapOverlay}>
                <p>Cargando mapa…</p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.detailCard}>
          <h3 style={styles.h3}>📍 Detalle del Lote</h3>
          {!selectedLote && (
            <p style={styles.mutedText}>Selecciona un lote en el mapa para ver sus detalles.</p>
          )}
          {selectedLote && (
            <div>
              <p style={styles.detailNombre}>{selectedLote.nombre || 'Sin nombre'}</p>
              <div style={styles.detailFila}>
                <span style={styles.detailKey}>Área</span>
                <span style={styles.detailVal}>
                  {selectedLote.area_hectareas ?? selectedLote.superficie ?? '—'} ha
                </span>
              </div>
              <div style={styles.detailFila}>
                <span style={styles.detailKey}>Estado</span>
                <span style={{ ...styles.badge, background: colorPorEstado(selectedLote.estado) }}>
                  {selectedLote.estado || 'sin datos'}
                </span>
              </div>
              <div style={styles.detailFila}>
                <span style={styles.detailKey}>Fumigación (mes)</span>
                <span style={{ ...styles.badge, background: selectedLote.fumigadoEsteMes ? COLOR_VERDE : COLOR_ROJO }}>
                  {selectedLote.fumigadoEsteMes ? 'Al día' : 'Pendiente'}
                </span>
              </div>
              <div style={styles.detailFila}>
                <span style={styles.detailKey}>Abono/Fert. (mes)</span>
                <span style={{ ...styles.badge, background: selectedLote.abonadoEsteMes ? COLOR_VERDE : COLOR_ROJO }}>
                  {selectedLote.abonadoEsteMes ? 'Al día' : 'Pendiente'}
                </span>
              </div>
              <div style={styles.detailFila}>
                <span style={styles.detailKey}>Costo total (histórico)</span>
                <span style={styles.detailVal}>${selectedLote.costoTotalLote.toLocaleString()}</span>
              </div>
              <div style={styles.detailFila}>
                <span style={styles.detailKey}>Costo / ha</span>
                <span style={styles.detailVal}>{selectedLote.costoPorHa != null ? `$${selectedLote.costoPorHa.toLocaleString()}` : '—'}</span>
              </div>

              <p style={{ ...styles.detailKey, marginTop: 16, marginBottom: 8 }}>Historial de actividades</p>
              {selectedLote.actividadesRecientes?.length > 0 ? (
                <div>
                  {selectedLote.actividadesRecientes.map((a) => (
                    <div key={a.id} style={styles.actividadBloque}>
                      <div style={styles.actividadFila}>
                        <span style={{ fontWeight: 700 }}>{a.tipoNombre}</span>
                        <span style={styles.mutedText}>{a.fecha}</span>
                      </div>
                      <div style={styles.actividadFila}>
                        <span style={styles.productoNota}>
                          Costo de este lote{a.compartidoConOtrosLotes ? ' (prorrateado por área)' : ''}
                        </span>
                        <span style={{ fontWeight: 700 }}>${a.costoEsteLote.toLocaleString()}</span>
                      </div>
                      {a.productos.length > 0 ? (
                        <div style={styles.productosLista}>
                          {a.productos.map((p, i) => (
                            <div key={i} style={styles.productoFila}>
                              {p.nombre} — {p.dosisPorHa ?? '—'} {p.unidad}/ha
                              {p.compartido ? (
                                <span style={styles.productoNota}>
                                  {' '}(≈ {p.cantidadEsteLote ?? '—'}{p.unidad} en este lote, de {p.cantidad}{p.unidad} repartidos en {p.numLotes} lotes)
                                </span>
                              ) : (
                                <span style={styles.productoNota}> · {p.cantidad}{p.unidad} aplicados</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={styles.productoFilaVacio}>Sin productos aplicados (jornales/otros)</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.mutedText}>Sin actividades registradas en este lote.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GRÁFICO ACTIVIDADES */}
      <div style={styles.chartCard}>
        <h3 style={styles.h3}>📈 Actividades — Últimos 6 Meses</h3>
        {cargandoDatos ? (
          <p style={styles.mutedText}>Cargando…</p>
        ) : actividadesPorMes.every((b) => b.total === 0) ? (
          <p style={styles.mutedText}>No hay actividades registradas en este período</p>
        ) : (
          <svg viewBox="0 0 360 160" style={styles.chartSvg} preserveAspectRatio="xMidYMid meet">
            {actividadesPorMes.map((b, i) => {
              const barW = 36
              const gap = 20
              const x = 15 + i * (barW + gap)
              const h = (b.total / maxMensual) * 100
              const y = 120 - h
              return (
                <g key={b.key}>
                  <rect x={x} y={y} width={barW} height={h} fill={COLOR_VERDE} rx={3} />
                  <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#EAF3EC" fontWeight="bold">
                    {b.total}
                  </text>
                  <text x={x + barW / 2} y={138} textAnchor="middle" fontSize="11" fill="#9FB3A6">
                    {b.label}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>

      {/* RESUMEN GENERAL DE ACTIVIDADES DE LA FINCA */}
      <div style={{ ...styles.chartCard, marginTop: 24 }}>
        <h3 style={styles.h3}>📋 Resumen de Actividades de la Finca</h3>

        {actividadesResumen.length === 0 ? (
          <p style={{ ...styles.mutedText, marginTop: 8 }}>No hay actividades registradas todavía.</p>
        ) : (
          <>
            <div style={styles.filtrosResumenRow}>
              <select value={filtroMesResumen} onChange={(e) => setFiltroMesResumen(e.target.value)} style={styles.selectChico}>
                <option value="">Todos los meses</option>
                {mesesDisponibles.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select value={filtroTipoResumen} onChange={(e) => setFiltroTipoResumen(e.target.value)} style={styles.selectChico}>
                <option value="">Todos los tipos</option>
                {tiposActividad.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.nombre}</option>
                ))}
              </select>
              <select value={filtroLoteResumen} onChange={(e) => setFiltroLoteResumen(e.target.value)} style={styles.selectChico}>
                <option value="">Todos los lotes</option>
                {lotesGeo.map((l) => (
                  <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                ))}
              </select>
              {(filtroMesResumen || filtroTipoResumen || filtroLoteResumen) && (
                <button
                  type="button"
                  onClick={() => { setFiltroMesResumen(''); setFiltroTipoResumen(''); setFiltroLoteResumen('') }}
                  style={styles.botonChicoSecundario}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div style={styles.totalesFiltroRow}>
              <span>{totalesFiltrados.cantidad} actividad(es)</span>
              <span>·</span>
              <span>${totalesFiltrados.costo.toLocaleString()} en total</span>
            </div>

            {actividadesFiltradas.length === 0 ? (
              <p style={{ ...styles.mutedText, marginTop: 8 }}>Ninguna actividad coincide con estos filtros.</p>
            ) : (
              <div style={styles.tablaWrapper}>
                <table style={styles.tabla}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Lote(s)</th>
                      <th style={styles.th}>Responsable</th>
                      <th style={styles.th}>Productos aplicados</th>
                      <th style={styles.thRight}>Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividadesMostradas.map((a) => (
                      <tr key={a.id}>
                        <td style={styles.td}>{a.fecha}</td>
                        <td style={styles.td}>{a.tipoNombre}</td>
                        <td style={styles.td}>{a.lotes.map((l) => l.nombre).join(', ') || '—'}</td>
                        <td style={styles.td}>{a.responsable || '—'}</td>
                        <td style={styles.td}>
                          {a.productos.length > 0
                            ? a.productos.map((p) => `${p.nombre} (${p.cantidad ?? '—'}${p.unidad}, ${p.dosisPorHa ?? '—'}/ha)`).join(' · ')
                            : '—'}
                        </td>
                        <td style={styles.tdRight}>${(a.costo_total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {actividadesFiltradas.length > actividadesMostradas.length && (
                  <p style={{ ...styles.mutedText, marginTop: 8 }}>
                    Mostrando {actividadesMostradas.length} de {actividadesFiltradas.length}. Afiná los filtros para ver el resto.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const cssBase = `
  .dv2-leaflet-loading { display:flex; }
  .leaflet-control-attribution { background: rgba(18,32,26,0.75) !important; color: #9FB3A6 !important; }
  .leaflet-control-attribution a { color: #C7D8CC !important; }
  .leaflet-control-zoom a { background: #1A2B22 !important; color: #EAF3EC !important; border-color: #2A3D31 !important; }
  .leaflet-control-zoom a:hover { background: #22362A !important; }
  .leaflet-tooltip { background: #1A2B22 !important; color: #EAF3EC !important; border: 1px solid #2A3D31 !important; }
  .dv2-map .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9); }
`

// Paleta dark
const BG = '#0F1712'
const SURFACE = '#16241C'
const BORDER = '#2A3D31'
const TEXT = '#EAF3EC'
const TEXT_MUTED = '#9FB3A6'
const ACCENT = '#6FCF97'

const styles = {
  page: { padding: 32, maxWidth: '100%', fontFamily: 'system-ui, sans-serif', background: BG, minHeight: '100%', color: TEXT },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  h2: { fontSize: 28, fontWeight: 700, color: ACCENT, margin: 0 },
  h3: { fontSize: 18, fontWeight: 700, color: ACCENT, margin: 0 },
  selectorFinca: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 },
  label: { fontSize: 12, fontWeight: 700, color: TEXT_MUTED },
  select: { padding: '8px 10px', border: `2px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: SURFACE, color: TEXT },
  alertaAmarilla: { background: '#332B0A', border: '2px solid #FDD835', color: '#FDD835', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600 },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  card: { background: SURFACE, border: `2px solid ${BORDER}`, borderRadius: 10, padding: 18 },
  cardLabel: { fontSize: 13, fontWeight: 700, color: TEXT_MUTED, margin: 0 },
  cardValue: { fontSize: 30, fontWeight: 700, color: TEXT, margin: '4px 0 0' },
  mapRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: 16, marginBottom: 24 },
  mapRowExpandido: { display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 },
  mapCard: { background: SURFACE, border: `2px solid ${BORDER}`, borderRadius: 10, padding: 18 },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  botonExpandir: { padding: '6px 12px', background: BORDER, color: TEXT, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  botonChicoSecundario: { padding: '6px 12px', background: BORDER, color: TEXT, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  filtrosRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  filtroPill: { padding: '6px 14px', background: BORDER, color: TEXT, border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  filtroPillActivo: { padding: '6px 14px', background: ACCENT, color: '#0F1712', border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  leyenda: { fontSize: 12, color: TEXT_MUTED, display: 'flex', alignItems: 'center', marginBottom: 12 },
  leyendaDot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 4 },
  mapWrapper: { position: 'relative', width: '100%', height: 420, borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}` },
  mapWrapperExpandido: { position: 'relative', width: '100%', height: 640, borderRadius: 8, overflow: 'hidden', border: `1px solid ${BORDER}` },
  mapContainer: { width: '100%', height: '100%', background: BG },
  mapOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,18,0.92)', color: TEXT_MUTED, fontWeight: 600, textAlign: 'center', padding: 16 },
  detailCard: { background: SURFACE, border: `2px solid ${BORDER}`, borderRadius: 10, padding: 18 },
  mutedText: { color: TEXT_MUTED, fontSize: 14 },
  detailNombre: { fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 12px' },
  detailFila: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` },
  detailKey: { fontSize: 13, color: TEXT_MUTED, fontWeight: 600 },
  detailVal: { fontSize: 13, color: TEXT, fontWeight: 700 },
  badge: { color: '#0F1712', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize' },
  actividadFila: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  actividadBloque: { padding: '8px 0', borderBottom: `1px solid ${BORDER}` },
  productosLista: { marginTop: 4, paddingLeft: 10 },
  productoFila: { fontSize: 11, color: TEXT_MUTED, padding: '2px 0' },
  productoNota: { color: TEXT_MUTED, opacity: 0.85 },
  productoFilaVacio: { fontSize: 11, color: TEXT_MUTED, marginTop: 4, paddingLeft: 10, fontStyle: 'italic' },
  filtrosResumenRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' },
  selectChico: { padding: '6px 10px', border: `2px solid ${BORDER}`, borderRadius: 6, fontSize: 12, background: SURFACE, color: TEXT },
  totalesFiltroRow: { display: 'flex', gap: 8, fontSize: 12, color: TEXT_MUTED, marginTop: 10, fontWeight: 600 },
  tablaWrapper: { overflowX: 'auto', marginTop: 8 },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', color: TEXT_MUTED, fontSize: 12, borderBottom: `2px solid ${BORDER}`, whiteSpace: 'nowrap' },
  thRight: { textAlign: 'right', padding: '8px 10px', color: TEXT_MUTED, fontSize: 12, borderBottom: `2px solid ${BORDER}`, whiteSpace: 'nowrap' },
  td: { padding: '8px 10px', color: TEXT, borderBottom: `1px solid ${BORDER}` },
  tdRight: { padding: '8px 10px', color: TEXT, borderBottom: `1px solid ${BORDER}`, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' },
  chartCard: { background: SURFACE, border: `2px solid ${BORDER}`, borderRadius: 10, padding: 18 },
  chartSvg: { width: '100%', height: 180, marginTop: 8 },
}
