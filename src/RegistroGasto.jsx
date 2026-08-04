import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function RegistroGasto() {
  const [fincas, setFincas] = useState([])
  const [tiposCosto, setTiposCosto] = useState([])
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [user, setUser] = useState(null)

  const [fincaId, setFincaId] = useState('')
  const [factura, setFactura] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')
  const [ivaPorc, setIvaPorc] = useState(19)
  
  const [items, setItems] = useState([])

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
      fetchTipos()
      fetchProductos()
      fetchProveedores()
    }
  }, [user])

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
  }

  const fetchTipos = async () => {
    const { data } = await supabase.from('api_tipo_costo').select('*')
    setTiposCosto(data || [])
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
    setItems([...items, { id: Date.now(), tipoCostoId: '', productoId: '', descripcion: '', cantidad: '', unidad: '', precioUnitario: '', total: 0 }])
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        if (field === 'cantidad' || field === 'precioUnitario') {
          const cant = parseFloat(updated.cantidad) || 0
          const precio = parseFloat(updated.precioUnitario) || 0
          updated.total = cant * precio
        }
        
        if (field === 'productoId' && value) {
          const prod = productos.find(p => p.id === parseInt(value))
          if (prod) {
            updated.precioUnitario = prod.precio_actual
            updated.unidad = prod.unidad
          }
        }
        
        return updated
      }
      return item
    }))
  }

  const totalBruto = items.reduce((sum, item) => sum + (item.total || 0), 0)
  const totalIva = totalBruto * (ivaPorc / 100)
  const totalNeto = totalBruto + totalIva

  const handleSave = async (e) => {
    e.preventDefault()

    if (!fincaId || !factura || !fecha || items.length === 0) {
      alert('Completa Finca, Factura, Fecha e Items')
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
      user_id: user
    }]).select()

    if (errorGasto) {
      alert('Error: ' + errorGasto.message)
      return
    }

    const gastoId = gasto[0].id

    const itemsInsert = items.map(item => ({
      gasto_id: gastoId,
      tipo_costo_id: parseInt(item.tipoCostoId),
      producto_id: item.productoId ? parseInt(item.productoId) : null,
      descripcion: item.descripcion,
      cantidad: parseFloat(item.cantidad),
      unidad: item.unidad,
      precio_unitario: parseFloat(item.precioUnitario),
      total: item.total
    }))

    const { error: errorItems } = await supabase.from('api_finca_gasto_item').insert(itemsInsert)

    if (errorItems) {
      alert('Error: ' + errorItems.message)
      return
    }

    alert('Gasto registrado exitosamente')
    setFactura('')
    setProveedorId('')
    setFecha('')
    setFincaId('')
    setItems([])
  }

  return (
    <div className="p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">💰 Registrar Gasto</h2>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Encabezado del Gasto</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-bold mb-2">Finca:</label>
              <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" required>
                <option value="">Selecciona Finca</option>
                {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-2">Factura #:</label>
              <input type="text" value={factura} onChange={(e) => setFactura(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" placeholder="Ej: 001-001-0000001" required />
            </div>

            <div>
              <label className="block font-bold mb-2">Proveedor (opcional):</label>
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg">
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-2">Fecha:</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" required />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-2">IVA %:</label>
            <input type="number" value={ivaPorc} onChange={(e) => setIvaPorc(parseFloat(e.target.value))} className="w-full p-3 border-2 border-[#D8D2BE] rounded-lg" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[#1F3D2B]">Items del Gasto</h3>
            <button type="button" onClick={addItem} className="bg-green-600 text-white px-4 py-2 rounded font-bold">➕ Agregar Item</button>
          </div>

          {items.length === 0 ? (
            <p className="text-[#6B5D45]">Sin items. Haz click en "Agregar Item"</p>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="border-2 border-[#D8D2BE] p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-sm font-bold">Tipo Costo:</label>
                      <select value={item.tipoCostoId} onChange={(e) => updateItem(item.id, 'tipoCostoId', e.target.value)} className="w-full p-2 border rounded" required>
                        <option value="">Selecciona</option>
                        {tiposCosto.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Producto:</label>
                      <select value={item.productoId} onChange={(e) => updateItem(item.id, 'productoId', e.target.value)} className="w-full p-2 border rounded">
                        <option value="">Sin producto</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-bold">Descripción:</label>
                      <input type="text" value={item.descripcion} onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm font-bold">Cantidad:</label>
                      <input type="number" step="0.01" value={item.cantidad} onChange={(e) => updateItem(item.id, 'cantidad', e.target.value)} className="w-full p-2 border rounded" required />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Unidad:</label>
                      <input type="text" value={item.unidad} onChange={(e) => updateItem(item.id, 'unidad', e.target.value)} className="w-full p-2 border rounded" />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Precio U:</label>
                      <input type="number" step="0.01" value={item.precioUnitario} onChange={(e) => updateItem(item.id, 'precioUnitario', e.target.value)} className="w-full p-2 border rounded" required />
                    </div>

                    <div>
                      <label className="text-sm font-bold">Total:</label>
                      <input type="number" value={item.total.toFixed(2)} className="w-full p-2 border rounded bg-gray-100" disabled />
                    </div>
                  </div>

                  <button type="button" onClick={() => removeItem(item.id)} className="mt-2 text-red-600 font-bold text-sm">❌ Eliminar</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#F5F2E6] p-6 rounded-lg border-4 border-[#1F3D2B]">
          <div className="grid grid-cols-3 gap-6 text-lg font-bold">
            <div>
              <p className="text-[#6B5D45]">Total Bruto:</p>
              <p className="text-[#1F3D2B] text-2xl">${totalBruto.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[#6B5D45]">IVA ({ivaPorc}%):</p>
              <p className="text-[#1F3D2B] text-2xl">${totalIva.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[#6B5D45]">Total Neto:</p>
              <p className="text-[#1F3D2B] text-2xl">${totalNeto.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-[#1F3D2B] text-white font-bold py-4 rounded-lg text-lg hover:bg-[#0F2116]">
          ✅ Guardar Gasto
        </button>
      </form>
    </div>
  )
}