import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">📋 Gestión de Datos</h2>
      
      <div className="flex gap-2 mb-8 border-b-2 overflow-x-auto">
        <button onClick={() => setTab('fincas')} className={`px-4 py-3 font-bold ${tab === 'fincas' ? 'border-b-4' : ''}`}>🏞️ Fincas</button>
        <button onClick={() => setTab('lotes')} className={`px-4 py-3 font-bold ${tab === 'lotes' ? 'border-b-4' : ''}`}>📍 Lotes</button>
        <button onClick={() => setTab('cultivos')} className={`px-4 py-3 font-bold ${tab === 'cultivos' ? 'border-b-4' : ''}`}>🌾 Cultivos</button>
        <button onClick={() => setTab('categorias')} className={`px-4 py-3 font-bold ${tab === 'categorias' ? 'border-b-4' : ''}`}>🏷️ Categorías</button>
        <button onClick={() => setTab('productos')} className={`px-4 py-3 font-bold ${tab === 'productos' ? 'border-b-4' : ''}`}>📦 Productos</button>
        <button onClick={() => setTab('proveedores')} className={`px-4 py-3 font-bold ${tab === 'proveedores' ? 'border-b-4' : ''}`}>👥 Proveedores</button>
        <button onClick={() => setTab('tipos')} className={`px-4 py-3 font-bold ${tab === 'tipos' ? 'border-b-4' : ''}`}>💼 Tipos Costo</button>
      </div>

      <div className="bg-white p-6 rounded">
        {tab === 'fincas' && <div>🏞️ Fincas - En construcción</div>}
        {tab === 'lotes' && <div>📍 Lotes - En construcción</div>}
        {tab === 'cultivos' && <div>🌾 Cultivos - En construcción</div>}
        {tab === 'categorias' && <div>🏷️ Categorías - En construcción</div>}
        {tab === 'productos' && <div>📦 Productos - En construcción</div>}
        {tab === 'proveedores' && <div>👥 Proveedores - En construcción</div>}
        {tab === 'tipos' && <div>💼 Tipos Costo - En construcción</div>}
      </div>
    </div>
  )
}