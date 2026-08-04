import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function RegistroGasto() {
  const [fincas, setFincas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [user, setUser] = useState(null)

  const [fincaId, setFincaId] = useState('')
  const [factura, setFactura] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')
  const [pagadoPor, setPagadoPor] = useState('')
  const [ivaPorc, setIvaPorc] = useState(19)
  
  const [items, setItems] = useState([])
  const [showModalProducto, setShowModalProducto] = useState(false)
  const [newProductoNombre, setNewProductoNombre] = useState('')
  const [newProductoCategoria, setNewProductoCategoria] = useState('')
  const [newProductoUnidad, setNewProductoUnidad] = useState('')
  const [newProductoPrecio, setNewProductoPrecio] = useState('')

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
      fetchCategorias()
      fetchProductos()
      fetchProveedores()
    }
  }, [user])

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
  }

  const fetchCategorias = async () => {
    const { data } = await supabase.from('api_categoria').select('*')
    setCategorias(data || [])
  }

  const fetchProductos = async () => {
    const { data } = await supabase.from('api_producto').select('*').eq('user_id', user)
    setProductos(data || [])
  }

  const fetchProveedores = async () => {
    const { data } = await supabase.from('api_proveedor').select('*').eq('user_id', user)
    setProveedores(data || [])
  }

  const addItem = () => {
    setItems([...items, { id: Date.now(), categoriaId: '', productoId: '', descripcion: '', cantidad: '', precio: '', total: 0 }])
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        if (field === 'cantidad' || field === 'precio') {
          const cant = parseFloat(updated.cantidad) || 0
          const precio = parseFloat(updated.precio) || 0
          updated.total = cant * precio
        }
        
        if (field === 'productoId' && value) {
          const prod = productos.find(p => p.id === parseInt(value))
          if (prod) {
            updated.precio = prod.precio_actual
          }
        }
        
        return updated
      }
      return item
    }))
  }

  const createProducto = async () => {
    if (!newProductoNombre || !newProductoCategoria || !newProductoUnidad || !newProductoPrecio) {
      alert('Completa todos los campos')
      return
    }

    const { error } = await supabase.from('api_producto').insert([{
      nombre: newProductoNombre,
      categoria_id: parseInt(newProductoCategoria),
      unidad: newProductoUnidad,
      precio_actual: parseFloat(newProductoPrecio),
      user_id: user
    }])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setNewProductoNombre('')
    setNewProductoCategoria('')
    setNewProductoUnidad('')
    setNewProductoPrecio('')
    setShowModalProducto(false)
    fetchProductos()
  }

  const totalBruto = items.reduce((sum, item) => sum + (item.total || 0), 0)
  const totalIva = totalBruto * (ivaPorc / 100)
  const totalNeto = totalBruto + totalIva

  const handleSave = async (e) => {
    e.preventDefault()

    if (!fincaId || !factura || !fecha || !pagadoPor || items.length === 0) {
      alert('Completa Finca, Factura, Fecha, Pagado Por e Items')
      return
    }

    const { data: gasto, error: errorGasto } = await supabase.from('api_finca_gasto').insert([{
      finca_id: parseInt(fincaId),
      factura_numero: factura,
      proveedor_id: proveedorId ? parseInt(proveedorId) : null,
      fecha: fecha,
      iva_porcentaje: ivaPorc,
      total_bruto: totalBruto,
      total_iva: totalIva,
      total_neto: totalNeto,
      pagado_por: pagadoPor,
      user_id: user
    }]).select()

    if (errorGasto) {
      alert('Error: ' + errorGasto.message)
      return
    }

    const gastoId = gasto[0].id

    const itemsInsert = items.map(item => ({
      gasto_id: gastoId,
      tipo_costo_id: parseInt(item.categoriaId),
      producto_id: item.productoId ? parseInt(item.productoId) : null,
      descripcion: item.descripcion,
      cantidad: parseFloat(item.cantidad),
      unidad: 'unidad',
      precio_unitario: parseFloat(item.precio),
      total: item.total
    }))

    const { error: errorItems } = await supabase.from('api_finca_gasto_item').insert(itemsInsert)

    if (errorItems) {
      alert('Error: ' + errorItems.message)
      return
    }

    alert('✅ Gasto registrado exitosamente')
    setFactura('')
    setProveedorId('')
    setFecha('')
    setFincaId('')
    setPagadoPor('')
    setItems([])
  }

  return (
    <div className="p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">💰 Registrar Gasto</h2>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ENCABEZADO */}
        <div className="bg-white p-6 rounded-lg border-4 border-[#1F3D2B]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-6">📝 Encabezado del Gasto</h3>
          
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block font-bold mb-2 text-[#1F3D2B]">Finca *</label>
              <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" required>
                <option value="">Selecciona</option>
                {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-2 text-[#1F3D2B]">Factura # *</label>
              <input type="text" value={factura} onChange={(e) => setFactura(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" placeholder="001-001-000001" required />
            </div>

            <div>
              <label className="block font-bold mb-2 text-[#1F3D2B]">Proveedor</label>
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg">
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-2 text-[#1F3D2B]">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" required />
            </div>

            <div>
              <label className="block font-bold mb-2 text-[#1F3D2B]">Pagado Por *</label>
              <select value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" required>
                <option value="">Selecciona</option>
                <option value="Ganaderia OL">Ganaderia OL</option>
                <option value="Santiago">Santiago</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold mb-2 text-[#1F3D2B]">IVA %</label>
            <input type="number" value={ivaPorc} onChange={(e) => setIvaPorc(parseFloat(e.target.value))} className="w-32 p-3 border-2 border-[#D8D2BE] rounded-lg" />
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[#1F3D2B]">📋 Items del Gasto</h3>
            <button type="button" onClick={addItem} className="bg-green-600 text-white px-4 py-2 rounded font-bold">➕ Agregar Item</button>
          </div>

          {items.length === 0 ? (
            <p className="text-[#6B5D45]">Sin items. Haz click en "Agregar Item"</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                    <th className="p-2 text-left font-bold">Categoría</th>
                    <th className="p-2 text-left font-bold">Producto</th>
                    <th className="p-2 text-left font-bold">Descripción</th>
                    <th className="p-2 text-left font-bold">Cantidad</th>
                    <th className="p-2 text-left font-bold">Precio U</th>
                    <th className="p-2 text-left font-bold">Total</th>
                    <th className="p-2 text-center font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-[#D8D2BE]">
                      <td className="p-2">
                        <select value={item.categoriaId} onChange={(e) => updateItem(item.id, 'categoriaId', e.target.value)} className="w-full p-2 border rounded text-sm" required>
                          <option value="">Selecciona</option>
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <select value={item.productoId} onChange={(e) => updateItem(item.id, 'productoId', e.target.value)} className="w-full p-2 border rounded text-sm">
                          <option value="">Sin producto</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input type="text" value={item.descripcion} onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)} className="w-full p-2 border rounded text-sm" />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" value={item.cantidad} onChange={(e) => updateItem(item.id, 'cantidad', e.target.value)} className="w-full p-2 border rounded text-sm" required />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" value={item.precio} onChange={(e) => updateItem(item.id, 'precio', e.target.value)} className="w-full p-2 border rounded text-sm" required />
                      </td>
                      <td className="p-2 font-bold">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 font-bold">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button type="button" onClick={() => setShowModalProducto(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm">
            ➕ Crear Producto Nuevo
          </button>
        </div>

        {/* TOTALES */}
        <div className="bg-[#F5F2E6] p-6 rounded-lg border-4 border-[#1F3D2B]">
          <div className="grid grid-cols-3 gap-6 text-lg font-bold">
            <div className="text-center">
              <p className="text-[#6B5D45]">Total Bruto</p>
              <p className="text-[#1F3D2B] text-3xl">${totalBruto.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[#6B5D45]">IVA ({ivaPorc}%)</p>
              <p className="text-[#1F3D2B] text-3xl">${totalIva.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[#6B5D45]">Total Neto</p>
              <p className="text-[#1F3D2B] text-3xl">${totalNeto.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-[#1F3D2B] text-white font-bold py-4 rounded-lg text-lg hover:bg-[#0F2116]">
          ✅ Guardar Gasto
        </button>
      </form>

      {/* MODAL CREAR PRODUCTO */}
      {showModalProducto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg border-4 border-[#1F3D2B] w-96">
            <h3 className="text-2xl font-bold text-[#1F3D2B] mb-6">➕ Crear Producto</h3>
            
            <div className="space-y-4">
              <input type="text" placeholder="Nombre producto" value={newProductoNombre} onChange={(e) => setNewProductoNombre(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" />
              
              <select value={newProductoCategoria} onChange={(e) => setNewProductoCategoria(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg">
                <option value="">Selecciona Categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              
              <input type="text" placeholder="Unidad (L, kg, etc)" value={newProductoUnidad} onChange={(e) => setNewProductoUnidad(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" />
              
              <input type="number" step="0.01" placeholder="Precio" value={newProductoPrecio} onChange={(e) => setNewProductoPrecio(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={createProducto} className="flex-1 bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700">
                ✅ Crear
              </button>
              <button onClick={() => setShowModalProducto(false)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}