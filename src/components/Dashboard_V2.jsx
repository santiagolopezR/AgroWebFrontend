import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// URL del backend se toma de una variable de entorno (VITE_API_URL).
// El valor por defecto es la URL pública del backend, no un secreto.
const API_BASE = (import.meta.env.VITE_API_URL || 'https://agroweb-vv4b.onrender.com/api').replace(/\/$/, '')

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

const COLOR_VERDE = '#2E7D32'
const COLOR_AMARILLO = '#F9A825'
const COLOR_GRIS = '#9E9E9E'

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

  const [lotesGeo, setLotesGeo] = useState([])
  const [totalActividades6m, setTotalActividades6m] = useState(0)
  const [actividadesPorMes, setActividadesPorMes] = useState([])

  const [selectedLote, setSelectedLote] = useState(null)

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

  // ---------- Lotes + geometría + actividades por finca ----------
  useEffect(() => {
    if (!user || !fincaId) return

    let cancelado = false

    const fetchTodo = async () => {
      setCargandoDatos(true)
      setDataError('')
      setSelectedLote(null)

      try {
        const [{ data: lotesData, error: lotesErr }, { data: relData, error: relErr }] = await Promise.all([
          supabase.from('api_lote').select('*').eq('finca_id', parseInt(fincaId, 10)),
          supabase
            .from('api_actividad_lote')
            .select('lote_id, api_actividad(fecha)')
            .eq('user_id', user),
        ])

        if (lotesErr) throw lotesErr
        if (relErr) throw relErr

        // Última fecha de actividad conocida por lote (para estimar estado si falta el campo)
        const ultimaActividadPorLote = {}
        for (const rel of relData || []) {
          const fecha = rel.api_actividad?.fecha
          if (!fecha) continue
          const actual = ultimaActividadPorLote[rel.lote_id]
          if (!actual || fecha > actual) ultimaActividadPorLote[rel.lote_id] = fecha
        }

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

          return {
            ...lote,
            estado,
            poligono,
            punto,
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
  }, [user, fincaId])

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
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
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
        const color = colorPorEstado(lote.estado)
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
  }, [lotesGeo, handleSelectLote, leafletReady])

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

  return (
    <div style={styles.page}>
      <style>{cssBase}</style>

      <div style={styles.headerRow}>
        <h2 style={styles.h2}>🌍 Dashboard V2.0</h2>

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
      <div style={styles.mapRow}>
        <div style={styles.mapCard}>
          <div style={styles.mapHeader}>
            <h3 style={styles.h3}>🗺️ Mapa de Lotes</h3>
            <div style={styles.leyenda}>
              <span style={{ ...styles.leyendaDot, background: COLOR_VERDE }} /> Activo
              <span style={{ ...styles.leyendaDot, background: COLOR_AMARILLO, marginLeft: 12 }} /> En proceso
              <span style={{ ...styles.leyendaDot, background: COLOR_GRIS, marginLeft: 12 }} /> Sin datos
            </div>
          </div>

          <div style={styles.mapWrapper}>
            <div ref={mapContainerRef} style={styles.mapContainer} />
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
                  <rect x={x} y={y} width={barW} height={h} fill="#1F3D2B" rx={3} />
                  <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#1F3D2B" fontWeight="bold">
                    {b.total}
                  </text>
                  <text x={x + barW / 2} y={138} textAnchor="middle" fontSize="11" fill="#6B5D45">
                    {b.label}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

const cssBase = `
  .dv2-leaflet-loading { display:flex; }
`

const styles = {
  page: { padding: 32, maxWidth: '100%', fontFamily: 'system-ui, sans-serif' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  h2: { fontSize: 28, fontWeight: 700, color: '#1F3D2B', margin: 0 },
  h3: { fontSize: 18, fontWeight: 700, color: '#1F3D2B', margin: 0 },
  selectorFinca: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 },
  label: { fontSize: 12, fontWeight: 700, color: '#1F3D2B' },
  select: { padding: '8px 10px', border: '2px solid #D8D2BE', borderRadius: 6, fontSize: 14, background: '#fff' },
  alertaAmarilla: { background: '#FFF8E1', border: '2px solid #F9A825', color: '#7A5B00', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600 },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 },
  card: { background: '#fff', border: '2px solid #D8D2BE', borderRadius: 10, padding: 18 },
  cardLabel: { fontSize: 13, fontWeight: 700, color: '#6B5D45', margin: 0 },
  cardValue: { fontSize: 30, fontWeight: 700, color: '#1F3D2B', margin: '4px 0 0' },
  mapRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', gap: 16, marginBottom: 24 },
  mapCard: { background: '#fff', border: '2px solid #D8D2BE', borderRadius: 10, padding: 18 },
  mapHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  leyenda: { fontSize: 12, color: '#6B5D45', display: 'flex', alignItems: 'center' },
  leyendaDot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 4 },
  mapWrapper: { position: 'relative', width: '100%', height: 420, borderRadius: 8, overflow: 'hidden', border: '1px solid #D8D2BE' },
  mapContainer: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,242,230,0.9)', color: '#6B5D45', fontWeight: 600, textAlign: 'center', padding: 16 },
  detailCard: { background: '#fff', border: '2px solid #D8D2BE', borderRadius: 10, padding: 18 },
  mutedText: { color: '#6B5D45', fontSize: 14 },
  detailNombre: { fontSize: 18, fontWeight: 700, color: '#1F3D2B', margin: '0 0 12px' },
  detailFila: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0EDE0' },
  detailKey: { fontSize: 13, color: '#6B5D45', fontWeight: 600 },
  detailVal: { fontSize: 13, color: '#1F3D2B', fontWeight: 700 },
  badge: { color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize' },
  chartCard: { background: '#fff', border: '2px solid #D8D2BE', borderRadius: 10, padding: 18 },
  chartSvg: { width: '100%', height: 180, marginTop: 8 },
}
