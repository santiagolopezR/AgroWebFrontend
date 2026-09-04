import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [fincas, setFincas] = useState([])
  const [fincaId, setFincaId] = useState('')
  const [actividades, setActividades] = useState([])
  const [gastos, setGastos] = useState([])
  const [filtroMesCosto, setFiltroMesCosto] = useState('')

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
      setFiltroMesCosto('')
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
      .select('*, api_tipoactividad(nombre), api_finca(nombre), api_actividad_lote(api_lote(nombre))')
      .eq('user_id', user)
      .order('fecha', { ascending: false })
      .limit(15)
    setActividades(data || [])
  }

  const fetchGastos = async () => {
    const { data } = await supabase
      .from('api_finca_gasto')
      .select('*, api_finca_gasto_item(*, api_producto(nombre, categoria))')
      .eq('finca_id', parseInt(fincaId))
      .eq('user_id', user)
      .order('fecha', { ascending: false })
      .limit(20)
    setGastos(data || [])
  }

  // Gastos aplanados a nivel de item (una fila por producto/línea, no por factura)
  const itemsGasto = gastos
    .flatMap(g => (g.api_finca_gasto_item || []).map(item => ({
      id: item.id,
      fecha: g.fecha,
      mes: (g.fecha || '').slice(0, 7),
      factura: g.factura_numero,
      producto: item.api_producto?.nombre || item.descripcion || '—',
      cantidad: item.cantidad,
      precioUnitario: item.precio_unitario,
      total: item.total,
      categoria: item.api_producto?.categoria || 'Sin categoría',
    })))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

  const mesesDisponibles = [...new Set(itemsGasto.map(i => i.mes).filter(Boolean))].sort().reverse()

  const itemsGastoFiltrados = filtroMesCosto
    ? itemsGasto.filter(i => i.mes === filtroMesCosto)
    : itemsGasto

  const facturasFiltradas = new Set(itemsGastoFiltrados.map(i => i.factura))
  const totalPeriodo = itemsGastoFiltrados.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0)
  const promedioPeriodo = facturasFiltradas.size > 0 ? totalPeriodo / facturasFiltradas.size : 0

  const categoriaTotales = Object.entries(
    itemsGastoFiltrados.reduce((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] || 0) + (parseFloat(item.total) || 0)
      return acc
    }, {})
  )
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="p-4 md:p-8 max-w-full">
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

      <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
        <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
          <h3 className="text-xl font-bold text-[#1F3D2B]">💰 Análisis de Costos</h3>
          <select
            value={filtroMesCosto}
            onChange={(e) => setFiltroMesCosto(e.target.value)}
            className="p-2 border-2 border-[#D8D2BE] rounded text-sm"
          >
            <option value="">Todos los meses</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F5F2E6] p-4 rounded-lg border-2 border-[#D8D2BE]">
            <p className="text-xs text-[#6B5D45] font-bold">Total del período</p>
            <p className="text-2xl font-bold text-[#1F3D2B]">${totalPeriodo.toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-[#F5F2E6] p-4 rounded-lg border-2 border-[#D8D2BE]">
            <p className="text-xs text-[#6B5D45] font-bold"># Facturas</p>
            <p className="text-2xl font-bold text-[#1F3D2B]">{facturasFiltradas.size}</p>
          </div>
          <div className="bg-[#F5F2E6] p-4 rounded-lg border-2 border-[#D8D2BE]">
            <p className="text-xs text-[#6B5D45] font-bold">Promedio / factura</p>
            <p className="text-2xl font-bold text-[#1F3D2B]">${promedioPeriodo.toLocaleString('es-CO')}</p>
          </div>
        </div>

        <h4 className="font-bold text-[#1F3D2B] mb-3">Distribución por categoría</h4>
        {categoriaTotales.length === 0 ? (
          <p className="text-[#6B5D45] text-sm">No hay gastos en este período.</p>
        ) : (
          <div className="space-y-2">
            {categoriaTotales.map((c) => (
              <div key={c.categoria} className="flex justify-between items-center">
                <p className="text-sm w-32 shrink-0">{c.categoria}</p>
                <div className="flex-1 ml-2 bg-[#D8D2BE] rounded h-6">
                  <div
                    className="bg-[#1F3D2B] h-6 rounded"
                    style={{ width: `${(c.total / categoriaTotales[0].total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm font-bold ml-4">${c.total.toLocaleString('es-CO')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📝 Actividades Recientes</h3>
        {actividades.length === 0 ? (
          <p className="text-[#6B5D45]">No hay actividades</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                  <th className="p-3 text-left font-bold">Fecha</th>
                  <th className="p-3 text-left font-bold">Finca</th>
                  <th className="p-3 text-left font-bold">Lote</th>
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
                    <td className="p-3">
                      {act.api_actividad_lote?.length > 0
                        ? act.api_actividad_lote.map(al => al.api_lote?.nombre).filter(Boolean).join(', ')
                        : '—'}
                    </td>
                    <td className="p-3">{act.api_tipoactividad?.nombre || 'N/A'}</td>
                    <td className="p-3 text-center font-bold">${parseFloat(act.costo_total || 0).toLocaleString('es-CO')}</td>
                    <td className="p-3">{act.responsable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE] mb-6">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
          <h3 className="text-xl font-bold text-[#1F3D2B]">💰 Gastos Detallados</h3>
          {filtroMesCosto && <span className="text-xs text-[#6B5D45]">Filtrado a {filtroMesCosto}</span>}
        </div>
        {itemsGastoFiltrados.length === 0 ? (
          <p className="text-[#6B5D45]">No hay gastos en este período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                  <th className="p-3 text-left font-bold">Fecha</th>
                  <th className="p-3 text-left font-bold">Factura</th>
                  <th className="p-3 text-left font-bold">Producto</th>
                  <th className="p-3 text-center font-bold">Cantidad</th>
                  <th className="p-3 text-center font-bold">Precio U</th>
                  <th className="p-3 text-center font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {itemsGastoFiltrados.map(item => (
                  <tr key={item.id} className="border-b border-[#D8D2BE]">
                    <td className="p-3">{item.fecha}</td>
                    <td className="p-3">{item.factura}</td>
                    <td className="p-3">{item.producto}</td>
                    <td className="p-3 text-center">{item.cantidad}</td>
                    <td className="p-3 text-center">${parseFloat(item.precioUnitario || 0).toLocaleString('es-CO')}</td>
                    <td className="p-3 text-center font-bold">${parseFloat(item.total || 0).toLocaleString('es-CO')}</td>
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