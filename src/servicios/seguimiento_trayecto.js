import { useCallback, useEffect, useRef, useState } from 'react'
import { distanciaEntre } from '../utilidades/formateadores'

function leerTrayectoGuardado() {
  try {
    return JSON.parse(localStorage.getItem('autodash-active-trip'))
  } catch {
    return null
  }
}

function leerHistorial() {
  try {
    return JSON.parse(localStorage.getItem('autodash-trips')) || []
  } catch {
    return []
  }
}

export function useSeguimientoTrayecto({ anunciar, alCambiarPosicion }) {
  const [trayectoGuardado] = useState(leerTrayectoGuardado)
  const [distancia, setDistancia] = useState(() => Number(trayectoGuardado?.distance) || 0)
  const [trayectos, setTrayectos] = useState(leerHistorial)
  const [trayectoIniciado, setTrayectoIniciado] = useState(() => Boolean(trayectoGuardado?.startedAt))
  const [iniciadoEn, setIniciadoEn] = useState(() => trayectoGuardado?.startedAt || null)
  const [posicion, setPosicion] = useState(null)
  const [velocidadGps, setVelocidadGps] = useState(0)
  const [velocidadSimulada, setVelocidadSimulada] = useState(0)
  const [simuladorActivo, setSimuladorActivo] = useState(false)
  const [estadoGps, setEstadoGps] = useState('idle')
  const iniciadoRef = useRef(trayectoIniciado)
  const ultimaPosicionRef = useRef(null)
  const identificadorGpsRef = useRef(null)
  const simuladorActivoRef = useRef(simuladorActivo)

  useEffect(() => {
    iniciadoRef.current = trayectoIniciado
  }, [trayectoIniciado])

  useEffect(() => {
    simuladorActivoRef.current = simuladorActivo
  }, [simuladorActivo])

  useEffect(() => () => {
    if (identificadorGpsRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(identificadorGpsRef.current)
    }
  }, [])

  useEffect(() => {
    if (!trayectoIniciado || !iniciadoEn) {
      localStorage.removeItem('autodash-active-trip')
      return
    }
    localStorage.setItem('autodash-active-trip', JSON.stringify({ startedAt: iniciadoEn, distance: distancia }))
  }, [distancia, trayectoIniciado, iniciadoEn])

  useEffect(() => {
    if (!simuladorActivo || !trayectoIniciado || velocidadSimulada === 0) return undefined

    let ultimaActualizacion = Date.now()
    const temporizador = window.setInterval(() => {
      const ahora = Date.now()
      const milisegundosTranscurridos = ahora - ultimaActualizacion
      ultimaActualizacion = ahora
      setDistancia((actual) => actual + (velocidadSimulada * milisegundosTranscurridos) / 3600000)
    }, 1000)

    return () => window.clearInterval(temporizador)
  }, [simuladorActivo, trayectoIniciado, velocidadSimulada])

  const iniciarGps = useCallback(() => {
    if (!window.isSecureContext) {
      setEstadoGps('insecure')
      return
    }
    if (!navigator.geolocation) {
      setEstadoGps('unsupported')
      return
    }
    if (identificadorGpsRef.current !== null) {
      navigator.geolocation.clearWatch(identificadorGpsRef.current)
    }

    setEstadoGps('searching')
    identificadorGpsRef.current = navigator.geolocation.watchPosition(
      (resultado) => {
        const siguientePosicion = {
          lat: resultado.coords.latitude,
          lng: resultado.coords.longitude,
          accuracy: resultado.coords.accuracy,
          timestamp: resultado.timestamp || Date.now(),
        }
        const posicionAnterior = ultimaPosicionRef.current
        const segundosTranscurridos = posicionAnterior
          ? (siguientePosicion.timestamp - posicionAnterior.timestamp) / 1000
          : 0
        const segmento = posicionAnterior ? distanciaEntre(posicionAnterior, siguientePosicion) : 0
        const umbralRuido = posicionAnterior
          ? Math.max(3, Math.min(10, (siguientePosicion.accuracy + posicionAnterior.accuracy) * 0.15))
          : 3
        const segmentoConfiable = posicionAnterior &&
          segundosTranscurridos > 0 &&
          siguientePosicion.accuracy <= 100 &&
          posicionAnterior.accuracy <= 100 &&
          segmento < 1000

        if (!simuladorActivoRef.current && iniciadoRef.current && segmentoConfiable && segmento > umbralRuido) {
          setDistancia((actual) => actual + segmento / 1000)
        }

        const velocidadInformada = resultado.coords.speed
        if (Number.isFinite(velocidadInformada) && velocidadInformada >= 0) {
          setVelocidadGps(velocidadInformada * 3.6)
        } else if (segmentoConfiable && siguientePosicion.accuracy <= 50 && posicionAnterior.accuracy <= 50) {
          const velocidadEstimada = segmento <= umbralRuido ? 0 : (segmento / segundosTranscurridos) * 3.6
          setVelocidadGps(velocidadEstimada <= 200 ? velocidadEstimada : 0)
        } else {
          setVelocidadGps(0)
        }

        ultimaPosicionRef.current = siguientePosicion
        alCambiarPosicion(siguientePosicion)
        setPosicion(siguientePosicion)
        setEstadoGps('active')
      },
      (error) => {
        setEstadoGps(error.code === 1 ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
  }, [alCambiarPosicion])

  const cambiarVelocidadSimulada = useCallback((velocidad) => {
    setVelocidadSimulada(Math.min(120, Math.max(0, Number(velocidad) || 0)))
  }, [])

  const alternarTrayecto = useCallback(() => {
    if (!trayectoIniciado) {
      setDistancia(0)
      ultimaPosicionRef.current = null
      iniciadoRef.current = true
      setTrayectoIniciado(true)
      setIniciadoEn(Date.now())
      anunciar('Trayecto iniciado')
      if (!simuladorActivo && estadoGps !== 'active') iniciarGps()
      return
    }

    iniciadoRef.current = false
    const duracionMinutos = iniciadoEn
      ? Math.max(1, Math.round((Date.now() - iniciadoEn) / 60000))
      : 0
    const trayecto = {
      id: Date.now(),
      date: new Date(iniciadoEn || Date.now()).toLocaleString('es'),
      distance: distancia.toFixed(2),
      duration: `${duracionMinutos} min`,
      consumption: 'Sin datos del vehículo',
    }

    anunciar(`Trayecto finalizado. Distancia recorrida: ${distancia.toFixed(2)} kilómetros`)
    const historialActualizado = [trayecto, ...trayectos]
    setTrayectos(historialActualizado)
    localStorage.setItem('autodash-trips', JSON.stringify(historialActualizado))
    setTrayectoIniciado(false)
    setIniciadoEn(null)
  }, [anunciar, distancia, estadoGps, iniciadoEn, iniciarGps, simuladorActivo, trayectoIniciado, trayectos])

  return {
    posicion,
    estadoGps,
    velocidad: simuladorActivo ? velocidadSimulada : velocidadGps,
    velocidadSimulada,
    simuladorActivo,
    alternarSimulador: () => setSimuladorActivo((activo) => !activo),
    cambiarVelocidadSimulada,
    distancia,
    trayectos,
    trayectoIniciado,
    iniciarGps,
    alternarTrayecto,
  }
}
