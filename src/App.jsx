import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './Dashboard'
import GestionDatos from './GestionDatos'
import Zafras from './Zafras'
import RegistroActividad from './RegistroActividad'
import Gastos from './Gastos'
import ImportarLotes from './ImportarLotes'
import Dashboard_V2 from './components/Dashboard_V2'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const irA = (page) => {
    setCurrentPage(page)
    setMenuAbierto(false)
  }

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user?.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1F3D2B] to-[#0F2116] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold text-[#1F3D2B] mb-4">🌾 AgroWeb</h1>
          <p className="text-[#6B5D45] mb-6">Gestión agrícola inteligente</p>
          <button 
            onClick={() => supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { queryParams: { prompt: 'select_account' } }
            })}
            className="bg-[#1F3D2B] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#0F2116]"
          >
            Inicia sesión con Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F5F2E6] overflow-hidden">
      {/* BARRA SUPERIOR (solo mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between bg-[#1F3D2B] text-white px-4">
        <h1 className="text-lg font-bold">🌾 AgroWeb</h1>
        <button onClick={() => setMenuAbierto(true)} className="text-2xl leading-none" aria-label="Abrir menú">☰</button>
      </div>

      {/* OVERLAY (solo mobile, con el menú abierto) */}
      {menuAbierto && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMenuAbierto(false)} />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#1F3D2B] text-white p-6 overflow-y-auto transform transition-transform duration-200 md:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">🌾 AgroWeb</h1>
          <button onClick={() => setMenuAbierto(false)} className="md:hidden text-2xl leading-none" aria-label="Cerrar menú">✕</button>
        </div>

        <div className="space-y-2 mb-8">
          <button
            onClick={() => irA('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'dashboard'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📊 Dashboard
          </button>

          <button
            onClick={() => irA('dashboard-v2')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'dashboard-v2'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            🗺️ Visualización Mapa
          </button>

          <button
            onClick={() => irA('gestiondatos')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'gestiondatos'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📋 Gestión de Datos
          </button>

          <button
            onClick={() => irA('zafras')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'zafras'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            🌱 Zafras
          </button>

          <button
            onClick={() => irA('registro')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'registro'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📝 Registrar Actividad
          </button>

          <button
            onClick={() => irA('gastos')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'gastos'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            💰 Gastos
          </button>

          <button
            onClick={() => irA('importar')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'importar'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📁 Importar Lotes
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700"
        >
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'dashboard-v2' && <Dashboard_V2 />}
        {currentPage === 'gestiondatos' && <GestionDatos />}
        {currentPage === 'zafras' && <Zafras />}
        {currentPage === 'registro' && <RegistroActividad />}
        {currentPage === 'gastos' && <Gastos />}
        {currentPage === 'importar' && <ImportarLotes />}
      </div>
    </div>
  )
}