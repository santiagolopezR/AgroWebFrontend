import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Configuracion() {
  const [tab, setTab] = useState('fincas')
  const [loading, setLoading] = useState(false)
  
  const [fincas, setFincas] = useState([])
  const [nombreFinca, setNombreFinca] = useState('')
  const [ubicacionFinca, setUbicacionFinca] = useState('')
  
  const [lotes, setLotes] = useState([])
  const [fincaSeleccionada, setFincaSeleccionada] = useState('')
  const [nombreLote, setNombreLote] = useState('')
  const [superficieLote, setSuperficieLote] = useState('')
  
  const [productos, setProductos] = useState([])
  const [nombreProducto, setNombreProducto] = useState('')
  const [categoriaProducto, setCategoria] = useState('')
  const [unidadProducto, setUnidad] = useState('L')
  const [precioProducto, setPrecio] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const { data: fincasData } = await supabase.from('api_finca').select('*')
      const { data: lotesData } = await supabase.from('api_lote').select('*')
      const { data: productosData } = await supabase.from('api_producto').select('*')
      
      setFincas(fincasData || [])
      setLotes(lotesData || [])
      setProductos(productosData || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const crearFinca = async () => {
    if (!nombreFinca || !ubicacionFinca) {
      alert('Completa todos los campos')
      return
    }
    
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('api_finca').insert({
        nombre: nombreFinca,
        ubicacion: ubicacionFinca,
        cliente_id: 1,
        user_id: user.id,
      })
      
      if (error) throw error
      alert('✓ Finca creada')
      setNombreFinca('')
      setUbicacionFinca('')
      cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const eliminarFinca = async (id) => {
    if (!confirm('¿Eliminar esta finca?')) return
    try {
      await supabase.from('api_finca').delete().eq('id', id)
      cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const crearLote = async () => {
    if (!fincaSeleccionada || !nombreLote || !superficieLote) {
      alert('Completa todos los campos')
      return
    }
    
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('api_lote').insert({
        finca_id: parseInt(fincaSeleccionada),
        nombre: nombreLote,
        superficie: parseFloat(superficieLote),
        user_id: user.id,
      })
      
      if (error) throw error
      alert('✓ Lote creado')
      setNombreLote('')
      setSuperficieLote('')
      setFincaSeleccionada('')
      cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const eliminarLote = async (id) => {
    if (!confirm('¿Eliminar este lote?')) return
    try {
      await supabase.from('api_lote').delete().eq('id', id)
      cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const crearProducto = async () => {
    if (!nombreProducto || !categoriaProducto || !precioProducto) {
      alert('Completa todos los campos')
      return
    }
    
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('api_producto').insert({
        nombre: nombreProducto,
        categoria: categoriaProducto,
        unidad: unidadProducto,
        precio_actual: parseFloat(precioProducto),
        user_id: user.id,
      })
      
      if (error) throw error
      alert('✓ Producto creado')
      setNombreProducto('')
      setCategoria('')
      setPrecio('')
      cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const eliminarProducto = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await supabase.from('api_producto').delete().eq('id', id)
      cargarDatos()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">⚙️ Configuración</h2>

      <div className="flex gap-4 mb-8 border-b-2 border-[#D8D2BE]">
        <button
          onClick={() => setTab('fincas')}
          className={`px-6 py-3 font-bold text-lg ${tab === 'fincas' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}
        >
          🏞️ Fincas
        </button>
        <button
          onClick={() => setTab('lotes')}
          className={`px-6 py-3 font-bold text-lg ${tab === 'lotes' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}
        >
          📍 Lotes
        </button>
        <button
          onClick={() => setTab('productos')}
          className={`px-6 py-3 font-bold text-lg ${tab === 'productos' ? 'border-b-4 border-[#1F3D2B] text-[#1F3D2B]' : 'text-[#6B5D45]'}`}
        >
          📦 Productos
        </button>
      </div>

      {tab === 'fincas' && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8">
            <h3 className="text-2xl font-bold text-[#1F3D2B] mb-6">Crear Nueva Finca</h3>
            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={nombreFinca}
                onChange={(e) => setNombreFinca(e.target.value)}
                placeholder="Nombre de la finca"
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              />
              <input
                type="text"
                value={ubicacionFinca}
                onChange={(e) => setUbicacionFinca(e.target.value)}
                placeholder="Ubicación (ciudad, región)"
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              />
            </div>
            <button
              onClick={crearFinca}
              disabled={loading}
              className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg hover:bg-[#0F2116] disabled:opacity-50 text-lg"
            >
              <Plus size={20} className="inline mr-2" /> Crear Finca
            </button>
          </div>

          <div className="bg-white rounded-lg border-2 border-[#D8D2BE] p-8">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Mis Fincas</h3>
            <div className="space-y-3">
              {fincas.length === 0 ? (
                <p className="text-[#6B5D45]">No hay fincas creadas</p>
              ) : (
                fincas.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-4 border-2 border-[#D8D2BE] rounded-lg">
                    <div>
                      <div className="font-bold text-lg">{f.nombre}</div>
                      <div className="text-sm text-[#6B5D45]">{f.ubicacion}</div>
                    </div>
                    <button
                      onClick={() => eliminarFinca(f.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'lotes' && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8">
            <h3 className="text-2xl font-bold text-[#1F3D2B] mb-6">Crear Nuevo Lote</h3>
            <div className="space-y-4 mb-6">
              <select
                value={fincaSeleccionada}
                onChange={(e) => setFincaSeleccionada(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              >
                <option value="">Seleccionar finca...</option>
                {fincas.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
              <input
                type="text"
                value={nombreLote}
                onChange={(e) => setNombreLote(e.target.value)}
                placeholder="Nombre del lote"
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              />
              <input
                type="number"
                step="0.1"
                value={superficieLote}
                onChange={(e) => setSuperficieLote(e.target.value)}
                placeholder="Superficie (ha)"
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              />
            </div>
            <button
              onClick={crearLote}
              disabled={loading}
              className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg hover:bg-[#0F2116] disabled:opacity-50 text-lg"
            >
              <Plus size={20} className="inline mr-2" /> Crear Lote
            </button>
          </div>

          <div className="bg-white rounded-lg border-2 border-[#D8D2BE] p-8">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Mis Lotes</h3>
            <div className="space-y-3">
              {lotes.length === 0 ? (
                <p className="text-[#6B5D45]">No hay lotes creados</p>
              ) : (
                lotes.map(l => (
                  <div key={l.id} className="flex justify-between items-center p-4 border-2 border-[#D8D2BE] rounded-lg">
                    <div>
                      <div className="font-bold text-lg">{l.nombre}</div>
                      <div className="text-sm text-[#6B5D45]">{l.superficie}ha</div>
                    </div>
                    <button
                      onClick={() => eliminarLote(l.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'productos' && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8">
            <h3 className="text-2xl font-bold text-[#1F3D2B] mb-6">Crear Nuevo Producto</h3>
            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={nombreProducto}
                onChange={(e) => setNombreProducto(e.target.value)}
                placeholder="Nombre del producto"
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              />
              <input
                type="text"
                value={categoriaProducto}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Categoría (Herbicida, Fungicida, etc)"
                className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={unidadProducto}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
                >
                  <option value="L">Litros (L)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="g">Gramos (g)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={precioProducto}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="Precio unitario"
                  className="px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
                />
              </div>
            </div>
            <button
              onClick={crearProducto}
              disabled={loading}
              className="w-full bg-[#1F3D2B] text-white font-bold py-3 rounded-lg hover:bg-[#0F2116] disabled:opacity-50 text-lg"
            >
              <Plus size={20} className="inline mr-2" /> Crear Producto
            </button>
          </div>

          <div className="bg-white rounded-lg border-2 border-[#D8D2BE] p-8">
            <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Mis Productos</h3>
            <div className="space-y-3">
              {productos.length === 0 ? (
                <p className="text-[#6B5D45]">No hay productos creados</p>
              ) : (
                productos.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-4 border-2 border-[#D8D2BE] rounded-lg">
                    <div>
                      <div className="font-bold text-lg">{p.nombre}</div>
                      <div className="text-sm text-[#6B5D45]">{p.categoria} • ${p.precio_actual}/{p.unidad}</div>
                    </div>
                    <button
                      onClick={() => eliminarProducto(p.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}