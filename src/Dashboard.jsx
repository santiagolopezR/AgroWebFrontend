import { useState, useEffect } from 'react'
import { TrendingUp, Zap, Package, MapPin } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalActividades: 0,
    totalHectareas: 0,
    totalCosto: 0,
    totalProductos: 0,
  })
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      // Total de actividades
      const { data: actividadesData } = await supabase
        .from('api_actividad')
        .select('*')

      // Total hectáreas (sum de api_actividad_lote)
      const { data: lotesData } = await supabase
        .from('api_actividad_lote')
        .select('hectareas')

      const totalHa = lotesData?.reduce((sum, l) => sum + (l.hectareas || 0), 0) || 0

      // Total costo (sum de api_actividad_producto)
      const { data: productosData } = await supabase
        .from('api_actividad_producto')
        .select('total')

      const totalCosto = productosData?.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0) || 0

      // Total productos únicos
      const { data: productosUnicos } = await supabase
        .from('api_producto')
        .select('id')

      setStats({
        totalActividades: actividadesData?.length || 0,
        totalHectareas: totalHa,
        totalCosto: totalCosto,
        totalProductos: productosUnicos?.length || 0,
      })

      // Últimas 10 actividades
      const { data: ultimasActividades } = await supabase
        .from('api_actividad')
        .select('*, api_tipoactividad(nombre)')
        .order('fecha', { ascending: false })
        .limit(10)

      setActividades(ultimasActividades || [])
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Cargando dashboard...</div>

  return (
    <div className="p-8 max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">📊 Dashboard</h2>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* Total Actividades */}
        <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5D45] font-bold mb-2">Total Actividades</p>
              <p className="text-4xl font-bold text-[#1F3D2B]">{stats.totalActividades}</p>
            </div>
            <Zap size={40} className="text-[#1F3D2B] opacity-20" />
          </div>
        </div>

        {/* Total Hectáreas */}
        <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5D45] font-bold mb-2">Total Hectáreas</p>
              <p className="text-4xl font-bold text-[#1F3D2B]">{stats.totalHectareas}</p>
              <p className="text-xs text-[#6B5D45] mt-1">ha</p>
            </div>
            <MapPin size={40} className="text-[#1F3D2B] opacity-20" />
          </div>
        </div>

        {/* Total Costo */}
        <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5D45] font-bold mb-2">Costo Total</p>
              <p className="text-3xl font-bold text-[#1F3D2B]">${stats.totalCosto.toFixed(0)}</p>
            </div>
            <TrendingUp size={40} className="text-[#1F3D2B] opacity-20" />
          </div>
        </div>

        {/* Total Productos */}
        <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5D45] font-bold mb-2">Productos</p>
              <p className="text-4xl font-bold text-[#1F3D2B]">{stats.totalProductos}</p>
            </div>
            <Package size={40} className="text-[#1F3D2B] opacity-20" />
          </div>
        </div>
      </div>

      {/* Últimas Actividades */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8">
        <h3 className="text-2xl font-bold text-[#1F3D2B] mb-6">📋 Últimas Actividades</h3>

        {actividades.length === 0 ? (
          <p className="text-[#6B5D45]">No hay actividades registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1F3D2B] text-white">
                  <th className="text-left py-3 px-4 font-bold">Fecha</th>
                  <th className="text-left py-3 px-4 font-bold">Tipo</th>
                  <th className="text-left py-3 px-4 font-bold">Responsable</th>
                  <th className="text-left py-3 px-4 font-bold">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((act, i) => (
                  <tr key={i} className="border-b border-[#D8D2BE] hover:bg-[#F5F2E6]">
                    <td className="py-3 px-4 font-bold">{act.fecha}</td>
                    <td className="py-3 px-4">{act.api_tipoactividad?.nombre || 'N/A'}</td>
                    <td className="py-3 px-4">{act.responsable}</td>
                    <td className="py-3 px-4 text-[#6B5D45]">{act.observaciones || '-'}</td>
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