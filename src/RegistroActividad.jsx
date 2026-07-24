import { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { supabase } from './supabaseClient'

let uid = 0
const nextId = () => `p-${++uid}`

function nuevaFila() {
  return {
    id: nextId(),
    producto_id: '',
    producto: '',
    dosisLiterPorHa: '',
    dosisTotal: '',
    precio_unitario: '',
    total: '',
  }
}

export default function RegistroActividad() {
  const [lotes, setLotes] = useState([])
  const [tiposActividad, setTiposActividad] = useState([])
  const [productos, setProductos] = useState([])
  const [lotesSeleccionados, setLotesSeleccionados] = useState([])
  const [buscarLotes, setBuscarLotes] = useState('')
  const [tipoActividad, setTipoActividad] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [responsable, setResponsable] = useState('Operario')
  const [observaciones, setObservaciones] = useState('')
  const [filas, setFilas] = useState([nuevaFila()])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    traerDatos()
  }, [])

  const traerDatos = async () => {
    try {
      const { data: lotesData } = await supabase.from('api_lote').select('*')
      const { data: tiposData } = await supabase.from('api_tipoactividad').select('*')
      const { data: productosData } = await supabase.from('api_producto').select('*')
      
      setLotes(lotesData || [])
      setTiposActividad(tiposData || [])
      setProductos(productosData || [])
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const lotesFiltrados = lotes.filter(l =>
    l.nombre.toLowerCase().includes(buscarLotes.toLowerCase())
  )

  const toggleLote = (loteId) => {
    setLotesSeleccionados(prev =>
      prev.includes(loteId) ? prev.filter(id => id !== loteId) : [...prev, loteId]
    )
  }

  const hectareasTotales = lotesSeleccionados.reduce((sum, loteId) => {
    const lote = lotes.find(l => l.id === loteId)
    return sum + (lote?.superficie || 0)
  }, 0)

  const actualizarFila = (id, campo, valor) => {
    setFilas(prev => prev.map(f => {
      if (f.id !== id) return f
      
      const fila = { ...f, [campo]: valor }
      
      if (campo === 'dosisLiterPorHa') {
        const dosis_ha = parseFloat(valor) || 0
        const ha = hectareasTotales || 1
        fila.dosisTotal = (dosis_ha * ha).toFixed(2)
      } else if (campo === 'dosisTotal') {
        const dosis_tot = parseFloat(valor) || 0
        const ha = hectareasTotales || 1
        fila.dosisLiterPorHa = ha > 0 ? (dosis_tot / ha).toFixed(2) : '0'
      }
      
      const dosis = parseFloat(fila.dosisTotal) || 0
      const precio = parseFloat(fila.precio_unitario) || 0
      fila.total = (dosis * precio).toFixed(2)
      
      return fila
    }))
  }

  const cambiarProducto = (id, productoId) => {
    const producto = productos.find(p => p.id === productoId)
    setFilas(prev => prev.map(f => {
      if (f.id !== id) return f
      
      const fila = {
        ...f,
        producto_id: productoId,
        producto: producto?.nombre || '',
        precio_unitario: producto?.precio_actual || 0
      }
      
      const dosis = parseFloat(fila.dosisTotal) || 0
      const precio = parseFloat(fila.precio_unitario) || 0
      fila.total = (dosis * precio).toFixed(2)
      
      return fila
    }))
  }

  const agregarFila = () => {
    setFilas(prev => [...prev, nuevaFila()])
  }

  const quitarFila = (id) => {
    setFilas(prev => prev.length > 1 ? prev.filter(f => f.id !== id) : prev)
  }

  const totalGeneral = filas.reduce((acc, f) => acc + (parseFloat(f.total) || 0), 0)

  const guardar = async () => {
    if (lotesSeleccionados.length === 0) {
      alert('Selecciona al menos un lote')
      return
    }
    if (!tipoActividad) {
      alert('Selecciona tipo de actividad')
      return
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: actividad, error: errorActividad } = await supabase
        .from('api_actividad')
        .insert({
          tipo_id: parseInt(tipoActividad),
          fecha,
          responsable,
          observaciones,
          user_id: user.id,
        })
        .select()

      if (errorActividad) throw errorActividad

      const actividadId = actividad[0].id

      const lotesData = lotesSeleccionados.map(loteId => ({
        actividad_id: actividadId,
        lote_id: loteId,
        hectareas: lotes.find(l => l.id === loteId)?.superficie || 0,
      }))

      const { error: errorLotes } = await supabase
        .from('api_actividad_lote')
        .insert(lotesData)

      if (errorLotes) throw errorLotes

      const productosData = filas
        .filter(f => f.producto_id)
        .map(f => {
          const cantidad = parseFloat(f.dosisTotal) || 0
          const precio = parseFloat(f.precio_unitario) || 0
          const total = cantidad * precio
          
          return {
            actividad_id: actividadId,
            producto_id: parseInt(f.producto_id),
            cantidad: cantidad,
            precio_unitario: precio,
            total: total,
          }
        })

      if (productosData.length > 0) {
        const { error: errorProductos } = await supabase
          .from('api_actividad_producto')
          .insert(productosData)

        if (errorProductos) throw errorProductos
      }

      alert('✓ Actividad guardada con todos los detalles')
      setFilas([nuevaFila()])
      setLotesSeleccionados([])
      setTipoActividad('')
      setObservaciones('')
      setFecha(new Date().toISOString().slice(0, 10))
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <div className="p-8">Cargando datos...</div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#1F3D2B] mb-2">Registrar Actividad</h2>
        <p className="text-[#6B5D45]">Fumigación, riego, siembra, etc.</p>
      </div>

      {/* LOTES */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">1️⃣ Selecciona Lotes</h3>
        
        <div className="mb-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-3 text-[#6B5D45]" />
            <input
              type="text"
              value={buscarLotes}
              onChange={(e) => setBuscarLotes(e.target.value)}
              placeholder="Buscar lote..."
              className="w-full pl-10 pr-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border-2 border-[#D8D2BE] rounded-lg p-4 space-y-2 mb-4">
          {lotesFiltrados.length === 0 ? (
            <p className="text-[#6B5D45]">No hay lotes</p>
          ) : (
            lotesFiltrados.map(lote => (
              <div key={lote.id} className="flex items-center gap-3 p-3 hover:bg-[#F5F2E6] rounded-lg border border-[#D8D2BE]">
                <input
                  type="checkbox"
                  id={`lote-${lote.id}`}
                  checked={lotesSeleccionados.includes(lote.id)}
                  onChange={() => toggleLote(lote.id)}
                  className="w-5 h-5 cursor-pointer"
                />
                <label htmlFor={`lote-${lote.id}`} className="cursor-pointer flex-1 text-lg">
                  <span className="font-bold">{lote.nombre}</span>
                  <span className="ml-3 text-[#6B5D45]">({lote.superficie} ha)</span>
                </label>
              </div>
            ))
          )}
        </div>

        {hectareasTotales > 0 && (
          <div className="bg-[#1F3D2B] text-white p-4 rounded-lg font-bold text-xl">
            📊 Total: {hectareasTotales} ha
          </div>
        )}
      </div>

      {/* CABECERA */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-6">2️⃣ Detalles de la Actividad</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Tipo de Actividad</label>
            <select
              value={tipoActividad}
              onChange={(e) => setTipoActividad(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg font-medium"
            >
              <option value="">Seleccionar tipo...</option>
              {tiposActividad.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Responsable</label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Observaciones</label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
          </div>
        </div>
      </div>

      {/* PRODUCTOS - Tabla */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-6">3️⃣ Productos Aplicados</h3>
        
        <div className="overflow-x-auto mb-6 border-2 border-[#D8D2BE] rounded-lg">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-[#1F3D2B] text-white">
                <th className="text-left py-4 px-4 font-bold">Producto</th>
                <th className="text-left py-4 px-4 font-bold">Dosis L/ha</th>
                <th className="text-left py-4 px-4 font-bold">Dosis Total (L)</th>
                <th className="text-left py-4 px-4 font-bold">Precio/U ($)</th>
                <th className="text-right py-4 px-4 font-bold">Total ($)</th>
                <th className="text-center py-4 px-4 font-bold">X</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.id} className="border-b-2 border-[#D8D2BE] hover:bg-[#FBF9F2]">
                  <td className="py-4 px-4">
                    <select
                      value={f.producto_id}
                      onChange={(e) => cambiarProducto(f.id, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border-2 border-[#D8D2BE] rounded text-base"
                    >
                      <option value="">Seleccionar...</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="number"
                      step="0.01"
                      value={f.dosisLiterPorHa}
                      onChange={(e) => actualizarFila(f.id, 'dosisLiterPorHa', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-[#D8D2BE] rounded text-base font-medium"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="number"
                      step="0.01"
                      value={f.dosisTotal}
                      onChange={(e) => actualizarFila(f.id, 'dosisTotal', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border-2 border-[#D8D2BE] rounded text-base font-bold bg-[#E8E6E0]"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="number"
                      value={f.precio_unitario}
                      readOnly
                      className="w-full px-3 py-2 border-2 border-[#D8D2BE] rounded text-base font-bold bg-[#E8E6E0]"
                    />
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-lg">
                    ${f.total}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => quitarFila(f.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={agregarFila}
          className="w-full border-4 border-dashed border-[#1F3D2B] py-4 text-[#1F3D2B] font-bold text-lg rounded-lg hover:bg-[#F5F2E6] mb-6"
        >
          <Plus size={20} className="inline mr-2" /> Agregar Producto
        </button>

        <div className="bg-[#1F3D2B] text-white p-8 rounded-lg text-right">
          <div className="text-lg opacity-90 mb-2">Costo Total de la Actividad</div>
          <div className="text-5xl font-bold">${totalGeneral.toFixed(2)}</div>
        </div>
      </div>

      <button
        onClick={guardar}
        disabled={guardando || !tipoActividad || lotesSeleccionados.length === 0}
        className="w-full bg-[#1F3D2B] text-white font-bold text-lg py-4 rounded-lg hover:bg-[#0F2116] disabled:opacity-50 transition"
      >
        {guardando ? '⏳ Guardando...' : '✓ Guardar Actividad Completa'}
      </button>
    </div>
  )
}