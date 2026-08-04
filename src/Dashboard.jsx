import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [fincas, setFincas] = useState([])
  const [fincaId, setFincaId] = useState('')
  const [actividades, setActividades] = useState([])
  const [gastos, setGastos] = useState([])
  const [tiposActividad, setTiposActividad] = useState([])
  const [categorias, setCategorias] = useState([])
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
      fetchTiposActividad()
      fetchCategorias()
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

  const fetchTiposActividad = async () => {
    const { data } = await supabase.from('api_tipoactividad').select('*')
    setTiposActividad(data || [])
  }

  const fetchCategorias = async () => {
    const { data } = await supabase.from('api_categoria').select('*')
    setCategorias(data || [])
  }

  const fetchActividades = async () => {
    const { data } = await supabase
      .from('api_actividad')
      .select('*, api_tipoactividad(nombre)')
      .eq('user_id', user)
      .order('fecha', { ascending: false })
      .limit(15)

    const actividadesFiltradas = data?.filter(a => {
      const lotes = data.filter(x => x.id === a.id)
      return a.user_id === user
    }) || []

    setActividades(actividadesFiltradas)
  }

  {/* GASTOS - TABLA CON ITEMS */}
<div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
  <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">💰 Gastos Detallados</h3>
  {gastos.length === 0 ? (
    <p className="text-[#6B5D45]">No hay gastos registrados</p>
  ) : (
    <div className="space-y-4">
      {gastos.map(gasto => (
        <div key={gasto.id} className="border-2 border-[#D8D2BE] rounded-lg overflow-hidden">
          {/* ENCABEZADO GASTO */}
          <div className="bg-[#F5F2E6] p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-lg text-[#1F3D2B]">Factura: {gasto.factura_numero}</p>
              <p className="text-sm text-[#6B5D45]">{gasto.fecha} | Pagado por: {gasto.pagado_por}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#1F3D2B]">${parseFloat(gasto.total_neto).toLocaleString()}</p>
              <p className="text-xs text-[#6B5D45]">IVA: ${parseFloat(gasto.total_iva).toLocaleString()}</p>
            </div>
          </div>

          {/* ITEMS */}
          {gasto.api_finca_gasto_item && gasto.api_finca_gasto_item.length > 0 ? (
            <div className="p-4 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[#D8D2BE]">
                    <th className="text-left p-2 font-bold">Descripción</th>
                    <th className="text-center p-2 font-bold">Cantidad</th>
                    <th className="text-center p-2 font-bold">Precio U</th>
                    <th className="text-right p-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gasto.api_finca_gasto_item.map(item => (
                    <tr key={item.id} className="border-b border-[#D8D2BE]">
                      <td className="p-2">{item.descripcion}</td>
                      <td className="text-center p-2">{item.cantidad}</td>
                      <td className="text-center p-2">${parseFloat(item.precio_unitario).toLocaleString()}</td>
                      <td className="text-right p-2 font-bold">${parseFloat(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-white text-[#6B5D45]">Sin items</div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
  }

  const fetchResumenes = async () => {
    // Resumen mensual de gastos
    const { data: gastosData } = await supabase
      .from('api_finca_gasto')
      .select('fecha, total_neto')
      .eq('finca_id', parseInt(fincaId))
      .eq('user_id', user)

    const resumen = {}
    gastosData?.forEach(g => {
      const mes = g.fecha.substring(0, 7) // YYYY-MM
      resumen[mes] = (resumen[mes] || 0) + parseFloat(g.total_neto)
    })

    const resumenArray = Object.entries(resumen)
      .map(([mes, total]) => ({ mes, total: parseFloat(total) }))
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .slice(0, 6)
      .reverse()

    setResumenMensual(resumenArray)

    // Resumen por tipo de actividad
    const { data: actividadesData } = await supabase
      .from('api_actividad')
      .select('tipo_id, costo_total, api_tipoactividad(nombre)')
      .eq('user_id', user)

    const resumenAct = {}
    actividadesData?.forEach(a => {
      const tipo = a.api_tipoactividad?.nombre || 'Sin tipo'
      resumenAct[tipo] = (resumenAct[tipo] || 0) + parseFloat(a.costo_total || 0)
    })

    const resumenActArray = Object.entries(resumenAct)
      .map(([tipo, total]) => ({ tipo, total: parseFloat(total) }))
      .sort((a, b) => b.total - a.total)

    setResumenActividades(resumenActArray)
  }

  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.total_neto || 0), 0)
  const totalActividades = actividades.length
  const gastoPromedio = totalActividades > 0 ? totalGastos / totalActividades : 0

  return (
    <div className="p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">📊 Dashboard</h2>

      {/* SELECTOR FINCA */}
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

      {/* KPIs */}
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

      {/* ACTIVIDADES RECIENTES */}
      <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📝 Actividades Recientes</h3>
        {actividades.length === 0 ? (
          <p className="text-[#6B5D45]">No hay actividades registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                  <th className="p-3 text-left font-bold">Fecha</th>
                  <th className="p-3 text-left font-bold">Tipo</th>
                  <th className="p-3 text-center font-bold">Costo</th>
                  <th className="p-3 text-left font-bold">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map(act => (
                  <tr key={act.id} className="border-b border-[#D8D2BE]">
                    <td className="p-3">{act.fecha}</td>
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
        {/* GASTOS - TABLA HORIZONTAL */}
<div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
  <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">💰 Gastos Detallados</h3>
  {gastos.length === 0 ? (
    <p className="text-[#6B5D45]">No hay gastos registrados</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
            <th className="p-3 text-left font-bold">Factura</th>
            <th className="p-3 text-left font-bold">Fecha</th>
            <th className="p-3 text-left font-bold">Proveedor</th>
            <th className="p-3 text-center font-bold">Total Bruto</th>
            <th className="p-3 text-center font-bold">IVA</th>
            <th className="p-3 text-center font-bold">Total Neto</th>
            <th className="p-3 text-left font-bold">Pagado Por</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map(gasto => (
            <tr key={gasto.id} className="border-b border-[#D8D2BE] hover:bg-[#F5F2E6]">
              <td className="p-3 font-bold text-[#1F3D2B]">{gasto.factura_numero}</td>
              <td className="p-3">{gasto.fecha}</td>
              <td className="p-3">{gasto.proveedor_id ? gasto.proveedor_id : '-'}</td>
              <td className="p-3 text-center">${parseFloat(gasto.total_bruto).toLocaleString()}</td>
              <td className="p-3 text-center">${parseFloat(gasto.total_iva).toLocaleString()}</td>
              <td className="p-3 text-center font-bold text-[#1F3D2B]">${parseFloat(gasto.total_neto).toLocaleString()}</td>
              <td className="p-3">{gasto.pagado_por}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
        {/* RESUMEN MENSUAL */}
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📅 Gastos Últimos 6 Meses</h3>
          {resumenMensual.length === 0 ? (
            <p className="text-[#6B5D45]">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {resumenMensual.map((mes, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <p className="text-sm">{mes.mes}</p>
                  <div className="flex-1 ml-4 bg-[#D8D2BE] rounded h-6 relative">
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

      {/* RESUMEN ACTIVIDADES */}
      <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">🎯 Costo por Tipo de Actividad</h3>
        {resumenActividades.length === 0 ? (
          <p className="text-[#6B5D45]">Sin datos</p>
        ) : (
          <div className="space-y-3">
            {resumenActividades.map((act, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded">
                <p className="font-bold">{act.tipo}</p>
                <p className="font-bold text-[#1F3D2B]">${act.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}