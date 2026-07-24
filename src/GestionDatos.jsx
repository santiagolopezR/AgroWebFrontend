import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user)
    }
    getUser()
  }, [])

  return (
    <div className="p-8 max-w-6xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">📊 Gestión de Datos</h2>

      <div className="flex gap-2 mb-8 border-b-2 border-[#D8D2BE] overflow-x-auto">
        {[
          { id: 'fincas', label: '🏞️ Fincas' },
          { id: 'lotes', label: '📍 Lotes' },
          { id: 'cultivos', label: '🌾 Cultivos' },
          { id: 'categorias', label: '🏷️ Categorías' },
          { id: 'productos', label: '📦 Productos' },
          { id: 'proveedores', label: '👥 Proveedores' },
          { id: 'tipos-costo', label: '💼 Tipos Costo' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap ${
              tab === item.id
                ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]'
                : 'text-[#6B5D45]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'fincas' && <FincasTab user={user} />}
      {tab === 'lotes' && <LotesTab user={user} />}
      {tab === 'cultivos' && <CultivosTab user={user} />}
      {tab === 'categorias' && <CategoriasTab user={user} />}
      {tab === 'productos' && <ProductosTab user={user} />}
      {tab === 'proveedores' && <ProveedoresTab user={user} />}
      {tab === 'tipos-costo' && <TiposCostoTab user={user} />}
    </div>
  )
}

// ============ FINCAS ============
function FincasTab({ user }) {
  const [fincas, setFincas] = useState([])
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  useEffect(() => {
    fetchFincas()
  }, [])

  const fetchFincas = async () => {
    const { data } = await supabase
      .from('api_finca')
      .select('*')
      .eq('user_id', user?.id)
    setFincas(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_finca').insert([{
      nombre,
      ubicacion,
      cliente_id: 1,
      user_id: user?.id
    }])
    setNombre('')
    setUbicacion('')
    fetchFincas()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input
          type="text"
          placeholder="Nombre finca"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="text"
          placeholder="Ubicación"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Finca
        </button>
      </form>

      <div className="space-y-2">
        {fincas.map(finca => (
          <div key={finca.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{finca.nombre}</p>
            <p className="text-sm text-[#6B5D45]">{finca.ubicacion}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ LOTES ============
function LotesTab({ user }) {
  const [lotes, setLotes] = useState([])
  const [fincas, setFincas] = useState([])
  const [nombre, setNombre] = useState('')
  const [superficie, setSuperficie] = useState('')
  const [fincaId, setFincaId] = useState('')

  useEffect(() => {
    fetchLotes()
    fetchFincas()
  }, [])

  const fetchLotes = async () => {
    const { data } = await supabase
      .from('api_lote')
      .select('*')
      .eq('user_id', user?.id)
    setLotes(data || [])
  }

  const fetchFincas = async () => {
    const { data } = await supabase
      .from('api_finca')
      .select('*')
      .eq('user_id', user?.id)
    setFincas(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_lote').insert([{
      nombre,
      superficie: parseFloat(superficie),
      finca_id: parseInt(fincaId),
      user_id: user?.id
    }])
    setNombre('')
    setSuperficie('')
    setFincaId('')
    fetchLotes()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <select
          value={fincaId}
          onChange={(e) => setFincaId(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        >
          <option value="">Selecciona Finca</option>
          {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        <input
          type="text"
          placeholder="Nombre lote"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="number"
          placeholder="Superficie (ha)"
          value={superficie}
          onChange={(e) => setSuperficie(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Lote
        </button>
      </form>

      <div className="space-y-2">
        {lotes.map(lote => (
          <div key={lote.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{lote.nombre}</p>
            <p className="text-sm text-[#6B5D45]">{lote.superficie} ha</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ CULTIVOS (NUEVO) ============
function CultivosTab({ user }) {
  const [cultivos, setCultivos] = useState([])
  const [nombre, setNombre] = useState('')
  const [cicloDias, setCicloDias] = useState('')

  useEffect(() => {
    fetchCultivos()
  }, [])

  const fetchCultivos = async () => {
    const { data } = await supabase
      .from('api_cultivocatalogo')
      .select('*')
    setCultivos(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_cultivocatalogo').insert([{
      nombre,
      ciclo_dias: cicloDias ? parseInt(cicloDias) : null
    }])
    setNombre('')
    setCicloDias('')
    fetchCultivos()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input
          type="text"
          placeholder="Nombre cultivo (Maíz, Soya, etc)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="number"
          placeholder="Ciclo en días (opcional)"
          value={cicloDias}
          onChange={(e) => setCicloDias(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Cultivo
        </button>
      </form>

      <div className="space-y-2">
        {cultivos.map(cultivo => (
          <div key={cultivo.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{cultivo.nombre}</p>
            {cultivo.ciclo_dias && <p className="text-sm text-[#6B5D45]">{cultivo.ciclo_dias} días</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ CATEGORÍAS ============
function CategoriasTab({ user }) {
  const [categorias, setCategorias] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    fetchCategorias()
  }, [])

  const fetchCategorias = async () => {
    const { data } = await supabase
      .from('api_categoria')
      .select('*')
      .eq('user_id', user?.id)
    setCategorias(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_categoria').insert([{
      nombre,
      descripcion,
      user_id: user?.id
    }])
    setNombre('')
    setDescripcion('')
    fetchCategorias()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input
          type="text"
          placeholder="Nombre categoría"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="text"
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Categoría
        </button>
      </form>

      <div className="space-y-2">
        {categorias.map(cat => (
          <div key={cat.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{cat.nombre}</p>
            {cat.descripcion && <p className="text-sm text-[#6B5D45]">{cat.descripcion}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ PRODUCTOS ============
function ProductosTab({ user }) {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [unidad, setUnidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [bulto, setBulto] = useState('')

  useEffect(() => {
    fetchProductos()
    fetchCategorias()
  }, [])

  const fetchProductos = async () => {
    const { data } = await supabase
      .from('api_producto')
      .select('*')
      .eq('user_id', user?.id)
    setProductos(data || [])
  }

  const fetchCategorias = async () => {
    const { data } = await supabase
      .from('api_categoria')
      .select('*')
      .eq('user_id', user?.id)
    setCategorias(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_producto').insert([{
      nombre,
      categoria_id: categoriaId ? parseInt(categoriaId) : null,
      unidad,
      precio_actual: parseFloat(precio),
      bulto,
      user_id: user?.id
    }])
    setNombre('')
    setCategoriaId('')
    setUnidad('')
    setPrecio('')
    setBulto('')
    fetchProductos()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input
          type="text"
          placeholder="Nombre producto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        >
          <option value="">Selecciona Categoría</option>
          {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
        </select>
        <input
          type="text"
          placeholder="Unidad (L, kg, unidad, etc)"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="number"
          placeholder="Precio actual"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="text"
          placeholder="Bulto (opcional)"
          value={bulto}
          onChange={(e) => setBulto(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Producto
        </button>
      </form>

      <div className="space-y-2">
        {productos.map(prod => (
          <div key={prod.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{prod.nombre}</p>
            <p className="text-sm text-[#6B5D45]">${prod.precio_actual} / {prod.unidad}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ PROVEEDORES (NUEVO) ============
function ProveedoresTab({ user }) {
  const [proveedores, setProveedores] = useState([])
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [email, setEmail] = useState('')
  const [nit, setNit] = useState('')

  useEffect(() => {
    fetchProveedores()
  }, [])

  const fetchProveedores = async () => {
    const { data } = await supabase
      .from('api_proveedor')
      .select('*')
      .eq('user_id', user?.id)
    setProveedores(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_proveedor').insert([{
      nombre,
      contacto,
      email,
      nit,
      user_id: user?.id
    }])
    setNombre('')
    setContacto('')
    setEmail('')
    setNit('')
    fetchProveedores()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input
          type="text"
          placeholder="Nombre proveedor"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="text"
          placeholder="Contacto"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <input
          type="text"
          placeholder="NIT"
          value={nit}
          onChange={(e) => setNit(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Proveedor
        </button>
      </form>

      <div className="space-y-2">
        {proveedores.map(prov => (
          <div key={prov.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{prov.nombre}</p>
            {prov.email && <p className="text-sm text-[#6B5D45]">{prov.email}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ TIPOS DE COSTO (NUEVO) ============
function TiposCostoTab({ user }) {
  const [tiposCosto, setTiposCosto] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    fetchTiposCosto()
  }, [])

  const fetchTiposCosto = async () => {
    const { data } = await supabase
      .from('api_tipo_costo')
      .select('*')
    setTiposCosto(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await supabase.from('api_tipo_costo').insert([{
      nombre,
      descripcion
    }])
    setNombre('')
    setDescripcion('')
    fetchTiposCosto()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg border-2 border-[#D8D2BE]">
        <input
          type="text"
          placeholder="Nombre tipo (Producto, Mano_obra, Combustible, etc)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <input
          type="text"
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold">
          ➕ Crear Tipo
        </button>
      </form>

      <div className="space-y-2">
        {tiposCosto.map(tipo => (
          <div key={tipo.id} className="p-4 bg-[#F5F2E6] rounded-lg border-2 border-[#1F3D2B]">
            <p className="font-bold text-[#1F3D2B]">{tipo.nombre}</p>
            {tipo.descripcion && <p className="text-sm text-[#6B5D45]">{tipo.descripcion}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}