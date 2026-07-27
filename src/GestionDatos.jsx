import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')

  return (
    <div className="p-8 max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">📋 Gestión de Datos</h2>
      
      <div className="flex gap-2 mb-8 border-b-2 border-[#D8D2BE] overflow-x-auto">
        <button onClick={() => setTab('fincas')} className={`px-6 py-3 font-bold ${tab === 'fincas' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>🏞️ Fincas</button>
        <button onClick={() => setTab('lotes')} className={`px-6 py-3 font-bold ${tab === 'lotes' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>📍 Lotes</button>
        <button onClick={() => setTab('categorias')} className={`px-6 py-3 font-bold ${tab === 'categorias' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>🏷️ Categorías</button>
        <button onClick={() => setTab('productos')} className={`px-6 py-3 font-bold ${tab === 'productos' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>📦 Productos</button>
        <button onClick={() => setTab('proveedores')} className={`px-6 py-3 font-bold ${tab === 'proveedores' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>👥 Proveedores</button>
        <button onClick={() => setTab('tipos')} className={`px-6 py-3 font-bold ${tab === 'tipos' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}>💼 Tipos Costo</button>
      </div>

      {tab === 'fincas' && <Fincas />}
      {tab === 'lotes' && <Lotes />}
      {tab === 'categorias' && <Categorias />}
      {tab === 'productos' && <Productos />}
      {tab === 'proveedores' && <Proveedores />}
      {tab === 'tipos' && <Tipos />}
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
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear</button>
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
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear</button>
      </form>
      <div className="space-y-2">
        {items.map(l => <div key={l.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{l.nombre}</p><p className="text-sm text-[#6B5D45]">{l.superficie} ha</p></div>)}
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
    const { data } = await supabase.from('api_categoria').select('*').eq('user_id', userId)
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_categoria').insert([{ nombre, user_id: userId }])
    setNombre('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input type="text" placeholder="Nombre categoría" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear</button>
      </form>
      <div className="space-y-2">
        {items.map(c => <div key={c.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{c.nombre}</p></div>)}
      </div>
    </div>
  )
}

function Productos() {
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState([])
  const [nombre, setNombre] = useState('')
  const [catId, setCatId] = useState('')
  const [unidad, setUnidad] = useState('')
  const [precio, setPrecio] = useState('')
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
      fetchCat()
    }
  }, [userId])

  const fetch = async () => {
    const { data } = await supabase.from('api_producto').select('*').eq('user_id', userId)
    setItems(data || [])
  }

  const fetchCat = async () => {
    const { data } = await supabase.from('api_categoria').select('*').eq('user_id', userId)
    setCategorias(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_producto').insert([{ nombre, categoria_id: catId ? parseInt(catId) : null, unidad, precio_actual: parseFloat(precio), user_id: userId }])
    setNombre('')
    setCatId('')
    setUnidad('')
    setPrecio('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input type="text" placeholder="Nombre producto" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-full p-3 border rounded mb-4">
          <option value="">Selecciona Categoría</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="text" placeholder="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <input type="number" step="0.01" placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear</button>
      </form>
      <div className="space-y-2">
        {items.map(p => <div key={p.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{p.nombre}</p><p className="text-sm text-[#6B5D45]">${p.precio_actual}/{p.unidad}</p></div>)}
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
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear</button>
      </form>
      <div className="space-y-2">
        {items.map(p => <div key={p.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{p.nombre}</p><p className="text-sm text-[#6B5D45]">{p.email}</p></div>)}
      </div>
    </div>
  )
}

function Tipos() {
  const [items, setItems] = useState([])
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    fetch()
  }, [])

  const fetch = async () => {
    const { data } = await supabase.from('api_tipo_costo').select('*')
    setItems(data || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_tipo_costo').insert([{ nombre }])
    setNombre('')
    fetch()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input type="text" placeholder="Nombre tipo" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 border rounded mb-4" required />
        <button className="bg-[#1F3D2B] text-white px-6 py-2 rounded font-bold">➕ Crear</button>
      </form>
      <div className="space-y-2">
        {items.map(t => <div key={t.id} className="p-4 bg-[#F5F2E6] rounded border-2 border-[#1F3D2B]"><p className="font-bold">{t.nombre}</p></div>)}
      </div>
    </div>
  )
}