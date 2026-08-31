import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Dashboard from './Dashboard'
import GestionDatos from './GestionDatos'
import Zafras from './Zafras'
import RegistroActividad from './RegistroActividad'
import RegistroGasto from './RegistroGasto'
import EditarGasto from './EditarGasto'
import ImportarLotes from './ImportarLotes'
import Dashboard_V2 from './components/Dashboard_V2'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [user, setUser] = useState(null)

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
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="bg-[#1F3D2B] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#0F2116]"
          >
            Inicia sesión con Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#F5F2E6]">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#1F3D2B] text-white p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-8">🌾 AgroWeb</h1>
        
        <div className="space-y-2 mb-8">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'dashboard'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📊 Dashboard
          </button>

          <button
            onClick={() => setCurrentPage('dashboard-v2')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'dashboard-v2'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            🌍 Dashboard V2.0
          </button>

          <button
            onClick={() => setCurrentPage('gestiondatos')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'gestiondatos'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📋 Gestión de Datos
          </button>

          <button
            onClick={() => setCurrentPage('zafras')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'zafras'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            🌱 Zafras
          </button>

          <button
            onClick={() => setCurrentPage('registro')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'registro'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            📝 Registrar Actividad
          </button>

          <button
            onClick={() => setCurrentPage('gasto')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'gasto'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            💰 Registrar Gasto
          </button>

          <button
            onClick={() => setCurrentPage('editargasto')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-lg transition ${
              currentPage === 'editargasto'
                ? 'bg-[#EAF3EC] text-[#12211A]'
                : 'hover:bg-[#0F2116]'
            }`}
          >
            ✏️ Editar Gastos
          </button>

          <button
            onClick={() => setCurrentPage('importar')}
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
      <div className="flex-1 overflow-y-auto">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'dashboard-v2' && <Dashboard_V2 />}
        {currentPage === 'gestiondatos' && <GestionDatos />}
        {currentPage === 'zafras' && <Zafras />}
        {currentPage === 'registro' && <RegistroActividad />}
        {currentPage === 'gasto' && <RegistroGasto />}
        {currentPage === 'editargasto' && <EditarGasto />}
        {currentPage === 'importar' && <ImportarLotes />}
      </div>
    </div>
  )
}