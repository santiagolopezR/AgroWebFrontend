import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function RegistroActividad() {
  const [user, setUser] = useState(null)
  const [lotes, setLotes] = useState([])
  const [maquinarias, setMaquinarias] = useState([])
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [tiposActividad, setTiposActividad] = useState([])
  
  const [loteId, setLoteId] = useState('')
  const [fecha, setFecha] = useState('')
  const [zafraId, setZafraId] = useState('')
  const [zafrasDisponibles, setZafrasDisponibles] = useState([])
  const [tipoActividad, setTipoActividad] = useState('siembra')
  
  // Siembra
  const [siebraSemilla, setSiebraSemilla] = useState('')
  const [siebraDistancia, setSiebraDistancia] = useState('')
  const [siebraProfundidad, setSiebraProfundidad] = useState('')
  const [siebraProductos, setSiebraProductos] = useState([])
  const [siebraMO, setSiebraMO] = useState('')
  const [siebraMaquinaria, setSiebraMaquinaria] = useState('')
  const [siebraObservaciones, setSiebraObservaciones] = useState('')
  
  // Cosecha
  const [cosechaRendimiento, setCosechaRendimiento] = useState('')
  const [cosechaPrecio, setCosechaPrecio] = useState('')
  const [cosechaTransporte, setCosechaTransporte] = useState('')
  const [cosechaMO, setCosechaMO] = useState('')
  const [cosechaMaquinaria, setCosechaMaquinaria] = useState('')
  const [cosechaObservaciones, setCosechaObservaciones] = useState('')
  
  // Genérico
  const [genericoProductos, setGenericoProductos] = useState([])
  const [genericoMaquinaria, setGenericoMaquinaria] = useState('')
  const [genericoCombustible, setGenericoCombustible] = useState('')
  const [genericoMO, setGenericoMO] = useState('')
  const [genericoCostos, setGenericoCostos] = useState([])
  const [genericoObservaciones, setGenericoObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user?.id)
  }

  useEffect(() => {
    if (user) {
      fetchLotes()
      fetchMaquinarias()
      fetchProductos()
      fetchCategorias()
      fetchTiposActividad()
    }
  }, [user])

  const fetchLotes = async () => {
    const { data } = await supabase.from('api_lote').select('*').eq('user_id', user)
    setLotes(data || [])
  }

  const fetchMaquinarias = async () => {
    const { data } = await supabase.from('api_maquinaria').select('*').eq('user_id', user)
    setMaquinarias(data || [])
  }

  const fetchProductos = async () => {
    const { data } = await supabase.from('api_producto').select('*').eq('user_id', user)
    setProductos(data || [])
  }

  const fetchCategorias = async () => {
    const { data } = await supabase.from('api_categoria').select('*')
    const unique = []
    const nombres = new Set()
    data?.forEach(cat => {
      const nombre = cat.nombre.trim()
      if (!nombres.has(nombre)) {
        nombres.add(nombre)
        unique.push(cat)
      }
    })
    setCategorias(unique)
  }

  const fetchTiposActividad = async () => {
    const { data } = await supabase.from('api_tipoactividad').select('*')
    setTiposActividad(data || [])
  }

  const getTipoActividadId = (nombre) => {
    const tipo = tiposActividad.find(t => t.nombre.toLowerCase() === nombre.toLowerCase())
    return tipo?.id || null
  }

  const handleLoteChange = (newLoteId) => {
    setLoteId(newLoteId)
    setZafraId('')
    setZafrasDisponibles([])
  }

  const handleFechaChange = async (newFecha) => {
    setFecha(newFecha)
    if (loteId && newFecha) {
      await buscarZafras(loteId, newFecha)
    }
  }

  const buscarZafras = async (lotId, fch) => {
    const { data } = await supabase
      .from('api_zafra')
      .select('*')
      .eq('lote_id', lotId)
      .lte('fecha_inicio', fch)
      .or(`fecha_fin.is.null,fecha_fin.gte.${fch}`)
      .order('fecha_inicio', { ascending: false })
      .limit(4)

    if (data && data.length > 0) {
      setZafrasDisponibles(data)
      setZafraId(data[0].id)
    } else {
      setZafrasDisponibles([])
      setZafraId('')
    }
  }

  const addProductoGenerico = () => {
    setGenericoProductos([...genericoProductos, { id: Date.now(), productoId: '', cantidad: '', dosis: '' }])
  }

  const removeProductoGenerico = (id) => {
    setGenericoProductos(genericoProductos.filter(p => p.id !== id))
  }

  const updateProductoGenerico = (id, field, value) => {
    setGenericoProductos(genericoProductos.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const addCostoGenerico = () => {
    setGenericoCostos([...genericoCostos, { id: Date.now(), descripcion: '', cantidad: '', valor: '' }])
  }

  const removeCostoGenerico = (id) => {
    setGenericoCostos(genericoCostos.filter(c => c.id !== id))
  }

  const updateCostoGenerico = (id, field, value) => {
    setGenericoCostos(genericoCostos.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!loteId || !fecha || !zafraId) {
      alert('Completa Lote, Fecha y Zafra')
      return
    }

    setLoading(true)

    try {
      let totalMO = 0
      let totalMaquina = 0
      let totalCombustible = 0
      let totalCostos = 0
      let tipoActividadId = null
      let observaciones = ''
      let tipoMaquina = ''
      let cantidadCombustible = 0
      let horasMaquina = 0

      if (tipoActividad === 'siembra') {
        tipoActividadId = getTipoActividadId('Siembra')
        totalMO = parseFloat(siebraMO || 0) * 50000 // Asume $50k por jornal
        tipoMaquina = siebraMaquinaria ? 'Tractor' : ''
        horasMaquina = siebraMaquinaria ? 2 : 0
        totalMaquina = horasMaquina * 80000 // Asume $80k por hora
        observaciones = `Semilla: ${siebraSemilla}, Distancia: ${siebraDistancia}cm, Profundidad: ${siebraProfundidad}cm. ${siebraObservaciones}`
      } else if (tipoActividad === 'cosecha') {
        tipoActividadId = getTipoActividadId('Cosecha')
        totalMO = parseFloat(cosechaMO || 0) * 50000
        tipoMaquina = cosechaMaquinaria ? 'Cosechadora' : ''
        horasMaquina = cosechaMaquinaria ? 3 : 0
        totalMaquina = horasMaquina * 120000
        observaciones = `Rendimiento: ${cosechaRendimiento}kg, Precio: $${cosechaPrecio}/kg, Transporte: ${cosechaTransporte}km. ${cosechaObservaciones}`
      } else {
        // Genérico: Fumigación, Fertilización, Riego, Arar, Desmalezar, Otro
        const mapeoTipos = {
          'fumigacion': 'Fumigación',
          'fertilizacion': 'Fertilización',
          'riego': 'Riego',
          'arar': 'Arar',
          'desmalezar': 'Desmalezar',
          'otro': 'Otro'
        }
        tipoActividadId = getTipoActividadId(mapeoTipos[tipoActividad])
        totalMO = parseFloat(genericoMO || 0) * 50000
        cantidadCombustible = parseFloat(genericoCombustible || 0)
        totalCombustible = cantidadCombustible * 8000 // Asume $8k por litro
        totalCostos = genericoCostos.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0)
        tipoMaquina = genericoMaquinaria ? 'Pulverizador' : ''
        observaciones = genericoObservaciones
      }

      const costo_total = totalMO + totalMaquina + totalCombustible + totalCostos

      const { data: actividad, error: errorActividad } = await supabase
        .from('api_actividad')
        .insert([{
          fecha: fecha,
          responsable: 'Usuario',
          observaciones: observaciones,
          tipo_id: tipoActividadId,
          user_id: user,
          zafra_id: parseInt(zafraId),
          horas_trabajo: tipoActividad === 'siembra' ? 8 : tipoActividad === 'cosecha' ? 12 : 6,
          valor_jornal: 50000,
          total_mano_obra: totalMO,
          tipo_maquina: tipoMaquina,
          horas_maquina: horasMaquina,
          valor_hora_maquina: tipoMaquina ? 80000 : 0,
          total_maquina: totalMaquina,
          tipo_combustible: 'Diesel',
          cantidad_combustible: cantidadCombustible,
          precio_combustible: cantidadCombustible > 0 ? 8000 : 0,
          total_combustible: totalCombustible,
          costos_adicionales: totalCostos,
          costo_total: costo_total
        }])
        .select()

      if (errorActividad) {
        alert('Error: ' + errorActividad.message)
        setLoading(false)
        return
      }

      const actividadId = actividad[0].id

      // Guardar productos según tipo
      if (tipoActividad === 'siembra' && siebraProductos.length > 0) {
        const productosInsert = siebraProductos.map(p => ({
          actividad_id: actividadId,
          producto_id: parseInt(p.productoId),
          cantidad: parseFloat(p.cantidad)
        }))
        await supabase.from('api_actividad_producto').insert(productosInsert)
      } else if (['fumigacion', 'fertilizacion', 'riego', 'arar', 'desmalezar', 'otro'].includes(tipoActividad) && genericoProductos.length > 0) {
        const productosInsert = genericoProductos.map(p => ({
          actividad_id: actividadId,
          producto_id: parseInt(p.productoId),
          cantidad: parseFloat(p.cantidad)
        }))
        await supabase.from('api_actividad_producto').insert(productosInsert)
      }

      alert('✅ Actividad registrada exitosamente')
      
      // Limpiar formulario
      setLoteId('')
      setFecha('')
      setZafraId('')
      setSiebraSemilla('')
      setSiebraDistancia('')
      setSiebraProfundidad('')
      setSiebraProductos([])
      setSiebraMO('')
      setSiebraMaquinaria('')
      setSiebraObservaciones('')
      setCosechaRendimiento('')
      setCosechaPrecio('')
      setCosechaTransporte('')
      setCosechaMO('')
      setCosechaMaquinaria('')
      setCosechaObservaciones('')
      setGenericoProductos([])
      setGenericoMaquinaria('')
      setGenericoCombustible('')
      setGenericoMO('')
      setGenericoCostos([])
      setGenericoObservaciones('')

    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">📝 Registrar Actividad</h2>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ENCABEZADO - LOTE + FECHA + ZAFRA */}
        <div className="bg-white p-4 rounded-lg border-4 border-[#1F3D2B]">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Lote *</label>
              <select value={loteId} onChange={(e) => handleLoteChange(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="">Selecciona</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.superficie} ha)</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => handleFechaChange(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required />
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Zafra *</label>
              <select value={zafraId} onChange={(e) => setZafraId(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="">Selecciona</option>
                {zafrasDisponibles.map(z => <option key={z.id} value={z.id}>Zafra {z.numero_zafra} ({z.estado})</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Tipo Actividad *</label>
              <select value={tipoActividad} onChange={(e) => setTipoActividad(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="siembra">🌱 Siembra</option>
                <option value="cosecha">🌾 Cosecha</option>
                <option value="fumigacion">💨 Fumigación</option>
                <option value="fertilizacion">🥗 Fertilización</option>
                <option value="riego">💧 Riego</option>
                <option value="arar">🚜 Arar</option>
                <option value="desmalezar">🌿 Desmalezar</option>
                <option value="otro">📋 Otro</option>
              </select>
            </div>
          </div>
        </div>

        {/* SIEMBRA */}
        {tipoActividad === 'siembra' && (
          <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] space-y-4">
            <h3 className="text-xl font-bold text-[#1F3D2B]">🌱 Formulario Siembra</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Semilla/Variedad</label>
                <input type="text" value={siebraSemilla} onChange={(e) => setSiebraSemilla(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Distancia Surcos (cm)</label>
                <input type="number" step="0.1" value={siebraDistancia} onChange={(e) => setSiebraDistancia(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Profundidad (cm)</label>
                <input type="number" step="0.1" value={siebraProfundidad} onChange={(e) => setSiebraProfundidad(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Mano de Obra (jornales)</label>
                <input type="number" step="0.1" value={siebraMO} onChange={(e) => setSiebraMO(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Maquinaria</label>
                <select value={siebraMaquinaria} onChange={(e) => setSiebraMaquinaria(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm">
                  <option value="">Sin maquinaria</option>
                  {maquinarias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Observaciones</label>
                <input type="text" value={siebraObservaciones} onChange={(e) => setSiebraObservaciones(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Productos (Semillas, Fertilizantes)</label>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F2E6]">
                    <th className="border p-2 text-left">Producto</th>
                    <th className="border p-2 text-center">Cantidad</th>
                    <th className="border p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {siebraProductos.map(p => (
                    <tr key={p.id} className="border">
                      <td className="border p-2">
                        <select value={p.productoId} onChange={(e) => setSiebraProductos(siebraProductos.map(x => x.id === p.id ? { ...x, productoId: e.target.value } : x))} className="w-full p-1 border rounded text-xs">
                          <option value="">Selecciona</option>
                          {productos.map(pr => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
                        </select>
                      </td>
                      <td className="border p-2">
                        <input type="number" step="0.01" value={p.cantidad} onChange={(e) => setSiebraProductos(siebraProductos.map(x => x.id === p.id ? { ...x, cantidad: e.target.value } : x))} className="w-full p-1 border rounded text-xs text-center" />
                      </td>
                      <td className="border p-2 text-center">
                        <button type="button" onClick={() => setSiebraProductos(siebraProductos.filter(x => x.id !== p.id))} className="text-red-600 font-bold">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setSiebraProductos([...siebraProductos, { id: Date.now(), productoId: '', cantidad: '' }])} className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">➕ Agregar Producto</button>
            </div>
          </div>
        )}

        {/* COSECHA */}
        {tipoActividad === 'cosecha' && (
          <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] space-y-4">
            <h3 className="text-xl font-bold text-[#1F3D2B]">🌾 Formulario Cosecha</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Rendimiento (kg)</label>
                <input type="number" step="0.01" value={cosechaRendimiento} onChange={(e) => setCosechaRendimiento(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Precio Venta ($/kg)</label>
                <input type="number" step="0.01" value={cosechaPrecio} onChange={(e) => setCosechaPrecio(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Transporte (km)</label>
                <input type="number" step="0.1" value={cosechaTransporte} onChange={(e) => setCosechaTransporte(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Mano de Obra (jornales)</label>
                <input type="number" step="0.1" value={cosechaMO} onChange={(e) => setCosechaMO(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Maquinaria</label>
                <select value={cosechaMaquinaria} onChange={(e) => setCosechaMaquinaria(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm">
                  <option value="">Sin maquinaria</option>
                  {maquinarias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Observaciones</label>
                <input type="text" value={cosechaObservaciones} onChange={(e) => setCosechaObservaciones(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
            </div>

            <div className="bg-[#F5F2E6] p-4 rounded border-2 border-[#1F3D2B]">
              <p className="text-sm"><strong>Ingresos Totales:</strong> ${(parseFloat(cosechaRendimiento || 0) * parseFloat(cosechaPrecio || 0)).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* GENÉRICO */}
        {['fumigacion', 'fertilizacion', 'riego', 'arar', 'desmalezar', 'otro'].includes(tipoActividad) && (
          <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] space-y-4">
            <h3 className="text-xl font-bold text-[#1F3D2B]">📋 Detalles Actividad</h3>
            
            <div>
              <label className="block text-sm font-bold mb-2">Productos</label>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F2E6]">
                    <th className="border p-2 text-left">Producto</th>
                    <th className="border p-2 text-center">Cantidad</th>
                    <th className="border p-2 text-center">Dosis/ha</th>
                    <th className="border p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {genericoProductos.map(p => (
                    <tr key={p.id} className="border">
                      <td className="border p-2">
                        <select value={p.productoId} onChange={(e) => updateProductoGenerico(p.id, 'productoId', e.target.value)} className="w-full p-1 border rounded text-xs">
                          <option value="">Selecciona</option>
                          {productos.map(pr => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
                        </select>
                      </td>
                      <td className="border p-2">
                        <input type="number" step="0.01" value={p.cantidad} onChange={(e) => updateProductoGenerico(p.id, 'cantidad', e.target.value)} className="w-full p-1 border rounded text-xs text-center" />
                      </td>
                      <td className="border p-2">
                        <input type="text" value={p.dosis} onChange={(e) => updateProductoGenerico(p.id, 'dosis', e.target.value)} className="w-full p-1 border rounded text-xs text-center" placeholder="L/ha" />
                      </td>
                      <td className="border p-2 text-center">
                        <button type="button" onClick={() => removeProductoGenerico(p.id)} className="text-red-600 font-bold">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addProductoGenerico} className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">➕ Agregar Producto</button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Maquinaria</label>
                <select value={genericoMaquinaria} onChange={(e) => setGenericoMaquinaria(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm">
                  <option value="">Sin maquinaria</option>
                  {maquinarias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Combustible (L)</label>
                <input type="number" step="0.1" value={genericoCombustible} onChange={(e) => setGenericoCombustible(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Mano de Obra (jornales)</label>
                <input type="number" step="0.1" value={genericoMO} onChange={(e) => setGenericoMO(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Observaciones</label>
              <textarea value={genericoObservaciones} onChange={(e) => setGenericoObservaciones(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" rows="2"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Costos Adicionales</label>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F2E6]">
                    <th className="border p-2 text-left">Descripción</th>
                    <th className="border p-2 text-center">Cantidad</th>
                    <th className="border p-2 text-center">Valor</th>
                    <th className="border p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {genericoCostos.map(c => (
                    <tr key={c.id} className="border">
                      <td className="border p-2">
                        <input type="text" value={c.descripcion} onChange={(e) => updateCostoGenerico(c.id, 'descripcion', e.target.value)} className="w-full p-1 border rounded text-xs" />
                      </td>
                      <td className="border p-2">
                        <input type="number" step="0.01" value={c.cantidad} onChange={(e) => updateCostoGenerico(c.id, 'cantidad', e.target.value)} className="w-full p-1 border rounded text-xs text-center" />
                      </td>
                      <td className="border p-2">
                        <input type="number" step="0.01" value={c.valor} onChange={(e) => updateCostoGenerico(c.id, 'valor', e.target.value)} className="w-full p-1 border rounded text-xs text-center" />
                      </td>
                      <td className="border p-2 text-center">
                        <button type="button" onClick={() => removeCostoGenerico(c.id)} className="text-red-600 font-bold">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addCostoGenerico} className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">➕ Agregar Costo</button>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg text-lg hover:bg-[#0F2116] disabled:bg-gray-400">
          {loading ? '⏳ Guardando...' : '✅ Guardar Actividad'}
        </button>
      </form>
    </div>
  )
}