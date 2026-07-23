import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import RegistroActividad from './RegistroActividad'
import Actividades from './Actividades'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user || null)
      setLoading(false)
    }

    checkSession()

    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  return (
    <div className="min-h-screen bg-[#F5F2E6]">
      <div className="p-4 bg-[#1F3D2B] text-white flex justify-between items-center">
        <h1 className="text-2xl font-bold">AgroWeb</h1>
        <div className="flex gap-4 items-center">
          <span>{user.email}</span>
          <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded hover:bg-red-700">
            Salir
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-48 bg-white border-r-2 border-[#1F3D2B] p-4">
          <div className="space-y-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full text-left px-4 py-2 rounded ${currentPage === 'dashboard' ? 'bg-[#1F3D2B] text-white' : 'hover:bg-[#F5F2E6]'}`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('registro')}
              className={`w-full text-left px-4 py-2 rounded ${currentPage === 'registro' ? 'bg-[#1F3D2B] text-white' : 'hover:bg-[#F5F2E6]'}`}
            >
              📝 Registrar Actividad
            </button>
            <button
              onClick={() => setCurrentPage('actividades')}
              className={`w-full text-left px-4 py-2 rounded ${currentPage === 'actividades' ? 'bg-[#1F3D2B] text-white' : 'hover:bg-[#F5F2E6]'}`}
            >
              ✅ Actividades realizadas
            </button>
          </div>
        </div>

        <div className="flex-1">
          {currentPage === 'dashboard' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-[#1F3D2B] mb-4">Dashboard</h2>
              <p className="text-[#6B5D45]">Bienvenido a AgroWeb</p>
            </div>
          )}

          {currentPage === 'registro' && <RegistroActividad />}
          {currentPage === 'actividades' && <Actividades />}
        </div>
      </div>
    </div>
  )
}