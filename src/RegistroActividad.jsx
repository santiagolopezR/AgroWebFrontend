import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from './supabaseClient'

let uid = 0
const nextId = () => `p-${++uid}`

function nuevaFila() {
  return {
    id: nextId(),
    producto_id: '',
    producto: '',
    cantidad: '',
    dosisLiterPorHa: '',
    dosisTotal: '',
    precio_unitario: '',
    total: '',
  }
}

export default function RegistroActividad() {
  const [lotes, setLotes] = useState([])
  const [productos, setProductos] = useState([])
  const [lotesSeleccionados, setLotesSeleccionados] = useState([])
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
      const { data: productosData } = await supabase.from('api_producto').select('*')
      setLotes(lotesData || [])
      setProductos(productosData || [])
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

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
      
      // Si cambió cantidad o dosis/ha, calcular dosisTotal
      if (campo === 'cantidad' || campo === 'dosisLiterPorHa') {
        const cant = parseFloat(fila.cantidad) || 0
        const dosis = parseFloat(fila.dosisLiterPorHa) || 0
        fila.dosisTotal = (cant * dosis).toFixed(2)
      }
      
      // Si cambió dosisTotal o precio, calcular total
      if (campo === 'dosisTotal' || campo === 'precio_unitario') {
        const dosis = parseFloat(fila.dosisTotal) || 0
        const precio = parseFloat(fila.precio_unitario) || 0
        fila.total = (dosis * precio).toFixed(2)
      }
      
      return fila
    }))
  }

  const cambiarProducto = (id, productoId) => {
    const producto = productos.find(p => p.id === productoId)
    setFilas(prev => prev.map(f =>
      f.id === id 
        ? { 
            ...f, 
            producto_id: productoId, 
            producto: producto?.nombre || '',
            precio_unitario: producto?.precio_actual || ''
          }
        : f
    ))
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
      alert('Ingresa tipo de actividad')
      return
    }

    setGuardando(true)
    try {
      const { data: actividad, error } = await supabase
        .from('api_actividad')
        .insert({
          tipo_id: 1,
          fecha,
          responsable,
          observaciones,
        })
        .select()

      if (error) throw error

      alert('✓ Actividad guardada')
      setFilas([nuevaFila()])
      setLotesSeleccionados([])
      setTipoActividad('')
      setObservaciones('')
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando datos...</div>

  return (
    <div className="p-8 max-w-5xl">
      {/* HEADER */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#1F3D2B] mb-2">Registrar Actividad</h2>
        <p className="text-[#6B5D45]">Fumigación, riego, siembra, etc.</p>
      </div>

      {/* LOTES */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">1️⃣ Selecciona Lotes</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {lotes.map(lote => (
            <div key={lote.id} className="flex items-center gap-3 p-3 border-2 border-[#D8D2BE] rounded-lg hover:bg-[#F5F2E6]">
              <input
                type="checkbox"
                id={`lote-${lote.id}`}
                checked={lotesSeleccionados.includes(lote.id)}
                onChange={() => toggleLote(lote.id)}
                className="w-5 h-5 cursor-pointer"
              />
              <label htmlFor={`lote-${lote.id}`} className="cursor-pointer font-medium">
                {lote.nombre} • {lote.superficie}ha
              </label>
            </div>
          ))}
        </div>
        {hectareasTotales > 0 && (
          <div className="bg-[#1F3D2B] text-white p-4 rounded-lg font-bold text-lg">
            📊 Total: {hectareasTotales}ha
          </div>
        )}
      </div>

      {/* CABECERA */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-6">2️⃣ Detalles de la Actividad</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Tipo de Actividad</label>
            <input
              type="text"
              value={tipoActividad}
              onChange={(e) => setTipoActividad(e.target.value)}
              placeholder="Fumigación, Riego, Siembra..."
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
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
              placeholder="Nombre del operario"
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Observaciones</label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales"
              className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
            />
          </div>
        </div>
      </div>

      {/* PRODUCTOS */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-6">3️⃣ Productos Aplicados</h3>
        
        {/* Encabezados */}
        <div className="grid grid-cols-12 gap-4 mb-4 font-bold text-[#1F3D2B] text-sm uppercase">
          <div className="col-span-4">Producto</div>
          <div className="col-span-2">Cantidad (L)</div>
          <div className="col-span-2">Dosis L/ha</div>
          <div className="col-span-2">Dosis Total</div>
          <div className="col-span-2">Total</div>
        </div>

        {/* Filas */}
        <div className="space-y-4 mb-6">
          {filas.map((f, i) => (
            <div key={f.id} className="border-2 border-[#D8D2BE] p-4 rounded-lg bg-[#FBF9F2]">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Producto */}
                <select
                  value={f.producto_id}
                  onChange={(e) => cambiarProducto(f.id, parseInt(e.target.value))}
                  className="col-span-4 px-3 py-3 border-2 border-[#D8D2BE] rounded text-base"
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>

                {/* Cantidad */}
                <input
                  type="number"
                  step="0.1"
                  value={f.cantidad}
                  onChange={(e) => actualizarFila(f.id, 'cantidad', e.target.value)}
                  placeholder="0"
                  className="col-span-2 px-3 py-3 border-2 border-[#D8D2BE] rounded text-base"
                />

                {/* Dosis L/ha */}
                <input
                  type="number"
                  step="0.1"
                  value={f.dosisLiterPorHa}
                  onChange={(e) => actualizarFila(f.id, 'dosisLiterPorHa', e.target.value)}
                  placeholder="0"
                  className="col-span-2 px-3 py-3 border-2 border-[#D8D2BE] rounded text-base"
                />

                {/* Dosis Total */}
                <input
                  type="number"
                  value={f.dosisTotal}
                  readOnly
                  className="col-span-2 px-3 py-3 border-2 border-[#D8D2BE] rounded text-base bg-[#E8E6E0] font-bold"
                />

                {/* Total */}
                <div className="col-span-2 flex justify-between items-center">
                  <span className="font-bold text-lg">${f.total}</span>
                  <button
                    onClick={() => quitarFila(f.id)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agregar producto */}
        <button
          onClick={agregarFila}
          className="w-full border-4 border-dashed border-[#1F3D2B] py-4 text-[#1F3D2B] font-bold text-lg rounded-lg hover:bg-[#F5F2E6] transition"
        >
          <Plus size={20} className="inline mr-2" /> Agregar Producto
        </button>

        {/* Total General */}
        <div className="mt-8 bg-[#1F3D2B] text-white p-6 rounded-lg text-right">
          <div className="text-sm opacity-90">Costo Total</div>
          <div className="text-4xl font-bold">${totalGeneral.toFixed(2)}</div>
        </div>
      </div>

      {/* BOTÓN GUARDAR */}
      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-[#1F3D2B] text-white font-bold text-lg py-4 rounded-lg hover:bg-[#0F2116] disabled:opacity-50 transition"
      >
        {guardando ? '⏳ Guardando...' : '✓ Guardar Actividad'}
      </button>
    </div>
  )
}