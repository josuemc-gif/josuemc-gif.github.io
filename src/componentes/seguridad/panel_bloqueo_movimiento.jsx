import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  crearControlMovimiento,
  emitirVelocidad,
  ESPERA_DESBLOQUEO_MS,
  UMBRAL_VELOCIDAD_KMH,
} from '../../servicios/bloqueo_movimiento.js'
import './bloqueo_movimiento.css'

const ADVERTENCIA_DEMO = 'Demostración del algoritmo. No es un mecanismo de seguridad validado para uso real en vehículos.'
const MENSAJE_BLOQUEO = 'Reproducción bloqueada por seguridad: el vehículo está en movimiento.'

function restaurarAtributo(elemento, nombre, valor) {
  if (valor === null) elemento.removeAttribute(nombre)
  else elemento.setAttribute(nombre, valor)
}

function quitarPermisosMultimedia(iframe) {
  const permisoOriginal = iframe.getAttribute('allow')
  if (!permisoOriginal) return
  const permisosPermitidos = permisoOriginal
    .split(';')
    .map((permiso) => permiso.trim())
    .filter((permiso) => permiso && !/^(?:autoplay|picture-in-picture)\b/i.test(permiso))

  if (permisosPermitidos.length) iframe.setAttribute('allow', permisosPermitidos.join('; '))
  else iframe.removeAttribute('allow')
}

function pausarYouTube(iframe) {
  const origen = iframe.src ? new URL(iframe.src, window.location.href).origin : ''
  if (!['https://www.youtube.com', 'https://www.youtube-nocookie.com'].includes(origen)) return

  iframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
    origen,
  )
}

function bloquearReproductores(bloqueado) {
  if (!bloqueado) return undefined

  const reproductores = new Map()
  const contenedores = new Map()
  const temporizadores = new Set()

  function conectarCapa(elemento) {
    const padre = elemento.parentElement
    if (!padre) return null

    let contenedor = contenedores.get(padre)
    if (!contenedor) {
      const posicionOriginal = padre.style.getPropertyValue('position')
      const prioridadOriginal = padre.style.getPropertyPriority('position')
      const indicadorOriginal = padre.getAttribute('data-bloqueo-video-activo')
      const capa = document.createElement('div')
      capa.className = 'bloqueo-movimiento-capa'
      capa.setAttribute('role', 'alert')
      capa.setAttribute('aria-live', 'assertive')
      capa.textContent = MENSAJE_BLOQUEO

      if (window.getComputedStyle(padre).position === 'static') {
        padre.style.setProperty('position', 'relative')
      }
      padre.setAttribute('data-bloqueo-video-activo', 'true')
      padre.append(capa)
      contenedor = {
        cantidad: 0,
        posicionOriginal,
        prioridadOriginal,
        indicadorOriginal,
        capa,
      }
      contenedores.set(padre, contenedor)
    }

    contenedor.cantidad += 1
    return { padre, contenedor }
  }

  function desconectarCapa(registro) {
    if (!registro) return
    const { padre, contenedor } = registro
    contenedor.cantidad -= 1
    if (contenedor.cantidad > 0) return

    contenedor.capa.remove()
    if (contenedor.posicionOriginal) {
      padre.style.setProperty('position', contenedor.posicionOriginal, contenedor.prioridadOriginal)
    } else {
      padre.style.removeProperty('position')
    }
    restaurarAtributo(padre, 'data-bloqueo-video-activo', contenedor.indicadorOriginal)
    contenedores.delete(padre)
  }

  function restaurarReproductor(elemento) {
    const registro = reproductores.get(elemento)
    if (!registro) return

    registro.limpiezas.forEach((limpieza) => limpieza())
    if (elemento instanceof HTMLVideoElement) {
      restaurarAtributo(elemento, 'controls', registro.controls)
      restaurarAtributo(elemento, 'autoplay', registro.autoplay)
      elemento.disablePictureInPicture = registro.disablePictureInPicture
    } else {
      restaurarAtributo(elemento, 'allow', registro.allow)
      restaurarAtributo(elemento, 'allowfullscreen', registro.allowfullscreen)
      restaurarAtributo(elemento, 'tabindex', registro.tabindex)
      if (registro.pointerEvents) {
        elemento.style.setProperty('pointer-events', registro.pointerEvents, registro.pointerEventsPriority)
      } else {
        elemento.style.removeProperty('pointer-events')
      }
    }
    desconectarCapa(registro.capa)
    reproductores.delete(elemento)
  }

  function aplicarBloqueo(elemento) {
    if (!(elemento instanceof HTMLVideoElement) && !(elemento instanceof HTMLIFrameElement)) return

    const anterior = reproductores.get(elemento)
    if (anterior && anterior.capa?.padre === elemento.parentElement) {
      if (elemento instanceof HTMLVideoElement) {
        elemento.removeAttribute('controls')
        elemento.removeAttribute('autoplay')
        elemento.disablePictureInPicture = true
        elemento.pause()
      } else {
        quitarPermisosMultimedia(elemento)
        elemento.removeAttribute('allowfullscreen')
        elemento.setAttribute('tabindex', '-1')
        elemento.style.setProperty('pointer-events', 'none')
      }
      return
    }
    if (anterior) restaurarReproductor(elemento)

    const capa = conectarCapa(elemento)
    if (!capa) return

    if (elemento instanceof HTMLVideoElement) {
      reproductores.set(elemento, {
        controls: elemento.getAttribute('controls'),
        autoplay: elemento.getAttribute('autoplay'),
        disablePictureInPicture: elemento.disablePictureInPicture,
        capa,
        limpiezas: [],
      })
      elemento.removeAttribute('controls')
      elemento.removeAttribute('autoplay')
      elemento.disablePictureInPicture = true
      elemento.pause()
    } else {
      const registro = {
        allow: elemento.getAttribute('allow'),
        allowfullscreen: elemento.getAttribute('allowfullscreen'),
        tabindex: elemento.getAttribute('tabindex'),
        pointerEvents: elemento.style.getPropertyValue('pointer-events'),
        pointerEventsPriority: elemento.style.getPropertyPriority('pointer-events'),
        capa,
        limpiezas: [],
      }
      reproductores.set(elemento, registro)
      try {
        const url = new URL(elemento.src, window.location.href)
        if (['http:', 'https:'].includes(url.protocol) && url.searchParams.get('autoplay') === '1') {
          url.searchParams.set('autoplay', '0')
          elemento.src = url.href
        }
      } catch (error) {
        console.error('No se pudo desactivar autoplay en el reproductor incrustado.', error)
      }
      quitarPermisosMultimedia(elemento)
      elemento.removeAttribute('allowfullscreen')
      elemento.setAttribute('tabindex', '-1')
      elemento.style.setProperty('pointer-events', 'none')

      const pausar = () => pausarYouTube(elemento)
      elemento.addEventListener('load', pausar)
      registro.limpiezas.push(() => elemento.removeEventListener('load', pausar))
      ;[0, 250, 750, 1500, 3000].forEach((retraso) => {
        const temporizador = window.setTimeout(() => {
          temporizadores.delete(temporizador)
          pausar()
        }, retraso)
        temporizadores.add(temporizador)
        registro.limpiezas.push(() => {
          window.clearTimeout(temporizador)
          temporizadores.delete(temporizador)
        })
      })
      pausar()
    }
  }

  function explorar(nodo) {
    if (!(nodo instanceof Element)) return
    if (nodo.matches('video, iframe')) aplicarBloqueo(nodo)
    nodo.querySelectorAll('video, iframe').forEach(aplicarBloqueo)
  }

  function impedirReproduccion(evento) {
    if (reproductores.has(evento.target)) evento.target.pause()
  }

  function impedirAtajo(evento) {
    if (evento.code !== 'Space' && evento.key !== ' ') return
    if (!(evento.target instanceof Element)) return
    if (!evento.target.closest('[data-bloqueo-video-activo="true"], .bloqueo-movimiento-capa')) return
    evento.preventDefault()
    evento.stopPropagation()
  }

  function impedirPantallaCompleta() {
    const pantallaCompleta = document.fullscreenElement
    if (!pantallaCompleta) return
    const reproductorBloqueado = reproductores.has(pantallaCompleta) ||
      Array.from(reproductores.values()).some((registro) => registro.capa?.padre === pantallaCompleta)
    if (!reproductorBloqueado) return

    document.exitFullscreen()?.catch((error) => {
      console.error('No se pudo salir de la pantalla completa mientras el video está bloqueado.', error)
    })
  }

  function impedirPictureInPicture(evento) {
    if (!reproductores.has(evento.target) || typeof evento.target.ownerDocument.exitPictureInPicture !== 'function') return
    evento.target.ownerDocument.exitPictureInPicture().catch((error) => {
      console.error('No se pudo salir de picture-in-picture mientras el video está bloqueado.', error)
    })
  }

  document.querySelectorAll('video, iframe').forEach(aplicarBloqueo)
  document.addEventListener('play', impedirReproduccion, true)
  document.addEventListener('keydown', impedirAtajo, true)
  document.addEventListener('fullscreenchange', impedirPantallaCompleta)
  document.addEventListener('enterpictureinpicture', impedirPictureInPicture, true)

  const observador = new MutationObserver((cambios) => {
    cambios.forEach((cambio) => {
      if (cambio.type === 'childList') cambio.addedNodes.forEach(explorar)
      if (cambio.type === 'attributes' && reproductores.has(cambio.target)) {
        aplicarBloqueo(cambio.target)
      }
      if (cambio.type === 'childList') {
        reproductores.forEach((registro, elemento) => {
          if (!elemento.isConnected) restaurarReproductor(elemento)
          else if (registro.capa?.padre !== elemento.parentElement) aplicarBloqueo(elemento)
        })
      }
    })
  })
  observador.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['allow', 'allowfullscreen', 'autoplay', 'controls'],
  })

  return () => {
    observador.disconnect()
    document.removeEventListener('play', impedirReproduccion, true)
    document.removeEventListener('keydown', impedirAtajo, true)
    document.removeEventListener('fullscreenchange', impedirPantallaCompleta)
    document.removeEventListener('enterpictureinpicture', impedirPictureInPicture, true)
    temporizadores.forEach((temporizador) => window.clearTimeout(temporizador))
    temporizadores.clear()
    Array.from(reproductores.keys()).forEach(restaurarReproductor)
  }
}

export function PanelBloqueoMovimiento({ onBloqueoChange }) {
  const [fuente, setFuente] = useState('simulador')
  const [velocidadSimulada, setVelocidadSimulada] = useState(0)
  const [velocidad, setVelocidad] = useState(null)
  const [estadoSenal, setEstadoSenal] = useState('esperando')
  const [errorSenal, setErrorSenal] = useState('')
  const [bloqueado, setBloqueado] = useState(true)
  const [expandido, setExpandido] = useState(false)
  const fuenteRef = useRef(fuente)

  useEffect(() => {
    const actualizarBloqueo = (siguienteEstado) => {
      setBloqueado(siguienteEstado)
      onBloqueoChange?.(siguienteEstado)
    }
    const control = crearControlMovimiento(actualizarBloqueo)
    const escucharVelocidad = (evento) => {
      const lectura = evento.detail
      if (lectura.fuente !== fuenteRef.current) return
      setVelocidad(lectura.velocidad)
      setErrorSenal(lectura.error || '')
      setEstadoSenal(lectura.error ? 'error' : Number.isFinite(lectura.velocidad) ? 'activa' : 'esperando')
      control.actualizarVelocidad(lectura)
    }

    window.addEventListener('speedchange', escucharVelocidad)
    return () => {
      window.removeEventListener('speedchange', escucharVelocidad)
      control.destruir()
    }
  }, [onBloqueoChange])

  useEffect(() => bloquearReproductores(bloqueado), [bloqueado])

  useEffect(() => {
    if (fuente === 'simulador') {
      emitirVelocidad(velocidadSimulada, 'simulador')
      return undefined
    }

    let activo = true
    let identificador = null
    let temporizadorSenal = null
    const notificarFallo = (mensaje) => {
      if (!activo) return
      window.clearTimeout(temporizadorSenal)
      temporizadorSenal = null
      emitirVelocidad(null, 'gps', mensaje)
    }

    emitirVelocidad(null, 'gps')
    if (!window.isSecureContext) {
      notificarFallo('El GPS requiere una conexión HTTPS segura. El video permanece bloqueado.')
      return () => { activo = false }
    }
    if (!navigator.geolocation) {
      notificarFallo('Este navegador no ofrece geolocalización. El video permanece bloqueado.')
      return () => { activo = false }
    }

    identificador = navigator.geolocation.watchPosition(
      (posicion) => {
        if (!activo) return
        const velocidadMetrosPorSegundo = posicion.coords.speed
        if (!Number.isFinite(velocidadMetrosPorSegundo) || velocidadMetrosPorSegundo < 0) {
          notificarFallo('El GPS no informó una velocidad válida. El video permanece bloqueado.')
          return
        }
        window.clearTimeout(temporizadorSenal)
        temporizadorSenal = window.setTimeout(() => {
          notificarFallo('La lectura GPS dejó de actualizarse. El video permanece bloqueado.')
        }, 15000)
        emitirVelocidad(velocidadMetrosPorSegundo * 3.6, 'gps')
      },
      (error) => {
        const mensaje = error.code === 1
          ? 'Se denegó el permiso de ubicación. El video permanece bloqueado.'
          : 'No se pudo obtener una lectura GPS. El video permanece bloqueado.'
        notificarFallo(mensaje)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )

    return () => {
      activo = false
      if (identificador !== null) navigator.geolocation.clearWatch(identificador)
    }
  }, [fuente, velocidadSimulada])

  function cambiarFuente(evento) {
    const siguienteFuente = evento.target.value
    fuenteRef.current = siguienteFuente
    setFuente(siguienteFuente)
    setVelocidad(null)
    setEstadoSenal('esperando')
    setErrorSenal('')
    emitirVelocidad(siguienteFuente === 'simulador' ? velocidadSimulada : null, siguienteFuente)
  }

  function cambiarVelocidadSimulada(valor) {
    const siguienteVelocidad = Number(valor)
    setVelocidadSimulada(siguienteVelocidad)
    setVelocidad(siguienteVelocidad)
    setEstadoSenal('activa')
    setErrorSenal('')
    emitirVelocidad(siguienteVelocidad, 'simulador')
  }

  const velocidadVisible = Number.isFinite(velocidad) ? `${velocidad.toFixed(1)} km/h` : 'Sin señal'

  return (
    <aside className={`panel-bloqueo-movimiento${expandido ? ' panel-bloqueo-expandido' : ''}`} aria-label="Modo demostración del bloqueo por movimiento">
      <button
        className="panel-bloqueo-encabezado"
        type="button"
        aria-expanded={expandido}
        onClick={() => setExpandido((actual) => !actual)}
      >
        <span className="panel-bloqueo-icono"><ShieldCheck size={17} /></span>
        <span className="panel-bloqueo-titulo">Modo demostración / simulador</span>
        {expandido ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <div className={`panel-bloqueo-estado${bloqueado ? ' bloqueado' : ' permitido'}`} role="status" aria-live="polite">
        <LockKeyhole size={15} />
        <strong>{bloqueado ? 'BLOQUEADO' : 'PERMITIDO'}</strong>
        <span>{velocidadVisible}</span>
      </div>

      {fuente === 'simulador' && <p className="panel-bloqueo-advertencia panel-bloqueo-aviso-visible" role="note">{ADVERTENCIA_DEMO}</p>}
      {fuente === 'gps' && errorSenal && <p className="panel-bloqueo-aviso error panel-bloqueo-aviso-visible" role="alert">{errorSenal}</p>}

      {expandido && (
        <div className="panel-bloqueo-contenido">
          <label className="panel-bloqueo-fuente">
            Fuente de velocidad
            <select value={fuente} onChange={cambiarFuente}>
              <option value="simulador">Simulador</option>
              <option value="gps">GPS real (experimental)</option>
            </select>
          </label>

          {fuente === 'simulador' ? (
            <>
              <div className="panel-bloqueo-botones">
                <button type="button" onClick={() => cambiarVelocidadSimulada(0)}>Vehículo detenido</button>
                <button type="button" onClick={() => cambiarVelocidadSimulada(Math.max(20, velocidadSimulada))}>Vehículo en movimiento</button>
              </div>
              <label className="panel-bloqueo-deslizador">
                Velocidad simulada: <strong>{velocidadSimulada} km/h</strong>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={velocidadSimulada}
                  onChange={(evento) => cambiarVelocidadSimulada(evento.target.value)}
                />
              </label>
            </>
          ) : (
            estadoSenal !== 'error' && <p className="panel-bloqueo-aviso" role="status">{errorSenal || 'Esperando una lectura GPS…'}</p>
          )}

          <p className="panel-bloqueo-umbral">
            Umbral: <strong>{UMBRAL_VELOCIDAD_KMH} km/h</strong> · Desbloqueo tras {ESPERA_DESBLOQUEO_MS / 1000} s por debajo
          </p>
        </div>
      )}
    </aside>
  )
}
