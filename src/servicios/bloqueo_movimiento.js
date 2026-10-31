export const UMBRAL_VELOCIDAD_KMH = 5
export const ESPERA_DESBLOQUEO_MS = 3000

let ultimaLectura = null

export function emitirVelocidad(velocidad, fuente = 'externa', error = '') {
  const lectura = {
    velocidad: Number.isFinite(velocidad) && velocidad >= 0 ? velocidad : null,
    fuente,
    error,
  }
  ultimaLectura = lectura

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('speedchange', { detail: lectura }))
  }

  return lectura
}

export function obtenerVelocidad() {
  return ultimaLectura?.velocidad ?? null
}

export function crearControlMovimiento(alCambiar, {
  umbral = UMBRAL_VELOCIDAD_KMH,
  espera = ESPERA_DESBLOQUEO_MS,
} = {}) {
  let bloqueado = true
  let lecturaActual = null
  let temporizador = null

  function cancelarDesbloqueo() {
    if (temporizador === null) return
    clearTimeout(temporizador)
    temporizador = null
  }

  function establecerBloqueo(siguienteEstado) {
    if (bloqueado === siguienteEstado) return
    bloqueado = siguienteEstado
    alCambiar(bloqueado)
  }

  function actualizarVelocidad(lectura) {
    lecturaActual = lectura
    const velocidad = lectura?.velocidad
    if (lectura?.error || !Number.isFinite(velocidad) || velocidad < 0) {
      cancelarDesbloqueo()
      establecerBloqueo(true)
      return
    }

    if (velocidad >= umbral) {
      cancelarDesbloqueo()
      establecerBloqueo(true)
      return
    }

    if (!bloqueado || temporizador !== null) return

    temporizador = setTimeout(() => {
      temporizador = null
      if (
        !lecturaActual?.error &&
        Number.isFinite(lecturaActual?.velocidad) &&
        lecturaActual.velocidad < umbral
      ) {
        establecerBloqueo(false)
      }
    }, espera)
  }

  function destruir() {
    cancelarDesbloqueo()
  }

  return { actualizarVelocidad, destruir }
}
