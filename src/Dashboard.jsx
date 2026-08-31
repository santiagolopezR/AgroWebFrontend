import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [fincas, setFincas] = useState([])
  const [fincaId, setFincaId] = useState('')
  const [actividades, setActividades] = useState([])
  const [gastos, setGastos] = useState([])
  const [resumenMensual, setResumenMensual] = useState([])
  const [resumenActividades, setResumenActividades] = useState([])

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
    }
  }, [user])

  useEffect(() => {
    if (user && fincaId) {
      fetchActividades()
      fetchGastos()
      fetchResumenes()
    }
  }, [user, fincaId])

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
    if (data && data.length > 0) {
      setFincaId(data[0].id)
    }
  }

  const fetchActividades = async () => {
    const { data } = await supabase
      .from('api_actividad')
      .select('*, api_tipoactividad(nombre), api_finca(nombre)')
      .eq('user_id', user)
      .order('fecha', { ascending: false })
      .limit(15)
    setActividades(data || [])
  }

  const fetchGastos = async () => {
    const { data } = await supabase
      .from('api_finca_gasto')
      .select('*, api_finca_gasto_item(*)')
      .eq('finca_id', parseInt(fincaId))
      .eq('user_id', user)
      .order('fecha', { ascending: false })
      .limit(20)
    setGastos(data || [])
  }

  const fetchResumenes = async () => {
    const { data: gastosData } = await supabase
      .from('api_finca_gasto')
      .select('fecha, total_neto')
      .eq('finca_id', parseInt(fincaId))
      .eq('user_id', user)

    const resumen = {}
    gastosData?.forEach(g => {
      const mes = g.fecha.substring(0, 7)
      resumen[mes] = (resumen[mes] || 0) + parseFloat(g.total_neto)
    })

    const resumenArray = Object.entries(resumen)
      .map(([mes, total]) => ({ mes, total: parseFloat(total) }))
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .slice(0, 6)
      .reverse()

    setResumenMensual(resumenArray)
  }

  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.total_neto || 0), 0)
  const totalActividades = actividades.length
  const gastoPromedio = totalActividades > 0 ? totalGastos / totalActividades : 0

  return (
    <div className="p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">📊 Dashboard</h2>

      <div className="bg-white p-4 rounded-lg border-4 border-[#1F3D2B] mb-6">
        <label className="text-sm font-bold text-[#1F3D2B]">Selecciona Finca</label>
        <select 
          value={fincaId} 
          onChange={(e) => setFincaId(e.target.value)} 
          className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm mt-2"
        >
          {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <p className="text-sm text-[#6B5D45] font-bold">Total Gastos</p>
          <p className="text-3xl font-bold text-[#1F3D2B]">${totalGastos.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <p className="text-sm text-[#6B5D45] font-bold">Actividades</p>
          <p className="text-3xl font-bold text-[#1F3D2B]">{totalActividades}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <p className="text-sm text-[#6B5D45] font-bold">Gasto Promedio</p>
          <p className="text-3xl font-bold text-[#1F3D2B]">${gastoPromedio.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <p className="text-sm text-[#6B5D45] font-bold"># Gastos</p>
          <p className="text-3xl font-bold text-[#1F3D2B]">{gastos.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📝 Actividades Recientes</h3>
        {actividades.length === 0 ? (
          <p className="text-[#6B5D45]">No hay actividades</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                  <th className="p-3 text-left font-bold">Fecha</th>
                  <th className="p-3 text-left font-bold">Finca</th>
                  <th className="p-3 text-left font-bold">Tipo</th>
                  <th className="p-3 text-center font-bold">Costo</th>
                  <th className="p-3 text-left font-bold">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map(act => (
                  <tr key={act.id} className="border-b border-[#D8D2BE]">
                    <td className="p-3">{act.fecha}</td>
                    <td className="p-3">{act.api_finca?.nombre || '—'}</td>
                    <td className="p-3">{act.api_tipoactividad?.nombre || 'N/A'}</td>
                    <td className="p-3 text-center font-bold">${parseFloat(act.costo_total || 0).toLocaleString()}</td>
                    <td className="p-3">{act.responsable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">💰 Gastos Detallados</h3>
          {gastos.length === 0 ? (
            <p className="text-[#6B5D45]">No hay gastos</p>
          ) : (
            <div className="space-y-4">
              {gastos.slice(0, 5).map(gasto => (
                <div key={gasto.id} className="border-2 border-[#D8D2BE] rounded-lg">
                  <div className="bg-[#F5F2E6] p-3">
                    <p className="font-bold text-[#1F3D2B]">{gasto.factura_numero}</p>
                    <p className="text-xs text-[#6B5D45]">{gasto.fecha}</p>
                    <p className="text-lg font-bold text-[#1F3D2B]">${parseFloat(gasto.total_neto).toLocaleString()}</p>
                  </div>
                  {gasto.api_finca_gasto_item?.length > 0 && (
                    <div className="p-3 text-xs space-y-1">
                      {gasto.api_finca_gasto_item.slice(0, 3).map(item => (
                        <p key={item.id} className="text-[#6B5D45]">{item.descripcion}: ${parseFloat(item.total).toLocaleString()}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📅 Últimos 6 Meses</h3>
          {resumenMensual.length === 0 ? (
            <p className="text-[#6B5D45]">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {resumenMensual.map((mes, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <p className="text-sm">{mes.mes}</p>
                  <div className="flex-1 ml-4 bg-[#D8D2BE] rounded h-6">
                    <div 
                      className="bg-[#1F3D2B] h-6 rounded"
                      style={{width: `${(mes.total / Math.max(...resumenMensual.map(m => m.total))) * 100}%`}}
                    ></div>
                  </div>
                  <p className="text-sm font-bold ml-4">${mes.total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}