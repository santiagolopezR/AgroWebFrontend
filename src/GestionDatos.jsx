import { useState } from 'react'

export default function GestionDatos() {
  const [tab, setTab] = useState('fincas')

  return (
    <div className="p-8">
      <h2>Gestión de Datos</h2>
      <p>Tab activo: {tab}</p>
    </div>
  )
}