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

// Resuelve la georreferenciación de una fila venga de donde venga: ya parseada
// (por ejemplo desde KML, donde row.poligono/latitud/longitud llegan con valores
// reales) o como texto en una columna de Excel (Poligono/Coordenadas/Georreferenciacion).
export function georreferenciaDeFila(row) {
  if (row.poligono && typeof row.poligono === 'string') {
    try {
      const arr = JSON.parse(row.poligono)
      if (Array.isArray(arr) && arr.length >= 3) return { poligono: row.poligono }
    } catch {
      // no era JSON ya resuelto, se intenta como texto delimitado más abajo
    }
  }

  if (Number.isFinite(row.latitud) && Number.isFinite(row.longitud)) {
    return { latitud: row.latitud, longitud: row.longitud }
  }

  const texto = row.poligono || row.Poligono || row.coordenadas || row.Coordenadas ||
    row.georreferenciacion || row.Georreferenciacion
  return parseGeorreferencia(texto)
}

// Heurística para detectar que Supabase/PostgREST rechazó el insert porque
// la tabla todavía no tiene las columnas de georreferenciación.
export function esErrorColumnaInexistente(error) {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === '42703') return true
  return /column .* does not exist/i.test(error.message || '')
}

// ==================== IMPORT DESDE KML ====================
// KML define sus coordenadas siempre como lon,lat[,alt] en WGS84, así que no hace
// falta reproyectar nada (a diferencia de un Shapefile, que puede venir en otro CRS).

function parseCoordenadasKML(texto) {
  return (texto || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((triplete) => {
      const [lon, lat] = triplete.split(',').map(Number)
      return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null
    })
    .filter(Boolean)
}

// Área aproximada en hectáreas (proyección equirectangular, suficiente para la escala de un lote)
function areaHectareas(puntos) {
  if (puntos.length < 3) return 0
  const R = 6371000
  const latRef = (puntos[0][0] * Math.PI) / 180
  const xy = puntos.map(([lat, lng]) => [
    ((lng * Math.PI) / 180) * R * Math.cos(latRef),
    (lat * Math.PI) / 180 * R,
  ])
  let area = 0
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i]
    const [x2, y2] = xy[(i + 1) % xy.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area / 2) / 10000
}

// Devuelve un array de filas { nombre, superficie, poligono? , latitud?, longitud? }
// listas para reutilizar el mismo flujo de importación que el Excel.
// Usa getElementsByTagName (por nombre local) en vez de querySelector porque KML
// suele declarar un namespace por defecto, y los selectores CSS son poco confiables ahí.
export function parseKML(xmlTexto) {
  const doc = new DOMParser().parseFromString(xmlTexto, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('El archivo KML no se pudo leer (XML inválido)')
  }

  const placemarks = [...doc.getElementsByTagName('Placemark')]

  return placemarks
    .map((pm) => {
      const nombre = pm.getElementsByTagName('name')[0]?.textContent?.trim() || ''
      const polyCoordsEl = pm.getElementsByTagName('Polygon')[0]?.getElementsByTagName('coordinates')[0]
      const pointCoordsEl = pm.getElementsByTagName('Point')[0]?.getElementsByTagName('coordinates')[0]

      if (polyCoordsEl) {
        const puntos = parseCoordenadasKML(polyCoordsEl.textContent)
        if (puntos.length >= 3) {
          return { nombre, superficie: Number(areaHectareas(puntos).toFixed(2)), poligono: JSON.stringify(puntos) }
        }
      } else if (pointCoordsEl) {
        const puntos = parseCoordenadasKML(pointCoordsEl.textContent)
        if (puntos.length >= 1) {
          return { nombre, superficie: '', latitud: puntos[0][0], longitud: puntos[0][1] }
        }
      }
      return null
    })
    .filter((fila) => fila && fila.nombre)
}
