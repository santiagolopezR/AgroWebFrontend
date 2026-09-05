import { useState, useRef, useEffect } from 'react'

// Combobox chico para elegir un producto de una lista larga escribiendo su nombre,
// en vez de scrollear un <select> con decenas/cientos de opciones. Usa position:fixed
// (calculado desde getBoundingClientRect) para que el panel de resultados no quede
// recortado por el overflow-x-auto de la tabla de items que lo contiene.
export default function BuscadorProducto({ productos, value, onSelect, placeholder = 'Buscar producto...', disabled = false }) {
  const [abierto, setAbierto] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [coords, setCoords] = useState(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  const productoSeleccionado = productos.find(p => String(p.id) === String(value))

  useEffect(() => {
    if (!abierto) return

    const cerrarSiAfuera = (e) => {
      if (inputRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setAbierto(false)
    }
    const cerrarAlScrollear = () => setAbierto(false)

    document.addEventListener('mousedown', cerrarSiAfuera)
    window.addEventListener('scroll', cerrarAlScrollear, true)
    return () => {
      document.removeEventListener('mousedown', cerrarSiAfuera)
      window.removeEventListener('scroll', cerrarAlScrollear, true)
    }
  }, [abierto])

  const abrir = () => {
    if (disabled) return
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 180) })
    setFiltro('')
    setAbierto(true)
  }

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(filtro.trim().toLowerCase()))

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={abierto ? filtro : (productoSeleccionado?.nombre || '')}
        onFocus={abrir}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder={disabled ? placeholder : `🔍 ${placeholder}`}
        autoComplete="off"
        style={styles.input}
      />

      {abierto && coords && (
        <div ref={panelRef} style={{ ...styles.panel, top: coords.top, left: coords.left, width: coords.width }}>
          {filtrados.length === 0 ? (
            <div style={styles.vacio}>Sin resultados</div>
          ) : (
            filtrados.map(p => (
              <div
                key={p.id}
                onClick={() => { onSelect(p); setAbierto(false) }}
                style={{ ...styles.fila, ...(String(p.id) === String(value) ? styles.filaSeleccionada : {}) }}
              >
                {p.nombre}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  input: {
    width: '100%',
    padding: '4px 6px',
    fontSize: 12,
    border: '1px solid #2A3D31',
    borderRadius: 4,
    background: '#16241C',
    color: '#EAF3EC',
  },
  panel: {
    position: 'fixed',
    maxHeight: 220,
    overflowY: 'auto',
    background: '#16241C',
    border: '2px solid #2A3D31',
    borderRadius: 6,
    zIndex: 1000,
    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
  },
  fila: { padding: '8px 10px', fontSize: 12, color: '#EAF3EC', cursor: 'pointer', borderBottom: '1px solid #1E2F24' },
  filaSeleccionada: { background: '#1B3226' },
  vacio: { padding: 12, fontSize: 12, color: '#9FB3A6', textAlign: 'center' },
}
