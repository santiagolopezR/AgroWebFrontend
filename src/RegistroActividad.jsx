import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import * as XLSX from 'xlsx'

export default function RegistroActividad() {
  const [fincas, setFincas] = useState([])
  const [lotes, setLotes] = useState([])
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [tiposActividad, setTiposActividad] = useState([])
  const [costosFijos, setCostosFijos] = useState([])
  const [user, setUser] = useState(null)

  // FORM PRINCIPAL
  const [fincaId, setFincaId] = useState('')
  const [lotesSeleccionados, setLotesSeleccionados] = useState([])
  const [fecha, setFecha] = useState('')
  const [tipoActividadId, setTipoActividadId] = useState('')
  const [responsable, setResponsable] = useState('')
  
  // ITEMS PRODUCTOS
  const [items, setItems] = useState([])
  
  // JORNALES Y COMBUSTIBLE
  const [jornales, setJornales] = useState('')
  const [combustible, setCombustible] = useState('')
  
  // COSTOS ADICIONALES
  const [costosAdicionales, setCostosAdicionales] = useState([])
  
  // MODALES
  const [showModalProducto, setShowModalProducto] = useState(false)
  const [showModalImport, setShowModalImport] = useState(false)
  const [modalProductoItemId, setModalProductoItemId] = useState(null)
  const [newProdNombre, setNewProdNombre] = useState('')
  const [newProdUnidad, setNewProdUnidad] = useState('')
  const [newProdPrecio, setNewProdPrecio] = useState('')
  const [newProdCategoria, setNewProdCategoria] = useState('')
  
  // IMPORT
  const [importDatos, setImportDatos] = useState([])
  const [importPreview, setImportPreview] = useState(false)

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
      fetchTiposActividad()
      fetchCostosFijos()
    }
  }, [user])

  useEffect(() => {
    if (fincaId) {
      fetchLotes(fincaId)
    }
  }, [fincaId])

  // ==================== FETCHES ====================
  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', user)
    setFincas(data || [])
  }

  const fetchLotes = async (fincaId) => {
    const { data } = await supabase.from('api_lote').select('*').eq('finca_id', parseInt(fincaId))
    setLotes(data || [])
  }

  const fetchCategorias = async () => {
    const { data } = await supabase.from('api_categoria').select('*')
    setCategorias(data || [])
  }

  const fetchProductos = async () => {
    const { data } = await supabase.from('api_producto').select('*').eq('user_id', user)
    setProductos(data || [])
  }

  const fetchTiposActividad = async () => {
    const { data } = await supabase.from('api_tipoactividad').select('*')
    setTiposActividad(data || [])
  }

  const fetchCostosFijos = async () => {
    const { data } = await supabase.from('api_costo_fijo').select('*').eq('user_id', user).eq('activo', true)
    setCostosFijos(data || [])
  }

  // ==================== ITEMS PRODUCTOS ====================
  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      categoriaId: '',
      categoriaNombre: '',
      productoId: '',
      productoNombre: '',
      descripcion: '',
      cantidad: '',
      precioUnitario: '',
      total: 0,
      dosisHa: 0
    }])
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }

        // Si cambia categoría
        if (field === 'categoriaId') {
          const cat = categorias.find(c => c.id === parseInt(value))
          updated.categoriaNombre = cat ? cat.nombre : ''
        }

        // Si selecciona producto
        if (field === 'productoId' && value) {
          const prod = productos.find(p => p.id === parseInt(value))
          if (prod) {
            updated.productoNombre = prod.nombre
            updated.precioUnitario = prod.precio_actual
          }
        }

        // Calcular TOTAL y DOSIS/ha
        if (field === 'cantidad' || field === 'precioUnitario') {
          const cant = parseFloat(updated.cantidad) || 0
          const precio = parseFloat(updated.precioUnitario) || 0
          updated.total = cant * precio

          // Calcular dosis/ha usando lotes seleccionados
          if (lotesSeleccionados.length > 0) {
            const lotesSelec = lotes.filter(l => lotesSeleccionados.includes(l.id))
            const totalHa = lotesSelec.reduce((sum, l) => sum + (l.area_hectareas || 0), 0) || 1
            updated.dosisHa = (cant / totalHa).toFixed(2)
          }
        }

        return updated
      }
      return item
    }))
  }

  const openCreateProductoModal = (itemId, catNombre) => {
    setModalProductoItemId(itemId)
    setNewProdCategoria(catNombre)
    setShowModalProducto(true)
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

    setNewProdNombre('')
    setNewProdUnidad('')
    setNewProdPrecio('')
    setNewProdCategoria('')
    setShowModalProducto(false)

    fetchProductos()
  }

  // ==================== COSTOS ADICIONALES ====================
  const addCostoAdicional = () => {
    setCostosAdicionales([...costosAdicionales, {
      id: Date.now(),
      costo_fijo_id: '',
      costo_fijo_nombre: '',
      costo_fijo_unidad: '',
      cantidad: '',
      valor_unitario: 0,
      valor_total: 0
    }])
  }

  const removeCostoAdicional = (id) => {
    setCostosAdicionales(costosAdicionales.filter(c => c.id !== id))
  }

  const updateCostoAdicional = (id, field, value) => {
    setCostosAdicionales(costosAdicionales.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value }

        // Si selecciona un costo fijo
        if (field === 'costo_fijo_id' && value) {
          const cf = costosFijos.find(x => x.id === parseInt(value))
          updated.costo_fijo_nombre = cf?.nombre
          updated.costo_fijo_unidad = cf?.unidad
          updated.valor_unitario = cf?.valor_unitario
        }

        // Calcula total
        if (field === 'cantidad' || field === 'costo_fijo_id') {
          updated.valor_total = updated.valor_unitario * (parseFloat(updated.cantidad) || 0)
        }

        return updated
      }
      return c
    }))
  }

  // ==================== IMPORT ====================
  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const wb = XLSX.read(event.target.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const datos = XLSX.utils.sheet_to_json(ws)
          setImportDatos(datos)
          setImportPreview(true)
        } catch (error) {
          alert('Error al leer el archivo: ' + error.message)
        }
      }
      reader.readAsBinaryString(file)
    }
  }

  // ==================== GUARDAR ACTIVIDAD ====================
  const handleSave = async (e) => {
    e.preventDefault()

    if (!fincaId || !fecha || lotesSeleccionados.length === 0 || !tipoActividadId || items.length === 0) {
      alert('Completa: Finca, Fecha, Lotes, Tipo Actividad e Items')
      return
    }

    try {
      // Obtener costos fijos por nombre
      const costoJornal = costosFijos.find(c => c.nombre.toLowerCase() === 'jornal')
      const costoCombustibleCosto = costosFijos.find(c => c.nombre.toLowerCase() === 'combustible')

      const totalJornales = (parseFloat(jornales) || 0) * (costoJornal?.valor_unitario || 0)
      const totalCombustible = (parseFloat(combustible) || 0) * (costoCombustibleCosto?.valor_unitario || 0)
      const totalProductos = items.reduce((sum, item) => sum + (item.total || 0), 0)
      const totalAdicionales = costosAdicionales.reduce((sum, c) => sum + c.valor_total, 0)

      const costoTotal = totalProductos + totalJornales + totalCombustible + totalAdicionales

      // Crear actividad
      const { data: actividades, error: errorActividad } = await supabase
        .from('api_actividad')
        .insert([{
          finca_id: parseInt(fincaId),
          fecha: fecha,
          tipo_id: parseInt(tipoActividadId),
          responsable: responsable,
          jornales_cantidad: parseFloat(jornales) || 0,
          costo_total: costoTotal,
          detalle_costos: {
            productos: totalProductos,
            jornales: totalJornales,
            combustible: totalCombustible,
            adicionales: totalAdicionales
          },
          user_id: user
        }])
        .select()

      if (errorActividad) throw errorActividad

      const actividadId = actividades[0].id

      // Guardar items de productos
      for (const item of items) {
        const { error: errorItem } = await supabase.from('api_actividad_producto').insert([{
          actividad_id: actividadId,
          producto_id: item.productoId ? parseInt(item.productoId) : null,
          cantidad: parseFloat(item.cantidad),
          dosis_por_hectarea: parseFloat(item.dosisHa),
          precio_unitario: parseFloat(item.precioUnitario),
          total: item.total
        }])
        if (errorItem) console.error('No se pudo guardar un item de producto de la actividad')
      }

      // Guardar costos adicionales
      for (const costo of costosAdicionales) {
        const { error: errorCosto } = await supabase.from('api_costo_adicional').insert([{
          actividad_id: actividadId,
          costo_fijo_id: parseInt(costo.costo_fijo_id),
          cantidad: parseFloat(costo.cantidad),
          valor_total: costo.valor_total,
          user_id: user
        }])
        if (errorCosto) console.error('No se pudo guardar un costo adicional de la actividad')
      }

      // Guardar vinculación lotes-actividad
      for (const loteId of lotesSeleccionados) {
        const { error: errorLote } = await supabase.from('api_actividad_lote').insert([{
          actividad_id: actividadId,
          lote_id: parseInt(loteId)
        }])
        if (errorLote) console.error('No se pudo vincular un lote a la actividad')
      }

      alert('✅ Actividad registrada exitosamente')
      
      // Limpiar
      setFincaId('')
      setLotesSeleccionados([])
      setFecha('')
      setTipoActividadId('')
      setResponsable('')
      setItems([])
      setJornales('')
      setCombustible('')
      setCostosAdicionales([])
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="p-8 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#1F3D2B]">📊 Registro de Actividad</h2>
        <button onClick={() => setShowModalImport(true)} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">📊 Importar Excel</button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ENCABEZADO */}
        <div className="bg-white p-4 rounded-lg border-4 border-[#1F3D2B]">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Finca *</label>
              <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="">Selecciona</option>
                {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required />
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Tipo Actividad *</label>
              <select value={tipoActividadId} onChange={(e) => setTipoActividadId(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" required>
                <option value="">Selecciona</option>
                {tiposActividad.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#1F3D2B]">Responsable</label>
              <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm" placeholder="Nombre" />
            </div>
          </div>

          {/* LOTES MÚLTIPLES - SELECT ELEGANTE */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-[#1F3D2B]">Lotes * (Selecciona múltiples)</label>
              {lotesSeleccionados.length > 0 && (
                <span className="text-xs font-bold bg-green-600 text-white px-3 py-1 rounded">
                  ✅ {lotesSeleccionados.length} lote(s) | {(() => {
                    const totalHa = lotes.filter(l => lotesSeleccionados.includes(l.id)).reduce((sum, l) => sum + (l.area_hectareas || 0), 0)
                    return `${totalHa} ha`
                  })()}
                </span>
              )}
            </div>

            {/* SELECT MULTIPLE */}
            <select 
              multiple 
              value={lotesSeleccionados.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                setLotesSeleccionados(selected)
              }}
              className="w-full p-3 border-2 border-[#D8D2BE] rounded text-sm bg-white max-h-48"
            >
              {lotes.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.area_hectareas} ha)
                </option>
              ))}
            </select>

            <p className="text-xs text-[#6B5D45] mt-2">💡 Ctrl+Click (Windows) o Cmd+Click (Mac) para seleccionar múltiples</p>

            {/* LOTES SELECCIONADOS - CHIPS */}
            {lotesSeleccionados.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {lotesSeleccionados.map(loteId => {
                  const lote = lotes.find(l => l.id === loteId)
                  return (
                    <div key={lote.id} className="flex items-center gap-1 bg-green-100 border-2 border-green-500 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      <span>{lote.nombre} ({lote.area_hectareas}ha)</span>
                      <button
                        type="button"
                        onClick={() => setLotesSeleccionados(lotesSeleccionados.filter(id => id !== lote.id))}
                        className="ml-1 text-green-600 hover:text-red-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* PRODUCTOS */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-[#1F3D2B]">Productos Aplicados</h3>
            <button type="button" onClick={addItem} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm">➕ Item</button>
          </div>
          
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
                  <th className="p-2 text-center font-bold">Dosis/ha</th>
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
                          {item.categoriaNombre && productos.filter(p => p.categoria?.toLowerCase().trim() === item.categoriaNombre?.toLowerCase().trim()).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <button type="button" onClick={() => openCreateProductoModal(item.id, item.categoriaNombre)} disabled={!item.categoriaNombre} className="bg-blue-600 text-white px-2 rounded font-bold text-xs disabled:bg-gray-400">+</button>
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
                    <td className="p-2 text-center font-bold text-sm">
                      ${item.total.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-bold text-sm bg-[#F5F2E6]">
                      {item.dosisHa}
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 font-bold">❌</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* JORNALES Y COMBUSTIBLE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
            <h4 className="font-bold text-[#1F3D2B] mb-3">👷 Jornales</h4>
            <input type="number" step="0.01" value={jornales} onChange={(e) => setJornales(e.target.value)} placeholder="# jornales" className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm mb-2" />
            {costosFijos.find(c => c.nombre.toLowerCase() === 'jornal') && (
              <div className="text-sm">
                <p className="bg-[#F5F2E6] p-2 rounded font-bold">
                  <span>Total:</span> ${((parseFloat(jornales) || 0) * (costosFijos.find(c => c.nombre.toLowerCase() === 'jornal')?.valor_unitario || 0)).toLocaleString()}
                </p>
              </div>
            )}
            {!costosFijos.find(c => c.nombre.toLowerCase() === 'jornal') && (
              <p className="text-xs text-red-600">⚠️ Define "Jornal" en Costos Fijos</p>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
            <h4 className="font-bold text-[#1F3D2B] mb-3">⛽ Combustible</h4>
            <input type="number" step="0.01" value={combustible} onChange={(e) => setCombustible(e.target.value)} placeholder="Litros" className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm mb-2" />
            {costosFijos.find(c => c.nombre.toLowerCase() === 'combustible') && (
              <div className="text-sm">
                <p className="bg-[#F5F2E6] p-2 rounded font-bold">
                  <span>Total:</span> ${((parseFloat(combustible) || 0) * (costosFijos.find(c => c.nombre.toLowerCase() === 'combustible')?.valor_unitario || 0)).toLocaleString()}
                </p>
              </div>
            )}
            {!costosFijos.find(c => c.nombre.toLowerCase() === 'combustible') && (
              <p className="text-xs text-red-600">⚠️ Define "Combustible" en Costos Fijos</p>
            )}
          </div>
        </div>

        {/* COSTOS ADICIONALES */}
        <div className="bg-white p-4 rounded-lg border-2 border-[#D8D2BE]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-[#1F3D2B]">💰 Costos Adicionales</h4>
            <button type="button" onClick={addCostoAdicional} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">+ Agregar</button>
          </div>

          <div className="space-y-3">
            {costosAdicionales.map(costo => (
              <div key={costo.id} className="p-3 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE]">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <select 
                    value={costo.costo_fijo_id} 
                    onChange={(e) => updateCostoAdicional(costo.id, 'costo_fijo_id', e.target.value)} 
                    className="col-span-2 p-2 border-2 border-[#D8D2BE] rounded text-sm"
                  >
                    <option value="">Selecciona costo</option>
                    {costosFijos.filter(c => c.nombre.toLowerCase() !== 'jornal' && c.nombre.toLowerCase() !== 'combustible').map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (${c.valor_unitario}{c.unidad})</option>
                    ))}
                  </select>
                  
                  <input 
                    type="number" 
                    step="0.01" 
                    value={costo.cantidad} 
                    onChange={(e) => updateCostoAdicional(costo.id, 'cantidad', e.target.value)} 
                    placeholder="Cantidad" 
                    className="p-2 border-2 border-[#D8D2BE] rounded text-sm" 
                  />
                  
                  <button type="button" onClick={() => removeCostoAdicional(costo.id)} className="text-red-600 font-bold text-lg">🗑️</button>
                </div>
                
                <p className="font-bold text-sm">Total: ${costo.valor_total.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {costosAdicionales.length > 0 && (
            <p className="mt-3 font-bold text-lg">
              Total Adicionales: ${costosAdicionales.reduce((sum, c) => sum + c.valor_total, 0).toLocaleString()}
            </p>
          )}
        </div>

        {/* RESUMEN */}
        <div className="bg-[#F5F2E6] p-4 rounded-lg border-4 border-[#1F3D2B]">
          <h4 className="font-bold text-[#1F3D2B] mb-3">RESUMEN DE COSTOS</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-bold">Productos:</span> ${items.reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString()}</p>
              <p><span className="font-bold">Jornales:</span> ${((parseFloat(jornales) || 0) * (costosFijos.find(c => c.nombre.toLowerCase() === 'jornal')?.valor_unitario || 0)).toLocaleString()}</p>
            </div>
            <div>
              <p><span className="font-bold">Combustible:</span> ${((parseFloat(combustible) || 0) * (costosFijos.find(c => c.nombre.toLowerCase() === 'combustible')?.valor_unitario || 0)).toLocaleString()}</p>
              <p><span className="font-bold">Adicionales:</span> ${costosAdicionales.reduce((sum, c) => sum + c.valor_total, 0).toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-3 font-bold text-lg text-[#1F3D2B]">
            TOTAL ACTIVIDAD: ${(
              items.reduce((sum, i) => sum + (i.total || 0), 0) +
              ((parseFloat(jornales) || 0) * (costosFijos.find(c => c.nombre.toLowerCase() === 'jornal')?.valor_unitario || 0)) +
              ((parseFloat(combustible) || 0) * (costosFijos.find(c => c.nombre.toLowerCase() === 'combustible')?.valor_unitario || 0)) +
              costosAdicionales.reduce((sum, c) => sum + c.valor_total, 0)
            ).toLocaleString()}
          </p>
        </div>

        <button type="submit" className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg text-lg hover:bg-[#0F2116]">
          ✅ Guardar Actividad
        </button>
      </form>

      {/* MODAL CREAR PRODUCTO */}
      {showModalProducto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg border-4 border-[#1F3D2B] w-80">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">➕ Crear Producto</h3>

            <input type="text" placeholder="Nombre producto" value={newProdNombre} onChange={(e) => setNewProdNombre(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-3" />
            <input type="text" placeholder="Unidad (L, kg, etc)" value={newProdUnidad} onChange={(e) => setNewProdUnidad(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-3" />
            <input type="number" step="0.01" placeholder="Precio" value={newProdPrecio} onChange={(e) => setNewProdPrecio(e.target.value)} className="w-full p-2 border-2 border-[#D8D2BE] rounded mb-4" />

            <p className="text-sm font-bold text-[#1F3D2B] mb-2">Categoría: <span className="text-blue-600">{newProdCategoria}</span></p>

            <div className="flex gap-2">
              <button type="button" onClick={createProducto} className="flex-1 bg-green-600 text-white font-bold py-2 rounded">✅ Crear</button>
              <button type="button" onClick={() => setShowModalProducto(false)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded">❌ Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT */}
      {showModalImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg border-4 border-[#1F3D2B] w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📊 Importar Excel</h3>

            {!importPreview ? (
              <div>
                <p className="mb-4 text-sm text-[#6B5D45]">Selecciona archivo Excel</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportFile}
                  className="w-full p-3 border-2 border-[#D8D2BE] rounded bg-[#F5F2E6]"
                />
              </div>
            ) : (
              <div>
                <table className="w-full text-xs border-collapse mb-4">
                  <thead>
                    <tr className="bg-[#F5F2E6]">
                      {importDatos.length > 0 && Object.keys(importDatos[0]).map(key => (
                        <th key={key} className="border p-1 text-left font-bold">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importDatos.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="border p-1 text-xs">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              {importPreview && (
                <button type="button" onClick={() => { setImportPreview(false); setImportDatos([]); }} className="flex-1 bg-gray-600 text-white font-bold py-2 rounded">← Volver</button>
              )}
              <button type="button" onClick={() => setShowModalImport(false)} className="flex-1 bg-red-600 text-white font-bold py-2 rounded">❌ Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
