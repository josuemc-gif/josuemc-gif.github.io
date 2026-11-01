import {
  BatteryCharging,
  ChevronRight,
  CloudDrizzle,
  CloudSun,
  Gauge,
  Headphones,
  MapPin,
  Play,
  Route,
  Sun,
  Thermometer,
  Wind,
  ShieldCheck,
  Wrench,
  MapPinned,
} from 'lucide-react'
import { BotonTrayecto } from './boton_trayecto/boton_trayecto'
import { distanciaDesdeKm, temperaturaDesdeC, velocidadDesdeKmh } from '../../utilidades/unidades'
import './panel.css'

const nivelesVelocidad = [0, 20, 40, 60, 80, 100, 120]

function obtenerRiesgoVelocidad(velocidad) {
  if (velocidad === 0) {
    return {
      nivel: 'Detenido',
      clase: 'stopped',
      descripcion: 'Sin movimiento. El simulador no representa la distancia necesaria para frenar.',
    }
  }
  if (velocidad <= 20) {
    return {
      nivel: 'Baja',
      clase: 'low',
      descripcion: 'Aun a baja velocidad puede haber lesiones en una colisión o caída. Mantén atención a peatones y obstáculos.',
    }
  }
  if (velocidad <= 40) {
    return {
      nivel: 'Moderada',
      clase: 'moderate',
      descripcion: 'Hay menos tiempo para reaccionar y más distancia para detenerse; un impacto puede causar lesiones.',
    }
  }
  if (velocidad <= 60) {
    return {
      nivel: 'Alta',
      clase: 'high',
      descripcion: 'Aumentan la distancia de frenado y la gravedad potencial de una colisión.',
    }
  }
  if (velocidad <= 80) {
    return {
      nivel: 'Muy alta',
      clase: 'very-high',
      descripcion: 'Queda menos margen para evitar peligros y crece el riesgo de lesiones graves.',
    }
  }
  if (velocidad <= 100) {
    return {
      nivel: 'Extrema',
      clase: 'extreme',
      descripcion: 'Una pérdida de control o colisión puede tener consecuencias muy graves o mortales.',
    }
  }
  return {
    nivel: 'Extrema',
    clase: 'extreme',
    descripcion: 'Riesgo extremo de perder el control y sufrir lesiones muy graves o mortales. No superes los límites aplicables.',
  }
}

export function SeccionPanel({
  greeting,
  tripStarted,
  speed,
  speedSimulatorActive,
  simulatedSpeed,
  toggleSpeedSimulator,
  changeSimulatedSpeed,
  gpsStatus,
  telemetry,
  units = 'metric',
  privacy = false,
  weather,
  weatherStatus,
  position,
  setMediaSection,
  alternarTrayecto,
  startGps,
  setView,
}) {
  const riesgoVelocidad = obtenerRiesgoVelocidad(simulatedSpeed)
  const displayedSpeed = velocidadDesdeKmh(speed, units)
  const displayedRange = distanciaDesdeKm(telemetry.range, units)

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> TU VIAJE, DE UN VISTAZO</div>
          <h1>{greeting}, conductor<span>.</span></h1>
          <p>Esto es lo que pasa con tu carrito ahora.</p>
        </div>

        <BotonTrayecto iniciado={tripStarted} alAlternar={alternarTrayecto} resaltarFinalizacion />
      </section>

      <section className="metric-grid" aria-label="Datos actuales del vehículo">
        <article className="metric-card speed-card">
          <div className="metric-top"><span className="metric-label">VELOCIDAD ACTUAL</span><span className="metric-icon"><Gauge size={18} /></span></div>
          <div className="speed-display"><strong>{Math.round(displayedSpeed.value)}</strong><span>{displayedSpeed.unit}</span></div>
          <div className="speed-meter"><span style={{ width: `${Math.min(speed / 1.2, 100)}%` }} /></div>
          <div className="metric-foot">
            <span><i className={`signal-dot${gpsStatus === 'active' || speedSimulatorActive ? '' : ' inactive'}`} /> {speedSimulatorActive ? 'Simulador activo' : gpsStatus === 'active' ? 'GPS en tiempo real' : 'GPS sin conexión'}</span>
            <span>máx. {Math.round(velocidadDesdeKmh(120, units).value)} {displayedSpeed.unit}</span>
          </div>
          <button
            type="button"
            className="speed-simulator-toggle"
            aria-pressed={speedSimulatorActive}
            onClick={toggleSpeedSimulator}
          >
            {speedSimulatorActive ? 'Desactivar simulador' : 'Simular velocidad'}
          </button>
          {speedSimulatorActive && (
            <label className="speed-simulator-control">
              <span>Velocidad simulada <output>{Math.round(velocidadDesdeKmh(simulatedSpeed, units).value)} {displayedSpeed.unit}</output></span>
              <div className="speed-levels" role="group" aria-label="Niveles de velocidad">
                {nivelesVelocidad.map((nivel) => (
                  <button
                    type="button"
                    key={nivel}
                    className="speed-level-button"
                    aria-pressed={simulatedSpeed === nivel}
                    onClick={() => changeSimulatedSpeed(nivel)}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={simulatedSpeed}
                aria-label="Velocidad simulada en kilómetros por hora"
                onChange={(event) => changeSimulatedSpeed(event.target.value)}
              />
              <div className={`speed-risk speed-risk-${riesgoVelocidad.clase}`} role="status" aria-live="polite">
                <strong>Riesgo orientativo: {riesgoVelocidad.nivel}</strong>
                <span>{riesgoVelocidad.descripcion}</span>
              </div>
              <small className="speed-simulator-disclaimer">Simulación educativa: no controla el vehículo ni define una velocidad segura. El riesgo real depende del vehículo, la vía y las condiciones.</small>
            </label>
          )}
        </article>

        <article className="metric-card vehicle-metric">
          <div className="metric-top"><span className="metric-label">BATERÍA DE TRACCIÓN</span><span className="metric-icon battery-color"><BatteryCharging size={18} /></span></div>
          <div className="metric-unavailable">{telemetry.battery}<small>%</small></div>
          <div className="battery-track demo-battery-track"><span style={{ width: `${telemetry.battery}%` }} /></div>
          <div className="metric-foot"><span>Nivel de carga</span><strong>Simulado</strong></div>
          <div className="metric-note">Dato de demostración, no telemetría real</div>
        </article>

        <article className="metric-card vehicle-metric">
          <div className="metric-top"><span className="metric-label">AUTONOMÍA ESTIMADA</span><span className="metric-icon distance-color"><Route size={18} /></span></div>
          <div className="metric-unavailable">{Math.round(displayedRange.value)}<small>{displayedRange.unit}</small></div>
          <div className="metric-foot"><span>Distancia restante</span><strong>Simulada</strong></div>
          <div className="metric-note">Estimación de demostración</div>
        </article>

        <article className="metric-card vehicle-metric">
          <div className="metric-top"><span className="metric-label">TEMPERATURA</span><span className="metric-icon"><Thermometer size={18} /></span></div>
          <div className="metric-unavailable">{Math.round(temperaturaDesdeC(telemetry.temperature, units))}<small>°{units === 'imperial' ? 'F' : 'C'}</small></div>
          <div className="metric-foot"><span>Sistema eléctrico</span><strong>Simulado</strong></div>
          <div className="metric-note">Dato de demostración, no telemetría real</div>
        </article>
      </section>

      <section className="panel quick-access-panel" aria-label="Accesos rápidos">
        <div className="section-title">
          <div><span className="section-kicker">ATAJOS</span><h2>Accesos rápidos</h2></div>
        </div>
        <div className="quick-access-grid">
          {[
            { label: 'Navegación', detail: 'Buscar destino y ver el mapa', view: 'map', icon: MapPinned },
            { label: 'Trayectos', detail: 'Consultar el historial', view: 'history', icon: Route },
            { label: 'Mantenimiento', detail: 'Revisar tareas pendientes', view: 'maintenance', icon: Wrench },
            { label: 'Música', detail: 'Abrir el reproductor', view: 'media', media: 'music', icon: Headphones },
            { label: 'Video', detail: 'Explorar videos', view: 'media', media: 'video', icon: Play },
            { label: 'Configuración', detail: 'Personalizar AutoDash', view: 'settings', icon: ShieldCheck },
          ].map(({ label, detail, view: targetView, icon: Icon }) => (
            <button
              type="button"
              className="quick-access-link"
              key={label}
              onClick={() => {
                if (targetView === 'media') setMediaSection(label === 'Video' ? 'video' : 'music')
                setView(targetView)
              }}
            >
              <span><Icon size={16} /></span>
              <span><strong>{label}</strong><small>{detail}</small></span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <article className="panel weather-panel">
          <div className="section-title">
            <div><span className="section-kicker">CONDICIONES LOCALES</span><h2>Clima en ruta</h2></div>
            <span className="title-icon weather-title-icon"><CloudSun size={19} /></span>
          </div>
          <div className="weather-status">{weatherStatus}</div>
          <div className="weather-main">
            <div className="weather-symbol"><Sun size={32} strokeWidth={1.5} /></div>
            <div className="temperature">{weather ? `${Math.round(temperaturaDesdeC(weather.temperature_2m, units))}°` : '--°'}<span>{weather ? (units === 'imperial' ? '°F actual' : '°C actual') : 'Sin ubicación'}</span></div>
          </div>
          <div className="weather-details">
            <div><Thermometer size={15} /><span>Humedad</span><strong>{weather ? `${weather.relative_humidity_2m}%` : '--'}</strong></div>
            <div><Wind size={15} /><span>Viento</span><strong>{weather ? `${Math.round(velocidadDesdeKmh(weather.wind_speed_10m, units).value)} ${displayedSpeed.unit}` : '--'}</strong></div>
            <div><CloudDrizzle size={15} /><span>Prob. lluvia</span><strong>{weather?.precipitation_probability != null ? `${weather.precipitation_probability}%` : '--'}</strong></div>
          </div>
          <button className="text-action" onClick={startGps}><MapPin size={14} /> {position ? (privacy ? 'Ubicación activa · coordenadas ocultas' : `${position.lat.toFixed(3)}, ${position.lng.toFixed(3)}`) : 'Permitir ubicación'} <ChevronRight size={14} /></button>
        </article>

        <article className="panel map-preview">
          <div className="section-title">
            <div><span className="section-kicker">UBICACIÓN DEL CARRITO</span><h2>Tu posición</h2></div>
            <button className="subtle-button" onClick={() => setView('map')}>Abrir mapa <ChevronRight size={15} /></button>
          </div>
          <div className="map-preview-art">
            <div className="map-grid-lines" />
            <div className="map-route route-one" />
            <div className="map-route route-two" />
            <span className="map-road-label road-a">AV. PRINCIPAL</span>
            <span className="map-road-label road-b">CALLE 8</span>
            <span className="map-pin-center"><MapPin size={19} fill="currentColor" /></span>
            <span className="map-coordinates">{position ? (privacy ? 'Ubicación protegida' : `${position.lat.toFixed(4)}°, ${position.lng.toFixed(4)}°`) : 'Esperando señal GPS'}</span>
          </div>
          <div className="map-foot">
            <span><i className={gpsStatus === 'active' ? 'signal-dot' : 'signal-dot inactive'} /> {gpsStatus === 'active' ? 'Posición actualizada' : 'Ubicación sin conectar'}</span>
            <button className="text-action" onClick={() => setView('map')}>Navegar <ChevronRight size={14} /></button>
          </div>
        </article>
      </section>

    </>
  )
}
