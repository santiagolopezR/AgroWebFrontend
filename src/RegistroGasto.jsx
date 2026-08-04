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
  const [ivaGlobal, setIvaGlobal] = useState(19)
  
  const [items, setItems] = useState([])
  const [showModalProveedor, setShowModalProveedor] = useState(false)
  const [showModalProducto, setShowModalProducto] = useState(false)
  const [modalProductoItemId, setModalProductoItemId] = useState(null)
  const [newProvNombre, setNewProvNombre] = useState('')
  const [newProvContacto, setNewProvContacto] = useState('')
  const [newProvEmail, setNewProvEmail] = useState('')
  const [newProdNombre, setNewProdNombre] = useState('')
  const [newProdUnidad, setNewProdUnidad] = useState('')
  const [newProdPrecio, setNewProdPrecio] = useState('')
  const [newProdCategoria, setNewProdCategoria] = useState('')

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
    setItems([...items, { 
      id: Date.now(), 
      categoriaId: '', 
      categoriaNombre: '',
      productoId: '', 
      descripcion: '', 
      cantidad: '', 
      precioUnitario: '', 
      total: 0, 
      ivaItem: 19,
      totalConIva: 0
    }])
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        if (field === 'categoriaId') {
          const cat = categorias.find(c => c.id === parseInt(value))
          updated.categoriaNombre = cat ? cat.nombre : ''
        }

        if (field === 'cantidad' || field === 'precioUnitario') {
          const cant = parseFloat(updated.cantidad) || 0
          const precio = parseFloat(updated.precioUnitario) || 0
          updated.total = cant * precio
        }

        if (field === 'total' || field === 'cantidad') {
          const cant = parseFloat(updated.cantidad) || 0
          const total = parseFloat(updated.total) || 0
          if (cant > 0 && field === 'total') {
            updated.precioUnitario = (total / cant).toFixed(2)
          }
        }

        if (field === 'ivaItem') {
          const total = parseFloat(updated.total) || 0
          const iva = parseFloat(value) || 0
          updated.totalConIva = total + (total * (iva / 100))
        } else {
          const total = parseFloat(updated.total) || 0
          const iva = parseFloat(updated.ivaItem) || 19
          updated.totalConIva = total + (total * (iva / 100))
        }

        if (field === 'productoId' && value) {
          const prod = productos.find(p => p.id === parseInt(value))
          if (prod) {
            updated.precioUnitario = prod.precio_actual
          }
        }
        
        return updated
      }
      return item
    }))
  }

  const openCreateProductoModal = (itemId, catId, catNombre) => {
    setModalProductoItemId(itemId)
    setNewProdCategoria(catNombre)
    setShowModalProducto(true)
  }

  const createProveedor = async () => {
    if (!newProvNombre) {
      alert('Ingresa nombre del proveedor')
      return
    }

    const { error } = await supabase.from('api_proveedor').insert([{
      nombre: newProvNombre,
      contacto: newProvContacto,
      email: newProvEmail,
      user_id: user
    }])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setNewProvNombre('')
    setNewProvContacto('')
    setNewProvEmail('')
    setShowModalProveedor(false)
    fetchProveedores()
  }

  const createProducto = async () => {
    if (!newProdNombre || !newProdUnidad || !newProdPrecio || !newProdCategoria) {
      alert('Completa todos los campos')
      return
    }

    const { data, error } = await supabase.from('api_producto').insert([{
      nombre: newProdNombre,
      categoria: newProdCategoria,
      unidad: newProdUnidad,
      precio_actual: parseFloat(newProdPrecio),
      user_id: user
    }]).select()

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    const nuevoProductoId = data[0].id
    
    setNewProdNombre('')
    setNewProdUnidad('')
    setNewProdPrecio('')
    setNewProdCategoria('')
    setShowModalProducto(false)
    
    fetchProductos()

    if (modalProductoItemId) {
      setTimeout(() => {
        updateItem(modalProductoItemId, 'productoId', nuevoProductoId)
      }, 500)
    }
  }

  const totalGasto = items.reduce((sum, item) => sum + (item.totalConIva || 0), 0)

  const handleSave = async (e) => {
    e.preventDefault()

    if (!fincaId || !factura || !fecha || !pagadoPor || items.length === 0) {
      alert('Completa Finca, Factura, Fecha, Pagado Por e Items')
      return
    }

    const totalBruto = items.reduce((sum, item) => sum + (item.total || 0), 0)
    const totalIvaCalc = items.reduce((sum, item) => sum + ((item.total || 0) * (item.ivaItem / 100)), 0)

    const { data: gasto, error: errorGasto } = await supabase.from('api_finca_gasto').insert([{
      finca_id: parseInt(fincaId),
      factura_numero: factura,
      proveedor_id: proveedorId ? parseInt(proveedorId) : null,
      fecha: fecha,
      iva_porcentaje: ivaGlobal,
      total_bruto: totalBruto,
      total_iva: totalIvaCalc,
      total_neto: totalBruto + totalIvaCalc,
      pagado_por: pagadoPor,
      user_id: user
    }]).select()

    if (errorGasto) {
      alert('Error: ' + errorGasto.message)
      return
    }

    const gastoId = gasto[0].id

    const itemsInsert = items.map(item => {
  const tipoCosto = categorias.find(c => c.id === parseInt(item.categoriaId))
  return {
    gasto_id: gastoId,
    tipo_costo_id: tipoCosto ? tipoCosto.id : parseInt(item.categoriaId),  // ✅ BIEN
    producto_id: item.productoId ? parseInt(item.productoId) : null,
    descripcion: item.descripcion,
    cantidad: parseFloat(item.cantidad),
    unidad: 'unidad',
    precio_unitario: parseFloat(item.precioUnitario),
    total: item.total
  }
})

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
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">💰 Registrar Gasto</h2>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ENCABEZADO HORIZONTAL */}
        <div className="bg-white p-4 rounded-lg border-4 border-[#1F3D2B]">
          <div className="grid grid-cols-7 gap-3">
            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Finca *</label>
              <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="">Selecciona</option>
                {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Factura # *</label>
              <input type="text" value={factura} onChange={(e) => setFactura(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" placeholder="001-001-0001" required />
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Proveedor</label>
              <div className="flex gap-1">
                <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="flex-1 p-2 border-2 border-[#D8D2BE] rounded text-sm">
                  <option value="">Sin prov</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <button type="button" onClick={() => setShowModalProveedor(true)} className="bg-blue-600 text-white px-3 rounded font-bold text-sm">+</button>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required />
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Pagado Por *</label>
              <select value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="">Selecciona</option>
                <option value="Ganaderia OL">Ganaderia OL</option>
                <option value="Santiago">Santiago</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">IVA Global %</label>
              <input type="number" value={ivaGlobal} onChange={(e) => setIvaGlobal(parseFloat(e.target.value))} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" />
            </div>

            <div className="flex items-end">
              <button type="button" onClick={addItem} className="w-full bg-green-600 text-white px-3 py-2 rounded font-bold text-sm">➕ Item</button>
            </div>
          </div>
        </div>

        {/* TABLA ITEMS HORIZONTAL */}
        <div className="bg-white rounded-lg border-2 border-[#D8D2BE] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F5F2E6] border-b-2 border-[#1F3D2B]">
                <th className="p-2 text-left font-bold">Categoría</th>
                <th className="p-2 text-left font-bold">Producto</th>
                <th className="p-2 text-left font-bold">Descripción</th>
                <th className="p-2 text-center font-bold">Cantidad</th>
                <th className="p-2 text-center font-bold">Precio U</th>
                <th className="p-2 text-center font-bold">Total</th>
                <th className="p-2 text-center font-bold">IVA %</th>
                <th className="p-2 text-center font-bold">Total+IVA</th>
                <th className="p-2 text-center font-bold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-[#D8D2BE]">
                  <td className="p-2">
                    <select value={item.categoriaId} onChange={(e) => updateItem(item.id, 'categoriaId', e.target.value)} className="w-full p-1 border rounded text-xs" required>
                      <option value="">Selecciona</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <select value={item.productoId} onChange={(e) => updateItem(item.id, 'productoId', e.target.value)} className="flex-1 p-1 border rounded text-xs">
                        <option value="">Selecciona</option>
                        {item.categoriaNombre && productos.filter(p => p.categoria === item.categoriaNombre).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <button type="button" onClick={() => openCreateProductoModal(item.id, item.categoriaId, item.categoriaNombre)} disabled={!item.categoriaNombre} className="bg-blue-600 text-white px-2 rounded font-bold text-xs disabled:bg-gray-400">+</button>
                    </div>
                  </td>
                  <td className="p-2">
                    <input type="text" value={item.descripcion} onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)} className="w-full p-1 border rounded text-xs" />
                  </td>
                  <td className="p-2">
                    <input type="number" step="0.01" value={item.cantidad} onChange={(e) => updateItem(item.id, 'cantidad', e.target.value)} className="w-full p-1 border rounded text-xs text-center" required />
                  </td>
                  <td className="p-2">
                    <input type="number" step="0.01" value={item.precioUnitario} onChange={(e) => updateItem(item.id, 'precioUnitario', e.target.value)} className="w-full p-1 border rounded text-xs text-center" required />
                  </td>
                  <td className="p-2">
                    <input type="number" step="0.01" value={item.total} onChange={(e) => updateItem(item.id, 'total', e.target.value)} className="w-full p-1 border rounded text-xs text-center font-bold" />
                  </td>
                  <td className="p-2">
                    <input type="number" step="0.01" value={item.ivaItem} onChange={(e) => updateItem(item.id, 'ivaItem', e.target.value)} className="w-full p-1 border rounded text-xs text-center" />
                  </td>
                  <td className="p-2 text-center font-bold">
                    ${item.totalConIva.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 font-bold">❌</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL */}
        <div className="bg-[#F5F2E6] p-4 rounded-lg border-4 border-[#1F3D2B] text-right">
          <p className="text-2xl font-bold text-[#1F3D2B]">TOTAL: ${totalGasto.toFixed(2)}</p>
        </div>

        <button type="submit" className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg text-lg hover:bg-[#0F2116]">
          ✅ Guardar Gasto
        </button>
      </form>

      {/* MODAL PROVEEDOR */}
      {showModalProveedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg border-4 border-[#1F3D2B] w-80">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">➕ Crear Proveedor</h3>
            
            <input type="text" placeholder="Nombre" value={newProvNombre} onChange={(e) => setNewProvNombre(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-3" />
            <input type="text" placeholder="Contacto" value={newProvContacto} onChange={(e) => setNewProvContacto(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-3" />
            <input type="email" placeholder="Email" value={newProvEmail} onChange={(e) => setNewProvEmail(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-4" />

            <div className="flex gap-2">
              <button onClick={createProveedor} className="flex-1 bg-green-600 text-white font-bold py-2 rounded">✅ Crear</button>
              <button onClick={() => setShowModalProveedor(false)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded">❌ Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {showModalProducto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg border-4 border-[#1F3D2B] w-80">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">➕ Crear Producto</h3>
            
            <input type="text" placeholder="Nombre producto" value={newProdNombre} onChange={(e) => setNewProdNombre(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-3" />
            <input type="text" placeholder="Unidad (L, kg, etc)" value={newProdUnidad} onChange={(e) => setNewProdUnidad(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-3" />
            <input type="number" step="0.01" placeholder="Precio" value={newProdPrecio} onChange={(e) => setNewProdPrecio(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-4" />

            <p className="text-sm font-bold text-[#1F3D2B] mb-2">Categoría: <span className="text-blue-600">{newProdCategoria}</span></p>

            <div className="flex gap-2">
              <button onClick={createProducto} className="flex-1 bg-green-600 text-white font-bold py-2 rounded">✅ Crear</button>
              <button onClick={() => setShowModalProducto(false)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded">❌ Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}