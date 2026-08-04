import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')

  return (
    <div className="p-8 max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">📋 Gestión de Datos Maestros</h2>
      
      <div className="flex gap-2 mb-8 border-b-2 border-[#D8D2BE] overflow-x-auto">
        <button onClick={() => setTab('fincas')} className={`px-6 py-3 font-bold ${tab === 'fincas' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>🏞️ Fincas</button>
        <button onClick={() => setTab('lotes')} className={`px-6 py-3 font-bold ${tab === 'lotes' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>📍 Lotes</button>
        <button onClick={() => setTab('cultivos')} className={`px-6 py-3 font-bold ${tab === 'cultivos' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>🌾 Cultivos</button>
        <button onClick={() => setTab('proveedores')} className={`px-6 py-3 font-bold ${tab === 'proveedores' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>👥 Proveedores</button>
        <button onClick={() => setTab('maquinaria')} className={`px-6 py-3 font-bold ${tab === 'maquinaria' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>🚜 Maquinaria</button>
        <button onClick={() => setTab('categorias')} className={...}>🏷️ Categorías</button>
      </div>

      {tab === 'fincas' && <Fincas />}
      {tab === 'lotes' && <Lotes />}
      {tab === 'cultivos' && <Cultivos />}
      {tab === 'proveedores' && <Proveedores />}
      {tab === 'maquinaria' && <Maquinaria />}
      {tab === 'categorias' && <Categorias />}
    </div>
  )
}

function Fincas() {
  const [items, setItems] = useState([])
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUserId(session?.user?.id)
  }

  useEffect(() => {
    if (userId) fetch()
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', userId)
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_finca').insert([{ nombre, ubicacion, cliente_id: 1, user_id: userId }])
    setNombre('')
    setUbicacion('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input type="text" placeholder="Nombre finca" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <input type="text" placeholder="Ubicación" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear Finca</button>
      </form>
      <div className="space-y-2">
        {items.map(f => <div key={f.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{f.nombre}</p><p className="text-sm text-[#6B5D45]">{f.ubicacion}</p></div>)}
      </div>
    </div>
  )
}

function Lotes() {
  const [items, setItems] = useState([])
  const [fincas, setFincas] = useState([])
  const [nombre, setNombre] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [fincaId, setFincaId] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUserId(session?.user?.id)
  }

  useEffect(() => {
    if (userId) {
      fetch()
      fetchFincas()
    }
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_lote').select('*').eq('user_id', userId)
    setItems(data || [])
  }

  const fetchFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*').eq('user_id', userId)
    setFincas(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_lote').insert([{ nombre, superficie: parseFloat(superficie), finca_id: parseInt(fincaId), user_id: userId }])
    setNombre('')
    setSuperficie('')
    setFincaId('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-3 border rounded mb-4" required>
          <option value="">Selecciona Finca</option>
          {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        <input type="text" placeholder="Nombre lote" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <input type="number" step="0.1" placeholder="Superficie (ha)" value={superficie} onChange={(e) => setSuperficie(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear Lote</button>
      </form>
      <div className="space-y-2">
        {items.map(l => <div key={l.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{l.nombre}</p><p className="text-sm text-[#6B5D45]">{l.superficie} ha</p></div>)}
      </div>
    </div>
  )
}

function Cultivos() {
  const [items, setItems] = useState([])
  const [nombre, setNombre] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUserId(session?.user?.id)
  }

  useEffect(() => {
    if (userId) fetch()
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_cultivocatalogo').select('id, nombre')
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_cultivocatalogo').insert([{ nombre, user_id: userId }])
    setNombre('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input type="text" placeholder="Nombre cultivo" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear Cultivo</button>
      </form>
      <div className="space-y-2">
        {items.map(c => <div key={c.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{c.nombre}</p></div>)}
      </div>
    </div>
  )
}

function Proveedores() {
  const [items, setItems] = useState([])
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUserId(session?.user?.id)
  }

  useEffect(() => {
    if (userId) fetch()
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_proveedor').select('*').eq('user_id', userId)
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_proveedor').insert([{ nombre, contacto, email, user_id: userId }])
    setNombre('')
    setContacto('')
    setEmail('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <input type="text" placeholder="Contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} className="w-full p-3 border rounded mb-4" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded mb-4" />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear Proveedor</button>
      </form>
      <div className="space-y-2">
        {items.map(p => <div key={p.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{p.nombre}</p><p className="text-sm text-[#6B5D45]">{p.email}</p></div>)}
      </div>
    </div>
  )
}

function Maquinaria() {
  const [items, setItems] = useState([])
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [consumo, setConsumo] = useState('')
  const [combustible, setCombustible] = useState('Diesel')
  const [costoHorario, setCostoHorario] = useState('')
  const [costoEquipo, setCostoEquipo] = useState('')
  const [anioCompra, setAnioCompra] = useState('')
  const [estado, setEstado] = useState('Operativo')
  const [observaciones, setObservaciones] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUserId(session?.user?.id)
  }

  useEffect(() => {
    if (userId) fetch()
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_maquinaria').select('*').eq('user_id', userId)
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_maquinaria').insert([{
      nombre,
      tipo,
      capacidad,
      consumo_combustible_hora: parseFloat(consumo),
      combustible_tipo: combustible,
      costo_horario: parseFloat(costoHorario),
      costo_equipo: parseFloat(costoEquipo),
      año_compra: parseInt(anioCompra),
      estado,
      observaciones,
      user_id: userId
    }])
    setNombre('')
    setTipo('')
    setCapacidad('')
    setConsumo('')
    setCombustible('Diesel')
    setCostoHorario('')
    setCostoEquipo('')
    setAnioCompra('')
    setEstado('Operativo')
    setObservaciones('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Nombre (Tractor JD 5090)" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded" required />
          <input type="text" placeholder="Tipo (Tractor, Pulverizador, etc)" value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-3 border rounded" required />
          <input type="text" placeholder="Capacidad (500L, 5 surcos, etc)" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} className="w-full p-3 border rounded" />
          <input type="number" step="0.1" placeholder="Consumo L/hora" value={consumo} onChange={(e) => setConsumo(e.target.value)} className="w-full p-3 border rounded" />
          <select value={combustible} onChange={(e) => setCombustible(e.target.value)} className="w-full p-3 border rounded">
            <option value="Diesel">Diesel</option>
            <option value="Gasolina">Gasolina</option>
            <option value="Electricidad">Electricidad</option>
          </select>
          <input type="number" step="0.01" placeholder="Costo horario ($)" value={costoHorario} onChange={(e) => setCostoHorario(e.target.value)} className="w-full p-3 border rounded" />
          <input type="number" step="0.01" placeholder="Costo equipo ($)" value={costoEquipo} onChange={(e) => setCostoEquipo(e.target.value)} className="w-full p-3 border rounded" />
          <input type="number" placeholder="Año compra" value={anioCompra} onChange={(e) => setAnioCompra(e.target.value)} className="w-full p-3 border rounded" />
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full p-3 border rounded">
            <option value="Operativo">Operativo</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Fuera de servicio">Fuera de servicio</option>
          </select>
        </div>
        <textarea placeholder="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full p-3 border rounded mb-4" rows="2"></textarea>
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear Maquinaria</button>
      </form>
      <div className="space-y-2">
        {items.map(m => <div key={m.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{m.nombre}</p><p className="text-sm text-[#6B5D45]">{m.tipo} | {m.capacidad} | ${m.costo_horario}/h | {m.estado}</p></div>)}
      </div>
    </div>
  )
}

function Categorias() {
  const [items, setItems] = useState([])
  const [nombre, setNombre] = useState('')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUserId(session?.user?.id)
  }

  useEffect(() => {
    if (userId) fetch()
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_categoria').select('*').order('nombre')
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      alert('Ingresa nombre de categoría')
      return
    }

    const { error } = await supabase.from('api_categoria').insert([{
      nombre: nombre.trim(),
      user_id: userId
    }])

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setNombre('')
    fetch()
  }

  const deleteCategoria = async (id) => {
    if (!confirm('¿Eliminar categoría?')) return
    
    const { error } = await supabase.from('api_categoria').delete().eq('id', id)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Nueva categoría (ej: Plaguicidas, Herramientas)" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            className="flex-1 p-3 border-2 border-[#D8D2BE] rounded" 
            required 
          />
          <button className="bg-[#1F3D2B] text-white px-6 py-3 rounded font-bold">➕ Crear</button>
        </div>
      </form>

      <div className="space-y-2">
        <h3 className="font-bold text-lg">Categorías Disponibles ({items.length}):</h3>
        <div className="grid grid-cols-2 gap-2">
          {items.map(c => (
            <div key={c.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B] flex justify-between items-center">
              <div>
                <p className="font-bold">{c.nombre}</p>
                <p className="text-xs text-[#6B5D45]">{c.user_id ? '👤 Personal' : '🌍 Predeterminada'}</p>
              </div>
              {c.user_id && (
                <button 
                  onClick={() => deleteCategoria(c.id)}
                  className="text-red-600 font-bold hover:text-red-800"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}