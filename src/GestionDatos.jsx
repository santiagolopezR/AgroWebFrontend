import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { parseGeorreferencia, esErrorColumnaInexistente, GEO_FORMATO_AYUDA } from './lib/geoLote'

export default function GestionDatos() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('fincas')
  
  // FINCAS
  const [fincas, setFincas] = useState([])
  const [newFinca, setNewFinca] = useState('')
  
  // LOTES
  const [lotes, setLotes] = useState([])
  const [newLote, setNewLote] = useState({ nombre: '', finca_id: '', area_hectareas: '', georreferenciacion: '' })
  const [lotesFincaId, setLotesFincaId] = useState('')
  
  // CULTIVOS
  const [cultivos, setCultivos] = useState([])
  const [newCultivo, setNewCultivo] = useState('')
  
  // PROVEEDORES
  const [proveedores, setProveedores] = useState([])
  const [newProveedor, setNewProveedor] = useState({ nombre: '', contacto: '', email: '' })
  
  // CATEGORÍAS
  const [categorias, setCategorias] = useState([])
  const [newCategoria, setNewCategoria] = useState('')
  
  // COSTOS FIJOS DINÁMICOS
  const [costosFijos, setCostosFijos] = useState([])
  const [newCostoFijo, setNewCostoFijo] = useState({ nombre: '', valor_unitario: '', unidad: '' })
  
  // PRÉSTAMOS
  const [prestamos, setPrestamos] = useState([])
  const [newPrestamo, setNewPrestamo] = useState({ 
    nombre_trabajador: '', 
    monto_prestado: '', 
    fecha_prestamo: '',
    quien_otorgo: 'Ganaderia OL',
    descripcion: ''
  })
  const [selectedPrestamo, setSelectedPrestamo] = useState(null)
  const [newAbono, setNewAbono] = useState({ 
    monto_abono: '', 
    fecha_abono: '',
    quien_descunto: 'Ganaderia OL',
    observaciones: ''
  })
  
  // BALANCE PRÉSTAMOS
  const [balancePrestamos, setBalancePrestamos] = useState(null)

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
      fetchCultivos()
      fetchProveedores()
      fetchCategorias()
      fetchCostosFijos()
      fetchPrestamos()
    }
  }, [user])

  // ==================== FINCAS ====================
  const fetchFincas = async () => {
    const { data, error } = await supabase.from('api_finca').select('*').eq('user_id', user)
    if (error) console.error('No se pudieron cargar las fincas')
    setFincas(data || [])
  }

  const createFinca = async () => {
    if (!newFinca) return
    const { error } = await supabase.from('api_finca').insert([{ nombre: newFinca, ubicacion: '', user_id: user }])
    if (error) {
      alert('No se pudo crear la finca: ' + error.message)
      return
    }
    setNewFinca('')
    fetchFincas()
  }

  const deleteFinca = async (id) => {
    await supabase.from('api_finca').delete().eq('id', id)
    fetchFincas()
  }

  // ==================== LOTES ====================
  const fetchLotes = async (fincaId) => {
    const { data } = await supabase.from('api_lote').select('*').eq('finca_id', fincaId)
    setLotes(data || [])
  }

  const createLote = async () => {
    if (!newLote.nombre || !lotesFincaId || !newLote.area_hectareas) return

    const geo = parseGeorreferencia(newLote.georreferenciacion)
    if (geo?.error) {
      alert('Formato de georreferenciación inválido. ' + GEO_FORMATO_AYUDA)
      return
    }

    const payload = {
      nombre: newLote.nombre,
      finca_id: parseInt(lotesFincaId),
      area_hectareas: parseFloat(newLote.area_hectareas),
      user_id: user,
      ...(geo && !geo.error ? geo : {})
    }

    let { error } = await supabase.from('api_lote').insert([payload])
    let geoDescartada = false

    if (error && esErrorColumnaInexistente(error)) {
      const { latitud: _lat, longitud: _lng, poligono: _pol, ...sinGeo } = payload
      const reintento = await supabase.from('api_lote').insert([sinGeo])
      error = reintento.error
      geoDescartada = true
    }

    if (error) {
      alert('No se pudo crear el lote: ' + error.message)
      return
    }

    if (geoDescartada && geo) {
      alert('Lote creado, pero la georreferenciación no se guardó: falta la columna en la base de datos')
    }

    setNewLote({ nombre: '', finca_id: '', area_hectareas: '', georreferenciacion: '' })
    fetchLotes(lotesFincaId)
  }

  const deleteLote = async (id) => {
    await supabase.from('api_lote').delete().eq('id', id)
    fetchLotes(lotesFincaId)
  }

  // ==================== CULTIVOS ====================
  const fetchCultivos = async () => {
    const { data } = await supabase.from('api_cultivocatalogo').select('*')
    setCultivos(data || [])
  }

  const createCultivo = async () => {
    if (!newCultivo) return
    await supabase.from('api_cultivocatalogo').insert([{ nombre: newCultivo }])
    setNewCultivo('')
    fetchCultivos()
  }

  const deleteCultivo = async (id) => {
    await supabase.from('api_cultivocatalogo').delete().eq('id', id)
    fetchCultivos()
  }

  // ==================== PROVEEDORES ====================
  const fetchProveedores = async () => {
    const { data } = await supabase.from('api_proveedor').select('*').eq('user_id', user)
    setProveedores(data || [])
  }

  const createProveedor = async () => {
    if (!newProveedor.nombre) return
    const { error } = await supabase.from('api_proveedor').insert([{
      nombre: newProveedor.nombre,
      contacto: newProveedor.contacto,
      email: newProveedor.email,
      user_id: user
    }])
    if (error) {
      alert('No se pudo crear el proveedor: ' + error.message)
      return
    }
    setNewProveedor({ nombre: '', contacto: '', email: '' })
    fetchProveedores()
  }

  const deleteProveedor = async (id) => {
    await supabase.from('api_proveedor').delete().eq('id', id)
    fetchProveedores()
  }

  // ==================== CATEGORÍAS ====================
  const fetchCategorias = async () => {
    const { data } = await supabase.from('api_categoria').select('*')
    setCategorias(data || [])
  }

  const createCategoria = async () => {
    if (!newCategoria) return
    const { error } = await supabase.from('api_categoria').insert([{ nombre: newCategoria, user_id: user }])
    if (error) {
      alert('No se pudo crear la categoría: ' + error.message)
      return
    }
    setNewCategoria('')
    fetchCategorias()
  }

  const deleteCategoria = async (id) => {
    await supabase.from('api_categoria').delete().eq('id', id)
    fetchCategorias()
  }

  // ==================== COSTOS FIJOS DINÁMICOS ====================
  const fetchCostosFijos = async () => {
    const { data } = await supabase.from('api_costo_fijo').select('*').eq('user_id', user).eq('activo', true)
    setCostosFijos(data || [])
  }

  const createCostoFijo = async () => {
    if (!newCostoFijo.nombre || !newCostoFijo.valor_unitario) return

    const { error } = await supabase.from('api_costo_fijo').insert([{
      nombre: newCostoFijo.nombre,
      valor_unitario: parseFloat(newCostoFijo.valor_unitario),
      unidad: newCostoFijo.unidad,
      user_id: user
    }])
    if (error) {
      alert('No se pudo crear el costo fijo: ' + error.message)
      return
    }

    setNewCostoFijo({ nombre: '', valor_unitario: '', unidad: '' })
    fetchCostosFijos()
  }

  const deleteCostoFijo = async (id) => {
    await supabase.from('api_costo_fijo').delete().eq('id', id)
    fetchCostosFijos()
  }

  // ==================== PRÉSTAMOS ====================
  const fetchPrestamos = async () => {
    const { data } = await supabase.from('api_prestamo_trabajador').select('*, api_abono_prestamo(*)').eq('user_id', user)
    setPrestamos(data || [])
    fetchBalancePrestamos()
  }

  const createPrestamo = async () => {
    if (!newPrestamo.nombre_trabajador || !newPrestamo.monto_prestado) return

    const { error } = await supabase.from('api_prestamo_trabajador').insert([{
      nombre_trabajador: newPrestamo.nombre_trabajador,
      monto_prestado: parseFloat(newPrestamo.monto_prestado),
      fecha_prestamo: newPrestamo.fecha_prestamo,
      saldo_pendiente: parseFloat(newPrestamo.monto_prestado),
      quien_otorgo: newPrestamo.quien_otorgo,
      descripcion: newPrestamo.descripcion,
      user_id: user
    }])
    if (error) {
      alert('No se pudo registrar el préstamo: ' + error.message)
      return
    }

    setNewPrestamo({
      nombre_trabajador: '', 
      monto_prestado: '', 
      fecha_prestamo: '',
      quien_otorgo: 'Ganaderia OL',
      descripcion: ''
    })
    fetchPrestamos()
  }

  const deletePrestamo = async (id) => {
    await supabase.from('api_prestamo_trabajador').delete().eq('id', id)
    fetchPrestamos()
  }

  const addAbono = async (prestamoId) => {
    if (!newAbono.monto_abono || !newAbono.fecha_abono) return
    
    const prestamo = prestamos.find(p => p.id === prestamoId)
    const montoAbono = parseFloat(newAbono.monto_abono)
    
    if (montoAbono > prestamo.saldo_pendiente) {
      alert(`No puedes abonar más del saldo: $${prestamo.saldo_pendiente}`)
      return
    }
    
    await supabase.from('api_abono_prestamo').insert([{
      prestamo_id: prestamoId,
      monto_abono: montoAbono,
      fecha_abono: newAbono.fecha_abono,
      quien_descunto: newAbono.quien_descunto,
      observaciones: newAbono.observaciones,
      user_id: user
    }])
    
    const nuevoSaldo = prestamo.saldo_pendiente - montoAbono
    const nuevoEstado = nuevoSaldo === 0 ? 'pagado' : 'activo'
    
    await supabase.from('api_prestamo_trabajador').update({
      saldo_pendiente: nuevoSaldo,
      estado: nuevoEstado
    }).eq('id', prestamoId)
    
    setNewAbono({ monto_abono: '', fecha_abono: '', quien_descunto: 'Ganaderia OL', observaciones: '' })
    setSelectedPrestamo(null)
    fetchPrestamos()
  }

  const fetchBalancePrestamos = async () => {
    const { data } = await supabase.from('api_prestamo_trabajador').select('*').eq('user_id', user)
    
    const balance = {
      ganaderia_ol: 0,
      santiago: 0,
      detalles: { ganaderia_ol: [], santiago: [] }
    }
    
    data?.forEach(p => {
      if (p.quien_otorgo === 'Ganaderia OL') {
        balance.ganaderia_ol += p.saldo_pendiente
        balance.detalles.ganaderia_ol.push(p)
      } else {
        balance.santiago += p.saldo_pendiente
        balance.detalles.santiago.push(p)
      }
    })
    
    setBalancePrestamos(balance)
  }

  return (
    <div className="p-8 max-w-full">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-6">📋 Gestión de Datos</h2>

      {/* TABS */}
      <div className="flex gap-2 mb-6 overflow-x-auto flex-wrap">
        {[
          { id: 'fincas', label: '🏠 Fincas' },
          { id: 'lotes', label: '📍 Lotes' },
          { id: 'cultivos', label: '🌾 Cultivos' },
          { id: 'proveedores', label: '🚚 Proveedores' },
          { id: 'categorias', label: '🏷️ Categorías' },
          { id: 'costos-fijos', label: '💰 Costos Fijos' },
          { id: 'prestamos', label: '💵 Préstamos' },
          { id: 'balance-prestamos', label: '📊 Balance' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-[#1F3D2B] text-white' 
                : 'bg-[#D8D2BE] text-[#1F3D2B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== FINCAS ==================== */}
      {activeTab === 'fincas' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Fincas</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newFinca}
              onChange={(e) => setNewFinca(e.target.value)}
              placeholder="Nombre de finca"
              className="flex-1 p-2 border-2 border-[#D8D2BE] rounded text-sm"
            />
            <button onClick={createFinca} className="bg-green-600 text-white px-4 py-2 rounded font-bold">➕</button>
          </div>
          <div className="space-y-2">
            {fincas.map(f => (
              <div key={f.id} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded">
                <p className="font-bold">{f.nombre}</p>
                <button onClick={() => deleteFinca(f.id)} className="text-red-600 font-bold">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== LOTES ==================== */}
      {activeTab === 'lotes' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Lotes</h3>
          
          <div className="mb-4">
            <label className="text-sm font-bold text-[#1F3D2B]">Selecciona Finca</label>
            <select 
              value={lotesFincaId} 
              onChange={(e) => {
                setLotesFincaId(e.target.value)
                if (e.target.value) fetchLotes(e.target.value)
              }}
              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm mt-2"
            >
              <option value="">Selecciona...</option>
              {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>

          {lotesFincaId && (
            <>
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={newLote.nombre}
                  onChange={(e) => setNewLote({ ...newLote, nombre: e.target.value })}
                  placeholder="Nombre lote"
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newLote.area_hectareas}
                  onChange={(e) => setNewLote({ ...newLote, area_hectareas: e.target.value })}
                  placeholder="Área (hectáreas)"
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                <input
                  type="text"
                  value={newLote.georreferenciacion}
                  onChange={(e) => setNewLote({ ...newLote, georreferenciacion: e.target.value })}
                  placeholder="Georreferenciación (opcional): lat,lng o lat1,lng1;lat2,lng2;lat3,lng3"
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                <p className="text-xs text-[#6B5D45]">{GEO_FORMATO_AYUDA}</p>
                <button onClick={createLote} className="w-full bg-green-600 text-white px-4 py-2 rounded font-bold">➕ Agregar Lote</button>
              </div>

              <div className="space-y-2">
                {lotes.map(l => (
                  <div key={l.id} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded">
                    <div>
                      <p className="font-bold">{l.nombre}</p>
                      <p className="text-xs text-[#6B5D45]">
                        {l.area_hectareas} ha
                        {(l.poligono || (l.latitud !== undefined && l.latitud !== null)) && ' · 📍 Georreferenciado'}
                      </p>
                    </div>
                    <button onClick={() => deleteLote(l.id)} className="text-red-600 font-bold">🗑️</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== CULTIVOS ==================== */}
      {activeTab === 'cultivos' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Cultivos</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCultivo}
              onChange={(e) => setNewCultivo(e.target.value)}
              placeholder="Nombre cultivo"
              className="flex-1 p-2 border-2 border-[#D8D2BE] rounded text-sm"
            />
            <button onClick={createCultivo} className="bg-green-600 text-white px-4 py-2 rounded font-bold">➕</button>
          </div>
          <div className="space-y-2">
            {cultivos.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded">
                <p className="font-bold">{c.nombre}</p>
                <button onClick={() => deleteCultivo(c.id)} className="text-red-600 font-bold">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== PROVEEDORES ==================== */}
      {activeTab === 'proveedores' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Proveedores</h3>
          <div className="space-y-2 mb-4">
            <input
              type="text"
              value={newProveedor.nombre}
              onChange={(e) => setNewProveedor({ ...newProveedor, nombre: e.target.value })}
              placeholder="Nombre"
              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
            />
            <input
              type="text"
              value={newProveedor.contacto}
              onChange={(e) => setNewProveedor({ ...newProveedor, contacto: e.target.value })}
              placeholder="Contacto"
              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
            />
            <input
              type="email"
              value={newProveedor.email}
              onChange={(e) => setNewProveedor({ ...newProveedor, email: e.target.value })}
              placeholder="Email"
              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
            />
            <button onClick={createProveedor} className="w-full bg-green-600 text-white px-4 py-2 rounded font-bold">➕ Agregar</button>
          </div>
          <div className="space-y-2">
            {proveedores.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded">
                <div>
                  <p className="font-bold">{p.nombre}</p>
                  <p className="text-xs text-[#6B5D45]">{p.email}</p>
                </div>
                <button onClick={() => deleteProveedor(p.id)} className="text-red-600 font-bold">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== CATEGORÍAS ==================== */}
      {activeTab === 'categorias' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">🏷️ Categorías</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategoria}
              onChange={(e) => setNewCategoria(e.target.value)}
              placeholder="Nueva categoría"
              className="flex-1 p-2 border-2 border-[#D8D2BE] rounded text-sm"
            />
            <button onClick={createCategoria} className="bg-green-600 text-white px-4 py-2 rounded font-bold">➕</button>
          </div>
          <div className="space-y-2">
            {categorias.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded">
                <div>
                  <p className="font-bold">{c.nombre}</p>
                  <p className="text-xs text-[#6B5D45]">{c.user_id ? '👤 Personal' : '🌍 Predeterminada'}</p>
                </div>
                {c.user_id && <button onClick={() => deleteCategoria(c.id)} className="text-red-600 font-bold">🗑️</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== COSTOS FIJOS DINÁMICOS ==================== */}
      {activeTab === 'costos-fijos' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">💰 Costos Fijos Unitarios</h3>
          
          <div className="mb-6 p-4 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE]">
            <h4 className="font-bold text-[#1F3D2B] mb-3">Agregar Nuevo Costo</h4>
            
            <div className="space-y-2">
              <input
                type="text"
                value={newCostoFijo.nombre}
                onChange={(e) => setNewCostoFijo({ ...newCostoFijo, nombre: e.target.value })}
                placeholder="Nombre (ej: Jornal, Combustible, Drone, Transporte)"
                className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
              />
              
              <input
                type="number"
                step="0.01"
                value={newCostoFijo.valor_unitario}
                onChange={(e) => setNewCostoFijo({ ...newCostoFijo, valor_unitario: e.target.value })}
                placeholder="Valor unitario"
                className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
              />
              
              <input
                type="text"
                value={newCostoFijo.unidad}
                onChange={(e) => setNewCostoFijo({ ...newCostoFijo, unidad: e.target.value })}
                placeholder="Unidad (ej: /jornal, /litro, /ha, /km)"
                className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
              />
              
              <button 
                onClick={createCostoFijo}
                className="w-full bg-green-600 text-white px-4 py-2 rounded font-bold"
              >
                ➕ Agregar Costo
              </button>
            </div>
          </div>

          <h4 className="font-bold text-[#1F3D2B] mb-3">Costos Registrados</h4>
          <div className="space-y-2">
            {costosFijos.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE]">
                <div>
                  <p className="font-bold text-[#1F3D2B]">{c.nombre}</p>
                  <p className="text-sm text-[#6B5D45]">${c.valor_unitario.toLocaleString()} {c.unidad}</p>
                </div>
                <button onClick={() => deleteCostoFijo(c.id)} className="text-red-600 font-bold">🗑️</button>
              </div>
            ))}
          </div>

          {costosFijos.length === 0 && (
            <p className="text-center text-[#6B5D45] p-4">No hay costos registrados. Agrega el primero.</p>
          )}
        </div>
      )}

      {/* ==================== PRÉSTAMOS ==================== */}
      {activeTab === 'prestamos' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">💵 Préstamos a Trabajadores</h3>
          
          {!selectedPrestamo ? (
            <>
              <div className="space-y-2 mb-6 p-4 bg-[#F5F2E6] rounded">
                <h4 className="font-bold text-[#1F3D2B]">Nuevo Préstamo</h4>
                
                <input
                  type="text"
                  value={newPrestamo.nombre_trabajador}
                  onChange={(e) => setNewPrestamo({ ...newPrestamo, nombre_trabajador: e.target.value })}
                  placeholder="Nombre trabajador"
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                
                <input
                  type="number"
                  step="0.01"
                  value={newPrestamo.monto_prestado}
                  onChange={(e) => setNewPrestamo({ ...newPrestamo, monto_prestado: e.target.value })}
                  placeholder="Monto"
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                
                <input
                  type="date"
                  value={newPrestamo.fecha_prestamo}
                  onChange={(e) => setNewPrestamo({ ...newPrestamo, fecha_prestamo: e.target.value })}
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                
                <select
                  value={newPrestamo.quien_otorgo}
                  onChange={(e) => setNewPrestamo({ ...newPrestamo, quien_otorgo: e.target.value })}
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                >
                  <option value="Ganaderia OL">Ganaderia OL</option>
                  <option value="Santiago">Santiago</option>
                </select>
                
                <input
                  type="text"
                  value={newPrestamo.descripcion}
                  onChange={(e) => setNewPrestamo({ ...newPrestamo, descripcion: e.target.value })}
                  placeholder="Descripción (opcional)"
                  className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                />
                
                <button 
                  onClick={createPrestamo} 
                  className="w-full bg-green-600 text-white px-4 py-2 rounded font-bold"
                >
                  ➕ Registrar Préstamo
                </button>
              </div>

              <div className="space-y-3">
                {prestamos.map(p => (
                  <div key={p.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE]">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-[#1F3D2B]">{p.nombre_trabajador}</p>
                        <p className="text-xs text-[#6B5D45]">Otorgado por: {p.quien_otorgo}</p>
                      </div>
                      <button onClick={() => deletePrestamo(p.id)} className="text-red-600 font-bold">🗑️</button>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Préstamo: ${p.monto_prestado.toLocaleString()}</span>
                      <span className={`text-sm font-bold ${p.saldo_pendiente === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Saldo: ${p.saldo_pendiente.toLocaleString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => setSelectedPrestamo(p.id)}
                      className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold"
                    >
                      [+ Agregar Abono]
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {prestamos.find(p => p.id === selectedPrestamo) && (
                <div className="p-4 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE] mb-4">
                  {(() => {
                    const p = prestamos.find(p => p.id === selectedPrestamo)
                    return (
                      <>
                        <h4 className="font-bold text-[#1F3D2B] mb-3">{p.nombre_trabajador}</h4>
                        
                        <div className="mb-3 p-4 bg-white rounded border-2 border-[#D8D2BE]">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="p-2 bg-[#F5F2E6] rounded">
                              <p className="text-xs text-[#6B5D45] font-bold">PRÉSTAMO ORIGINAL</p>
                              <p className="text-lg font-bold text-[#1F3D2B]">${p.monto_prestado.toLocaleString()}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded border-2 border-blue-400">
                              <p className="text-xs text-blue-700 font-bold">TOTAL ABONADO</p>
                              <p className="text-lg font-bold text-blue-700">${(p.monto_prestado - p.saldo_pendiente).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="p-3 bg-red-100 rounded border-2 border-red-400 mb-3">
                            <p className="text-xs text-red-700 font-bold">SALDO PENDIENTE</p>
                            <p className="text-2xl font-bold text-red-700">${p.saldo_pendiente.toLocaleString()}</p>
                          </div>

                          {p.api_abono_prestamo?.length > 0 && (
                            <>
                              <p className="text-sm font-bold mt-2 mb-2">📋 Historial de Abonos:</p>
                              <div className="text-xs space-y-1 bg-[#F5F2E6] p-2 rounded max-h-32 overflow-y-auto">
                                {[...p.api_abono_prestamo].reverse().map(a => (
                                  <p key={a.id} className="flex justify-between">
                                    <span><span className="font-bold">{a.fecha_abono}:</span> ${a.monto_abono.toLocaleString()}</span>
                                    <span className="text-[#6B5D45]">({a.quien_descunto})</span>
                                  </p>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="text-sm font-bold text-[#1F3D2B]">Monto Abono</label>
                            <input
                              type="number"
                              step="0.01"
                              value={newAbono.monto_abono}
                              onChange={(e) => setNewAbono({ ...newAbono, monto_abono: e.target.value })}
                              placeholder="0"
                              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                            />
                          </div>

                          {newAbono.monto_abono && (
                            <div className="p-3 bg-green-100 rounded border-2 border-green-400">
                              <p className="text-xs text-green-700 font-bold mb-1">NUEVO SALDO DESPUÉS DEL ABONO</p>
                              <p className="text-xl font-bold text-green-700">
                                ${Math.max(0, p.saldo_pendiente - parseFloat(newAbono.monto_abono)).toLocaleString()}
                              </p>
                              {Math.max(0, p.saldo_pendiente - parseFloat(newAbono.monto_abono)) === 0 && (
                                <p className="text-xs text-green-600 font-bold mt-1">✅ PRÉSTAMO COMPLETAMENTE PAGADO</p>
                              )}
                            </div>
                          )}
                          
                          <div>
                            <label className="text-sm font-bold text-[#1F3D2B]">Fecha Abono</label>
                            <input
                              type="date"
                              value={newAbono.fecha_abono}
                              onChange={(e) => setNewAbono({ ...newAbono, fecha_abono: e.target.value })}
                              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="text-sm font-bold text-[#1F3D2B]">¿Quién Descuenta?</label>
                            <select
                              value={newAbono.quien_descunto}
                              onChange={(e) => setNewAbono({ ...newAbono, quien_descunto: e.target.value })}
                              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                            >
                              <option value="Ganaderia OL">Ganaderia OL</option>
                              <option value="Santiago">Santiago</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-bold text-[#1F3D2B]">Observación (opcional)</label>
                            <input
                              type="text"
                              value={newAbono.observaciones}
                              onChange={(e) => setNewAbono({ ...newAbono, observaciones: e.target.value })}
                              placeholder="Descuento de nómina, pago parcial, etc"
                              className="w-full p-2 border-2 border-[#D8D2BE] rounded text-sm"
                            />
                          </div>
                          
                          <button 
                            onClick={() => addAbono(selectedPrestamo)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
                          >
                            ✅ Guardar Abono
                          </button>
                          
                          <button 
                            onClick={() => setSelectedPrestamo(null)}
                            className="w-full bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700"
                          >
                            ← Volver
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== BALANCE PRÉSTAMOS ==================== */}
      {activeTab === 'balance-prestamos' && (
        <div className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">📊 Balance de Préstamos</h3>
          
          {balancePrestamos && (
            <div className="space-y-6">
              {/* Ganaderia OL */}
              <div className="p-4 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE]">
                <h4 className="font-bold text-[#1F3D2B] mb-3">🔴 Ganaderia OL</h4>
                <p className="text-2xl font-bold text-red-600 mb-3">Total por cobrar: ${balancePrestamos.ganaderia_ol.toLocaleString()}</p>
                
                <div className="space-y-2">
                  {balancePrestamos.detalles.ganaderia_ol.map(p => (
                    <div key={p.id} className="p-2 bg-white rounded border border-[#D8D2BE] text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold">{p.nombre_trabajador}</span>
                        <span className={p.saldo_pendiente === 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          ${p.saldo_pendiente.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B5D45]">Prestado: ${p.monto_prestado.toLocaleString()} | {p.estado}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Santiago */}
              <div className="p-4 bg-[#F5F2E6] rounded border-2 border-[#D8D2BE]">
                <h4 className="font-bold text-[#1F3D2B] mb-3">🟠 Santiago</h4>
                <p className="text-2xl font-bold text-orange-600 mb-3">Total por cobrar: ${balancePrestamos.santiago.toLocaleString()}</p>
                
                <div className="space-y-2">
                  {balancePrestamos.detalles.santiago.map(p => (
                    <div key={p.id} className="p-2 bg-white rounded border border-[#D8D2BE] text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold">{p.nombre_trabajador}</span>
                        <span className={p.saldo_pendiente === 0 ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                          ${p.saldo_pendiente.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B5D45]">Prestado: ${p.monto_prestado.toLocaleString()} | {p.estado}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOTAL */}
              <div className="p-4 bg-[#1F3D2B] rounded border-2 border-[#1F3D2B] text-center">
                <p className="text-white text-lg">BALANCE TOTAL</p>
                <p className="text-3xl font-bold text-yellow-300">
                  ${(balancePrestamos.ganaderia_ol + balancePrestamos.santiago).toLocaleString()}
                </p>
                <p className="text-white text-sm">POR COBRAR</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
