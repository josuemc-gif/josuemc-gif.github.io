export function claveHistorialLocal(tipo, usuarioId) {
  return `autodash-local-${tipo}-${encodeURIComponent(String(usuarioId || 'guest'))}`
}

export function leerHistorialLocal(tipo, usuarioId) {
  try {
    const historial = JSON.parse(localStorage.getItem(claveHistorialLocal(tipo, usuarioId)))
    return Array.isArray(historial) ? historial : []
  } catch {
    return []
  }
}

export function guardarHistorialLocal(tipo, usuarioId, historial) {
  localStorage.setItem(claveHistorialLocal(tipo, usuarioId), JSON.stringify(historial))
}

export function agregarElementoReciente(historial, elemento, limite = 20) {
  return [
    elemento,
    ...historial.filter((actual) => actual.id !== elemento.id),
  ].slice(0, limite)
}
