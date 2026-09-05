import { useState } from 'react'
import RegistroGasto from './RegistroGasto'
import EditarGasto from './EditarGasto'

export default function Gastos() {
  const [tab, setTab] = useState('registrar')

  return (
    <div>
      <div className="flex gap-2 p-4 md:px-8 md:pt-8 pb-0">
        <button
          onClick={() => setTab('registrar')}
          className={`px-4 py-2 rounded font-bold text-sm ${
            tab === 'registrar' ? 'bg-[#1F3D2B] text-white' : 'bg-[#D8D2BE] text-[#1F3D2B]'
          }`}
        >
          📝 Registrar
        </button>
        <button
          onClick={() => setTab('ver')}
          className={`px-4 py-2 rounded font-bold text-sm ${
            tab === 'ver' ? 'bg-[#1F3D2B] text-white' : 'bg-[#D8D2BE] text-[#1F3D2B]'
          }`}
        >
          ✏️ Ver y Editar
        </button>
      </div>

      {tab === 'registrar' && <RegistroGasto />}
      {tab === 'ver' && <EditarGasto />}
    </div>
  )
}
