import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
export default function GestionDatos() {
export default function GestionDatos() {
export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')

  console.log('GestionDatos renderizando. Tab:', tab)  // ← AGREGA AQUÍ

  return (
    <div className="p-8" style={{border: '3px solid red'}}>
      <h2>Test</h2>
    </div>
  )
}
    <div className="p-8" style={{border: '3px solid red'}}>
    <div className="p-8" style={{border: '3px solid red'}}>
export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">📋 Gestión de Datos</h2>
      
      <div className="flex gap-2 mb-8 border-b-2 overflow-x-auto">
        {[
          { id: 'fincas', label: '🏞️ Fincas' },
          { id: 'lotes', label: '📍 Lotes' },
          { id: 'cultivos', label: '🌾 Cultivos' },
          { id: 'categorias', label: '🏷️ Categorías' },
          { id: 'productos', label: '📦 Productos' },
          { id: 'proveedores', label: '👥 Proveedores' },
          { id: 'tipos', label: '💼 Tipos Costo' }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-3 font-bold ${tab === item.id ? 'border-b-4' : ''}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded">
        {tab === 'fincas' && <Fincas />}
        {tab === 'lotes' && <Lotes />}
        {tab === 'cultivos' && <Cultivos />}
        {tab === 'categorias' && <Categorias />}
        {tab === 'productos' && <Productos />}
        {tab === 'proveedores' && <Proveedores />}
        {tab === 'tipos' && <Tipos />}
      </div>
    </div>
  )
}

function Fincas() {
  const [data, setData] = useState([])
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
    const { data: d } = await supabase.from('api_finca').select('*').eq('user_id', userId)
    setData(d || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_finca').insert([{ nombre, ubicacion, cliente_id: 1, user_id: userId }])
    setNombre('')
    setUbicacion('')
    fetch()
  }

  return (
    <div>
      <form onSubmit={create} className="mb-6">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <input type="text" placeholder="Ubicación" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="w-full p-2 border mb-2" required />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(f => <div key={f.id} className="p-2 border mb-2"><strong>{f.nombre}</strong> - {f.ubicacion}</div>)}
    </div>
  )
}

function Lotes() {
  const [data, setData] = useState([])
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
    const { data: d } = await supabase.from('api_lote').select('*').eq('user_id', userId)
    setData(d || [])
  }

  const fetchFincas = async () => {
    const { data: d } = await supabase.from('api_finca').select('*').eq('user_id', userId)
    setFincas(d || [])
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
    <div>
      <form onSubmit={create} className="mb-6">
        <select value={fincaId} onChange={(e) => setFincaId(e.target.value)} className="w-full p-2 border mb-2" required>
          <option>Selecciona Finca</option>
          {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <input type="number" placeholder="Superficie (ha)" value={superficie} onChange={(e) => setSuperficie(e.target.value)} className="w-full p-2 border mb-2" required />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(l => <div key={l.id} className="p-2 border mb-2"><strong>{l.nombre}</strong> - {l.superficie} ha</div>)}
    </div>
  )
}

function Cultivos() {
  const [data, setData] = useState([])
  const [nombre, setNombre] = useState('')
  const [ciclo, setCiclo] = useState('')

  useEffect(() => {
    fetch()
  }, [])

  const fetch = async () => {
    const { data: d } = await supabase.from('api_cultivocatalogo').select('*')
    setData(d || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_cultivocatalogo').insert([{ nombre, ciclo_dias: ciclo ? parseInt(ciclo) : null }])
    setNombre('')
    setCiclo('')
    fetch()
  }

  return (
    <div>
      <form onSubmit={create} className="mb-6">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <input type="number" placeholder="Ciclo (días)" value={ciclo} onChange={(e) => setCiclo(e.target.value)} className="w-full p-2 border mb-2" />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(c => <div key={c.id} className="p-2 border mb-2"><strong>{c.nombre}</strong></div>)}
    </div>
  )
}

function Categorias() {
  const [data, setData] = useState([])
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
    const { data: d } = await supabase.from('api_categoria').select('*').eq('user_id', userId)
    setData(d || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_categoria').insert([{ nombre, user_id: userId }])
    setNombre('')
    fetch()
  }

  return (
    <div>
      <form onSubmit={create} className="mb-6">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(c => <div key={c.id} className="p-2 border mb-2"><strong>{c.nombre}</strong></div>)}
    </div>
  )
}

function Productos() {
  const [data, setData] = useState([])
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
    const { data: d } = await supabase.from('api_producto').select('*').eq('user_id', userId)
    setData(d || [])
  }

  const fetchCat = async () => {
    const { data: d } = await supabase.from('api_categoria').select('*').eq('user_id', userId)
    setCategorias(d || [])
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
    <div>
      <form onSubmit={create} className="mb-6">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-full p-2 border mb-2">
          <option>Selecciona Categoría</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="text" placeholder="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full p-2 border mb-2" required />
        <input type="number" placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full p-2 border mb-2" required />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(p => <div key={p.id} className="p-2 border mb-2"><strong>{p.nombre}</strong> - ${p.precio_actual}/{p.unidad}</div>)}
    </div>
  )
}

function Proveedores() {
  const [data, setData] = useState([])
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
    const { data: d } = await supabase.from('api_proveedor').select('*').eq('user_id', userId)
    setData(d || [])
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
    <div>
      <form onSubmit={create} className="mb-6">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <input type="text" placeholder="Contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} className="w-full p-2 border mb-2" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border mb-2" />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(p => <div key={p.id} className="p-2 border mb-2"><strong>{p.nombre}</strong> - {p.email}</div>)}
    </div>
  )
}

function Tipos() {
  const [data, setData] = useState([])
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    fetch()
  }, [])

  const fetch = async () => {
    const { data: d } = await supabase.from('api_tipo_costo').select('*')
    setData(d || [])
  }

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('api_tipo_costo').insert([{ nombre }])
    setNombre('')
    fetch()
  }

  return (
    <div>
      <form onSubmit={create} className="mb-6">
        <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border mb-2" required />
        <button className="bg-green-600 text-white px-6 py-2 rounded">Crear</button>
      </form>
      {data.map(t => <div key={t.id} className="p-2 border mb-2"><strong>{t.nombre}</strong></div>)}
    </div>
  )
}