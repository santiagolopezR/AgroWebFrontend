import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function VerActividades({ onEditar, version }) {
  const [user, setUser] = useState(null)
  const [fincas, setFincas] = useState([])
  const [fincaId, setFincaId] = useState('')
  const [actividadesFinca, setActividadesFinca] = useState([])

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user?.id)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (user) fetchFincas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (fincaId) fetchActividadesFinca(fincaId)
    else setActividadesFinca([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fincaId, version])

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
  }

  const fetchActividadesFinca = async (fid) => {
    const { data, error } = await supabase
      .from('api_actividad')
      .select('*, api_tipoactividad(nombre), api_actividad_lote(lote_id, api_lote(nombre, area_hectareas))')
      .eq('finca_id', parseInt(fid))
      .order('fecha', { ascending: false })
      .limit(30)
    if (error) {
      console.error('No se pudieron cargar las actividades de la finca')
      return
    }
    setActividadesFinca(data || [])
  }

  const eliminarActividad = async (actividad) => {
    if (!confirm(`¿Eliminar la actividad "${actividad.api_tipoactividad?.nombre || 'Actividad'}" del ${actividad.fecha}? Esta acción no se puede deshacer.`)) return

    try {
      await supabase.from('api_actividad_producto').delete().eq('actividad_id', actividad.id)
      await supabase.from('api_actividad_lote').delete().eq('actividad_id', actividad.id)
      await supabase.from('api_costo_adicional').delete().eq('actividad_id', actividad.id)
      const { error } = await supabase.from('api_actividad').delete().eq('id', actividad.id)
      if (error) throw error

      fetchActividadesFinca(fincaId)
    } catch (error) {
      alert('No se pudo eliminar la actividad: ' + error.message)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">✏️ Ver y Editar Actividades</h2>

      <div className="bg-white p-4 rounded-lg border-4 border-[#1F3D2B] mb-6">
        <label className="text-sm font-bold text-[#1F3D2B]">Finca</label>
        <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm mt-2">
          <option value="">Selecciona</option>
          {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </div>

      <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
        {!fincaId ? (
          <p className="text-sm text-[#6B5D45]">Seleccioná una finca arriba para ver, editar o borrar sus actividades.</p>
        ) : actividadesFinca.length === 0 ? (
          <p className="text-sm text-[#6B5D45]">Todavía no hay actividades registradas en esta finca.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 760 }}>
              <thead>
                <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                  <th className="p-2 text-left font-bold">Fecha</th>
                  <th className="p-2 text-left font-bold">Tipo</th>
                  <th className="p-2 text-left font-bold">Responsable</th>
                  <th className="p-2 text-left font-bold">Lotes</th>
                  <th className="p-2 text-center font-bold">Costo</th>
                  <th className="p-2 text-center font-bold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {actividadesFinca.map(act => (
                  <tr key={act.id} className="border-b border-[#D8D2BE]">
                    <td className="p-2">{act.fecha}</td>
                    <td className="p-2">{act.api_tipoactividad?.nombre || 'N/A'}</td>
                    <td className="p-2">{act.responsable || '—'}</td>
                    <td className="p-2">
                      {(act.api_actividad_lote || []).length === 0
                        ? '—'
                        : act.api_actividad_lote
                            .map(al => `${al.api_lote?.nombre || 'Lote'} (${al.api_lote?.area_hectareas ?? '—'}ha)`)
                            .join(', ')}
                    </td>
                    <td className="p-2 text-center font-bold">${(act.costo_total || 0).toLocaleString('es-CO')}</td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => onEditar(act)} className="text-blue-600 font-bold mr-2" title="Editar">✏️</button>
                      <button type="button" onClick={() => eliminarActividad(act)} className="text-red-600 font-bold" title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
