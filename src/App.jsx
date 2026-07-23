import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import RegistroActividad from './RegistroActividad'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user || null)
      setLoading(false)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => authListener?.unsubscribe()
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
    <div>
      <div className="p-4 bg-[#1F3D2B] text-white flex justify-between items-center">
        <h1>AgroWeb</h1>
        <div className="flex gap-4 items-center">
          <span>Bienvenido, {user.email}</span>
          <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded hover:bg-red-700">
            Salir
          </button>
        </div>
      </div>
      <RegistroActividad />
    </div>
  )
}