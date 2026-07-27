import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Zafras() {
  const [fincas, setFincas] = useState([])
  const [lotes, setLotes] = useState([])
  const [cultivos, setCultivos] = useState([])
  const [zafras, setZafras] = useState([])
  const [user, setUser] = useState(null)
  
  const [fincaSeleccionada, setFincaSeleccionada] = useState('')
  const [loteSeleccionado, setLoteSeleccionado] = useState('')
  const [cultivo, setCultivo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [estado, setEstado] = useState('prep')

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user?.id)
  }

  useEffect(() => {
    if (user) {
      fetchFincas()
      fetchCultivos()
    }
  }, [user])

  useEffect(() => {
    if (fincaSeleccionada) {
      fetchLotes()
    }
  }, [fincaSeleccionada])

  useEffect(() => {
    if (loteSeleccionado) {
      fetchZafras()
    }
  }, [loteSeleccionado])

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
  }

  const fetchLotes = async () => {
    const { data } = await supabase.from('api_lote').select('*').eq('finca_id', parseInt(fincaSeleccionada))
    setLotes(data || [])
    setLoteSeleccionado('')
  }

  const fetchCultivos = async () => {
    const { data } = await supabase.from('api_cultivocatalogo').select('id, nombre')
    setCultivos(data || [])
  }

  const fetchZafras = async () => {
    const { data } = await supabase.from('api_zafra').select('*').eq('lote_id', parseInt(loteSeleccionado))
    setZafras(data || [])
  }

  const handleCreateZafra = async (e) => {
    e.preventDefault()
    
    if (!loteSeleccionado || !cultivo || !fechaInicio) {
      alert('Completa Lote, Cultivo y Fecha Inicio')
      return
    }

    if (!user) {
      alert('Esperando autenticación...')
      return
    }

    const numeroZafra = zafras.length + 1

    const { error } = await supabase.from('api_zafra').insert([{
      lote_id: parseInt(loteSeleccionado),
      numero_zafra: numeroZafra,
      cultivo_id: parseInt(cultivo),
      fecha_inicio: fechaInicio,
      fecha_fin: null,
      estado: estado,
      user_id: user
    }])

    if (error) {
      console.error('Error:', error)
      alert('Error: ' + error.message)
      return
    }

    setCultivo('')
    setFechaInicio('')
    setEstado('prep')
    fetchZafras()
  }

  const getEstadoColor = (est) => {
    const colores = {
      'prep': 'bg-gray-200',
      'siembra': 'bg-green-200',
      'crec': 'bg-green-400',
      'cosecha': 'bg-yellow-300',
      'cerrada': 'bg-red-200'
    }
    return colores[est] || 'bg-gray-100'
  }

  return (
    <div className="p-8 max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-4">🌾 Gestión de Zafras</h2>
      
      <div className="bg-[#F5F2E6] p-4 rounded-lg border-2 border-[#1F3D2B] mb-8">
        <p className="text-[#1F3D2B] font-bold">¿QUÉ ES UNA ZAFRA?</p>
        <p className="text-[#6B5D45] text-sm">Ciclo completo de un cultivo. Sirve para rastrear TODOS LOS GASTOS de ese cultivo en ese lote.</p>
        <p className="text-[#6B5D45] text-sm mt-2">Ejemplo: Maíz del 15 dic → 30 abr. Todos los costos van aquí.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
          <label className="block font-bold mb-2">Selecciona Finca:</label>
          <select
            value={fincaSeleccionada}
            onChange={(e) => setFincaSeleccionada(e.target.value)}
            className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg"
          >
            <option value="">-- Selecciona Finca --</option>
            {fincas.map(f => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
          <label className="block font-bold mb-2">Selecciona Lote:</label>
          <select
            value={loteSeleccionado}
            onChange={(e) => setLoteSeleccionado(e.target.value)}
            className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg"
            disabled={!fincaSeleccionada}
          >
            <option value="">-- Selecciona Lote --</option>
            {lotes.map(l => (
              <option key={l.id} value={l.id}>{l.nombre} ({l.superficie} ha)</option>
            ))}
          </select>
        </div>
      </div>

      {loteSeleccionado && (
        <div className="space-y-8">
          <form onSubmit={handleCreateZafra} className="bg-white p-8 rounded-lg border-4 border-[#1F3D2B]">
            <h3 className="text-2xl font-bold text-[#1F3D2B] mb-6">Crear Nueva Zafra</h3>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-bold mb-2">Cultivo:</label>
                <select
                  value={cultivo}
                  onChange={(e) => setCultivo(e.target.value)}
                  className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg"
                  required
                >
                  <option value="">Selecciona Cultivo</option>
                  {cultivos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-2">Estado:</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg"
                >
                  <option value="prep">Preparación</option>
                  <option value="siembra">Siembra</option>
                  <option value="crec">Crecimiento</option>
                  <option value="cosecha">Cosecha</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2">Fecha de Inicio (Siembra):</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg"
                required
              />
              <p className="text-sm text-[#6B5D45] mt-2">La fecha de fin se actualiza automáticamente cuando registres la cosecha</p>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg hover:bg-[#0F2116] text-lg"
            >
              ➕ Crear Zafra
            </button>
          </form>

          <div className="bg-white rounded-lg border-2 border-[#D8D2BE] p-8">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Zafras del Lote</h3>
            {zafras.length === 0 ? (
              <p className="text-[#6B5D45]">No hay zafras creadas para este lote</p>
            ) : (
              <div className="space-y-3">
                {zafras.map(z => (
                  <div key={z.id} className={`p-4 rounded-lg border-2 border-[#1F3D2B] ${getEstadoColor(z.estado)}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">Zafra {z.numero_zafra} - {cultivos.find(c => c.id === z.cultivo_id)?.nombre}</p>
                        <p className="text-sm text-[#6B5D45]">Inicio: {z.fecha_inicio}</p>
                        {z.fecha_fin && <p className="text-sm text-[#6B5D45]">Fin: {z.fecha_fin}</p>}
                      </div>
                      <span className="font-bold text-white bg-[#1F3D2B] px-4 py-2 rounded">
                        {z.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}