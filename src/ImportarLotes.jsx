import { useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

export default function ImportarLotes() {
  const [archivo, setArchivo] = useState(null)
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [fincaSeleccionada, setFincaSeleccionada] = useState('')
  const [fincas, setFincas] = useState([])

  // Cargar fincas
  const cargarFincas = async () => {
    const { data } = await supabase.from('api_finca').select('*')
    setFincas(data || [])
  }

  // Leer archivo Excel
  const leerExcel = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(ws)
        
        setDatos(jsonData)
        setArchivo(file.name)
      } catch (err) {
        alert('Error al leer archivo: ' + err.message)
      }
    }
    reader.readAsBinaryString(file)
  }

  // Importar lotes
  const importar = async () => {
    if (!fincaSeleccionada) {
      alert('Selecciona una finca')
      return
    }
    if (datos.length === 0) {
      alert('No hay datos para importar')
      return
    }

    setCargando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const lotesData = datos.map(row => ({
        finca_id: parseInt(fincaSeleccionada),
        nombre: row.nombre || row.Nombre || '',
        superficie: parseFloat(row.superficie || row.Superficie || 0),
        user_id: user.id,
      }))

      const { error } = await supabase
        .from('api_lote')
        .insert(lotesData)

      if (error) throw error

      alert(`✓ ${lotesData.length} lotes importados`)
      setDatos([])
      setArchivo(null)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-3xl font-bold text-[#1F3D2B] mb-8">📥 Importar Lotes desde Excel</h2>

      {/* Seleccionar Finca */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <label className="block text-sm font-bold text-[#1F3D2B] mb-2">Finca Destino</label>
        <select
          value={fincaSeleccionada}
          onChange={(e) => setFincaSeleccionada(e.target.value)}
          onFocus={cargarFincas}
          className="w-full px-4 py-3 border-2 border-[#D8D2BE] rounded-lg text-lg"
        >
          <option value="">Seleccionar finca...</option>
          {fincas.map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
        <h3 className="text-xl font-bold text-[#1F3D2B] mb-6">Selecciona archivo Excel</h3>
        
        <div className="border-4 border-dashed border-[#1F3D2B] rounded-lg p-8 text-center mb-6 hover:bg-[#F5F2E6]">
          <Upload size={40} className="mx-auto mb-4 text-[#1F3D2B]" />
          <label className="cursor-pointer">
            <span className="text-lg font-bold text-[#1F3D2B]">
              {archivo ? `Archivo: ${archivo}` : 'Click para seleccionar o arrastra aquí'}
            </span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={leerExcel}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-sm text-[#6B5D45] mb-4">
          El archivo debe tener columnas: <strong>Nombre</strong> y <strong>Superficie</strong>
        </p>
      </div>

      {/* Preview */}
      {datos.length > 0 && (
        <div className="bg-white rounded-lg border-4 border-[#1F3D2B] p-8 mb-8">
          <h3 className="text-xl font-bold text-[#1F3D2B] mb-4">Vista Previa ({datos.length} filas)</h3>
          
          <div className="overflow-x-auto border-2 border-[#D8D2BE] rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1F3D2B] text-white">
                  <th className="text-left py-3 px-4 font-bold">Nombre</th>
                  <th className="text-left py-3 px-4 font-bold">Superficie (ha)</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((row, i) => (
                  <tr key={i} className="border-b border-[#D8D2BE] hover:bg-[#F5F2E6]">
                    <td className="py-3 px-4">{row.nombre || row.Nombre || ''}</td>
                    <td className="py-3 px-4">{row.superficie || row.Superficie || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón Importar */}
      {datos.length > 0 && (
        <button
          onClick={importar}
          disabled={cargando || !fincaSeleccionada}
          className="w-full bg-[#1F3D2B] text-white font-bold text-lg py-4 rounded-lg hover:bg-[#0F2116] disabled:opacity-50"
        >
          {cargando ? '⏳ Importando...' : `✓ Importar ${datos.length} Lotes`}
        </button>
      )}
    </div>
  )
}