import { useState } from 'react'
import RegistroActividad from './RegistroActividad'
import VerActividades from './VerActividades'

export default function Actividades() {
  const [tab, setTab] = useState('registrar')
  const [actividadParaEditar, setActividadParaEditar] = useState(null)
  const [editKey, setEditKey] = useState(0)
  const [version, setVersion] = useState(0)

  const onEditar = (actividad) => {
    setActividadParaEditar(actividad)
    setEditKey(k => k + 1)
    setTab('registrar')
  }

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

      {/* Ambas quedan montadas (no se desmontan al cambiar de pestaña) para que
          RegistroActividad no tenga que re-cargar fincas/categorías/costos fijos
          justo cuando se le pide cargar una actividad para editar. */}
      <div className={tab === 'registrar' ? '' : 'hidden'}>
        <RegistroActividad
          actividadParaEditar={actividadParaEditar}
          editKey={editKey}
          onGuardado={() => setVersion(v => v + 1)}
        />
      </div>
      <div className={tab === 'ver' ? '' : 'hidden'}>
        <VerActividades onEditar={onEditar} version={version} />
      </div>
    </div>
  )
}
