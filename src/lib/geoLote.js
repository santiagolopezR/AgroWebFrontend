// Parseo de georreferenciación de lotes, compartido entre el import de Excel
// y el alta manual. Formato de texto esperado (una celda / un input):
//   Punto:    latitud,longitud                          ej: -34.603,-58.381
//   Polígono: lat1,lng1;lat2,lng2;lat3,lng3;...          ej: -34.60,-58.38;-34.61,-58.39;-34.62,-58.37
export const GEO_FORMATO_AYUDA =
  'Punto: latitud,longitud (ej: -34.603,-58.381). Polígono: 3 o más puntos separados por ; (ej: -34.60,-58.38;-34.61,-58.39;-34.62,-58.37)'

// Devuelve { latitud, longitud } | { poligono: string } | null (vacío) | { error: true } (formato inválido)
export function parseGeorreferencia(input) {
  if (input === undefined || input === null) return null
  const texto = String(input).trim()
  if (!texto) return null

  const puntos = texto
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((par) => {
      const [latStr, lngStr] = par.split(',').map((v) => (v || '').trim())
      const lat = Number(latStr)
      const lng = Number(lngStr)
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
    })

  if (puntos.length === 0 || puntos.some((p) => p === null)) {
    return { error: true }
  }

  if (puntos.length === 1) {
    return { latitud: puntos[0][0], longitud: puntos[0][1] }
  }

  if (puntos.length >= 3) {
    return { poligono: JSON.stringify(puntos) }
  }

  // 2 puntos no forman ni un punto único ni un polígono válido
  return { error: true }
}

// Heurística para detectar que Supabase/PostgREST rechazó el insert porque
// la tabla todavía no tiene las columnas de georreferenciación.
export function esErrorColumnaInexistente(error) {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === '42703') return true
  return /column .* does not exist/i.test(error.message || '')
}
