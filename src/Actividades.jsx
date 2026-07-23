import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Plus, Trash2 } from 'lucide-react'

export default function Actividades() {
  const [lotes, setLotes] = useState([])
  const [lotesSeleccionados, setLotesSeleccionados] = useState([])
  const [tipoActividad, setTipoActividad] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    traerLotes()
  }, [])

  const traerLotes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('api_lote')
        .select('*')
      
      if (error) throw error
      setLotes(data || [])
    } catch (err) {
      console.error('Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleLote = (loteId) => {
    setLotesSeleccionados(prev =>
      prev.includes(loteId)
        ? prev.filter(id => id !== loteId)
        : [...prev, loteId]
    )
  }

  const hectareasTotales = lotesSeleccionados.reduce((sum, loteId) => {
    const lote = lotes.find(l => l.id === loteId)
    return sum + (lote?.superficie || 0)
  }, 0)

  const guardarActividad = async () => {
    if (lotesSeleccionados.length === 0 || !tipoActividad) {
      alert('Selecciona al menos un lote y tipo de actividad')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('api_actividad')
        .insert({
          tipo_id: tipoActividad,
          fecha,
          responsable: user?.email || 'Usuario',
          observaciones: ''
        })
        .select()

      if (error) throw error

      alert('Actividad guardada!')
      setTipoActividad('')
      setLotesSeleccionados([])
      setFecha(new Date().toISOString().slice(0, 10))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) return <div className="p-8">Cargando lotes...</div>

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-[#1F3D2B] mb-6">Registrar Actividad</h2>

      <div className="bg-white rounded-lg border-2 border-[#1F3D2B] p-6 mb-6">
        <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Lotes</label>
        <div className="space-y-2">
          {lotes.map(lote => (
            <div key={lote.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`lote-${lote.id}`}
                checked={lotesSeleccionados.includes(lote.id)}
                onChange={() => toggleLote(lote.id)}
                className="w-4 h-4"
              />
              <label htmlFor={`lote-${lote.id}`} className="text-sm">
                {lote.nombre} ({lote.superficie}ha)
              </label>
            </div>
          ))}
        </div>
        {hectareasTotales > 0 && (
          <p className="mt-3 text-sm font-bold text-[#1F3D2B]">
            Total: {hectareasTotales}ha
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border-2 border-[#1F3D2B] p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Tipo de Actividad</label>
          <input
            type="text"
            value={tipoActividad}
            onChange={(e) => setTipoActividad(e.target.value)}
            placeholder="Ej: Fumigación, Riego"
            className="w-full px-4 py-2 border-2 border-[#D8D2BE] rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-4 py-2 border-2 border-[#D8D2BE] rounded"
          />
        </div>
      </div>

      <button
        onClick={guardarActividad}
        className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg hover:bg-[#0F2116]"
      >
        Guardar Actividad
      </button>
    </div>
  )
}