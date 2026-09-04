import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function EditarGasto() {
  const [user, setUser] = useState(null)
  const [fincas, setFincas] = useState([])
  const [gastos, setGastos] = useState([])
  const [items, setItems] = useState([])
  const [fincaId, setFincaId] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [editData, setEditData] = useState(null)
  const [showItems, setShowItems] = useState(null)
  const [categoriaTotales, setCategoriaTotales] = useState([])

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
      fetchGastos()
    }
  }, [user])

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
  }

  const fetchGastos = async () => {
    const { data } = await supabase
      .from('api_finca_gasto')
      .select('*, api_finca(nombre), api_proveedor(nombre)')
      .eq('user_id', user)
      .order('fecha', { ascending: false })
    setGastos(data || [])
  }

  const fetchItems = async (gastoId) => {
    const { data } = await supabase
      .from('api_finca_gasto_item')
      .select('*')
      .eq('gasto_id', gastoId)
    setItems(data || [])
    setShowItems(gastoId)
  }

  const handleEdit = (gasto) => {
    setEditandoId(gasto.id)
    setEditData({ ...gasto })
  }

  const handleSaveEdit = async () => {
    if (!editData) return

    const { error } = await supabase
      .from('api_finca_gasto')
      .update({
        factura_numero: editData.factura_numero,
        fecha: editData.fecha,
        total_bruto: parseFloat(editData.total_bruto),
        total_iva: parseFloat(editData.total_iva),
        total_neto: parseFloat(editData.total_neto),
        iva_porcentaje: parseFloat(editData.iva_porcentaje),
        pagado_por: editData.pagado_por
      })
      .eq('id', editandoId)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    alert('✅ Gasto actualizado')
    setEditandoId(null)
    setEditData(null)
    fetchGastos()
  }

  const handleDelete = async (id) => {
    if (!confirm('⚠️ ¿Eliminar gasto? Se eliminarán TODOS sus items')) return

    const { error: errorItems } = await supabase
      .from('api_finca_gasto_item')
      .delete()
      .eq('gasto_id', id)

    if (!errorItems) {
      const { error: errorGasto } = await supabase
        .from('api_finca_gasto')
        .delete()
        .eq('id', id)

      if (errorGasto) {
        alert('Error: ' + errorGasto.message)
        return
      }

      alert('✅ Gasto eliminado')
      fetchGastos()
      setShowItems(null)
    }
  }

  const gastosFiltrados = fincaId
    ? gastos.filter(g => g.finca_id === parseInt(fincaId))
    : gastos

  // Distribución de gastos por categoría (para el gráfico), sobre los gastos filtrados
  useEffect(() => {
    const fetchCategorias = async () => {
      const gastoIds = gastosFiltrados.map(g => g.id)
      if (gastoIds.length === 0) {
        setCategoriaTotales([])
        return
      }

      const { data, error } = await supabase
        .from('api_finca_gasto_item')
        .select('total, api_producto(categoria)')
        .in('gasto_id', gastoIds)

      if (error) {
        console.error('No se pudo cargar la distribución por categoría')
        return
      }

      const totalesPorCategoria = {}
      for (const item of data || []) {
        const cat = item.api_producto?.categoria || 'Sin categoría'
        totalesPorCategoria[cat] = (totalesPorCategoria[cat] || 0) + (parseFloat(item.total) || 0)
      }

      const ordenado = Object.entries(totalesPorCategoria)
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total)

      setCategoriaTotales(ordenado)
    }

    fetchCategorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, fincaId])

  return (
    <div className="p-4 md:p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">✏️ Editar Gastos</h2>

      <div className="bg-white p-4 rounded-lg border-4 border-[#1F3D2B] mb-6">
        <label className="text-sm font-bold text-[#1F3D2B]">Filtrar por Finca</label>
        <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm mt-2">
          <option value="">Todas</option>
          {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </div>

      {gastosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* TABLA RESUMEN DE TODOS LOS GASTOS */}
          <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
            <h3 className="font-bold text-lg text-[#1F3D2B] mb-3">📋 Todos los gastos</h3>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-[#1F3D2B] text-white">
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Finca</th>
                    <th className="p-2 text-left">Proveedor</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map(g => (
                    <tr key={g.id} className="border-b border-[#D8D2BE]">
                      <td className="p-2">{g.fecha}</td>
                      <td className="p-2">{g.api_finca?.nombre || '—'}</td>
                      <td className="p-2">{g.api_proveedor?.nombre || '—'}</td>
                      <td className="p-2 text-right font-bold">${parseFloat(g.total_neto || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-bold text-[#1F3D2B]">
              Total: ${gastosFiltrados.reduce((sum, g) => sum + parseFloat(g.total_neto || 0), 0).toLocaleString()}
              {' '}({gastosFiltrados.length} gasto{gastosFiltrados.length === 1 ? '' : 's'})
            </p>
          </div>

          {/* GRÁFICO DE DISTRIBUCIÓN POR CATEGORÍA */}
          <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
            <h3 className="font-bold text-lg text-[#1F3D2B] mb-3">📊 Distribución por categoría</h3>
            {categoriaTotales.length === 0 ? (
              <p className="text-sm text-[#6B5D45]">No hay items con producto/categoría para graficar.</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const maxTotal = Math.max(...categoriaTotales.map(c => c.total))
                  return categoriaTotales.map(c => (
                    <div key={c.categoria}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold">{c.categoria}</span>
                        <span>${c.total.toLocaleString()}</span>
                      </div>
                      <div className="bg-[#F5F2E6] rounded h-4">
                        <div
                          className="bg-[#1F3D2B] h-4 rounded"
                          style={{ width: `${(c.total / maxTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {gastosFiltrados.length === 0 ? (
          <p className="text-center text-[#6B5D45] py-8">No hay gastos registrados</p>
        ) : (
          gastosFiltrados.map(gasto => (
            <div key={gasto.id} className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
              {editandoId === gasto.id ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-[#1F3D2B]">Editando Gasto</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-bold">Factura #</label>
                      <input 
                        type="text" 
                        value={editData.factura_numero} 
                        onChange={(e) => setEditData({...editData, factura_numero: e.target.value})}
                        className="w-full p-2 border-2 border-[#D8D2BE] rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold">Fecha</label>
                      <input 
                        type="date" 
                        value={editData.fecha} 
                        onChange={(e) => setEditData({...editData, fecha: e.target.value})}
                        className="w-full p-2 border-2 border-[#D8D2BE] rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold">IVA %</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editData.iva_porcentaje} 
                        onChange={(e) => setEditData({...editData, iva_porcentaje: e.target.value})}
                        className="w-full p-2 border-2 border-[#D8D2BE] rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-bold">Total Bruto</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editData.total_bruto} 
                        onChange={(e) => {
                          const bruto = parseFloat(e.target.value) || 0
                          const iva = bruto * (parseFloat(editData.iva_porcentaje) / 100)
                          setEditData({...editData, total_bruto: bruto, total_iva: iva, total_neto: bruto + iva})
                        }}
                        className="w-full p-2 border-2 border-[#D8D2BE] rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold">Total IVA</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editData.total_iva} 
                        disabled
                        className="w-full p-2 border-2 border-[#D8D2BE] rounded bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold">Total Neto</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editData.total_neto} 
                        disabled
                        className="w-full p-2 border-2 border-[#D8D2BE] rounded bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold">Pagado Por</label>
                    <select 
                      value={editData.pagado_por} 
                      onChange={(e) => setEditData({...editData, pagado_por: e.target.value})}
                      className="w-full p-2 border-2 border-[#D8D2BE] rounded"
                    >
                      <option value="Santiago">Santiago</option>
                      <option value="Ganaderia OL">Ganaderia OL</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveEdit} 
                      className="flex-1 bg-green-600 text-white font-bold py-2 rounded"
                    >
                      ✅ Guardar
                    </button>
                    <button 
                      onClick={() => setEditandoId(null)} 
                      className="flex-1 bg-gray-600 text-white font-bold py-2 rounded"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">Factura: {gasto.factura_numero}</p>
                      <p className="text-sm text-[#6B5D45]">{gasto.fecha} | Pagado por: {gasto.pagado_por}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-[#1F3D2B]">${parseFloat(gasto.total_neto).toLocaleString()}</p>
                      <p className="text-xs text-[#6B5D45]">IVA: {gasto.iva_porcentaje}%</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => handleEdit(gasto)} 
                      className="flex-1 bg-blue-600 text-white font-bold py-2 rounded"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => fetchItems(gasto.id)} 
                      className="flex-1 bg-purple-600 text-white font-bold py-2 rounded"
                    >
                      📋 Ver Items
                    </button>
                    <button 
                      onClick={() => handleDelete(gasto.id)} 
                      className="flex-1 bg-red-600 text-white font-bold py-2 rounded"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>

                  {showItems === gasto.id && (
                    <div className="bg-[#F5F2E6] p-3 rounded border-2 border-[#D8D2BE] mt-3">
                      <h4 className="font-bold mb-2">Detalle de Items:</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[#1F3D2B] text-white">
                            <th className="p-1 text-left">Descripción</th>
                            <th className="p-1 text-center">Cantidad</th>
                            <th className="p-1 text-right">Precio U</th>
                            <th className="p-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id} className="border-b border-[#D8D2BE]">
                              <td className="p-1">{item.descripcion}</td>
                              <td className="p-1 text-center">{item.cantidad}</td>
                              <td className="p-1 text-right">${parseFloat(item.precio_unitario).toLocaleString()}</td>
                              <td className="p-1 text-right font-bold">${parseFloat(item.total).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}