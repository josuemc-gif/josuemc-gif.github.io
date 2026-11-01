import { useState } from 'react'
import { BatteryCharging, Bell, Bluetooth, Check, Compass, Contrast, Eye, Gauge, Languages, Monitor, Moon, Settings2, ShieldCheck, Sun, Volume2, Wifi } from 'lucide-react'
import { consumoDesdeKwh100Km, distanciaDesdeKm, temperaturaDesdeC } from '../../utilidades/unidades'
import './configuracion.css'

export function SeccionConfiguracion({
  device,
  setDevice,
  themeMode,
  setThemeMode,
  highContrast,
  setHighContrast,
  largeText,
  setLargeText,
  voiceEnabled,
  alternarVoz,
  telemetry,
  updateTelemetry,
  notifications,
  enableNotifications,
  notificationPermission,
  sound,
  setSound,
  privacy,
  setPrivacy,
  units,
  setUnits,
  language,
  setLanguage,
  gpsStatus,
  startGps,
}) {
  const [category, setCategory] = useState('general')
  const [bluetoothStatus, setBluetoothStatus] = useState('No conectado')

  async function connectBluetooth() {
    if (!navigator.bluetooth) {
      setBluetoothStatus('Bluetooth web no compatible con este navegador')
      return
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true })
      if (!device.gatt) {
        setBluetoothStatus('El dispositivo no ofrece conexión GATT')
        return
      }
      const connection = await device.gatt.connect()
      setBluetoothStatus(`Conectado: ${device.name || 'dispositivo Bluetooth'}`)
      connection.addEventListener('serverdisconnected', () => setBluetoothStatus('Dispositivo desconectado'), { once: true })
    } catch (error) {
      if (error.name === 'NotFoundError') {
        setBluetoothStatus('No se seleccionó ningún dispositivo')
        return
      }
      setBluetoothStatus(`No se pudo conectar: ${error.message}`)
    }
  }

  const categories = [
    { id: 'general', label: 'General', detail: 'Tema, unidades e idioma', icon: Settings2 },
    { id: 'notifications', label: 'Notificaciones', detail: 'Avisos del navegador', icon: Bell },
    { id: 'screen', label: 'Pantalla', detail: 'Dispositivo y accesibilidad', icon: Monitor },
    { id: 'sound', label: 'Sonido', detail: 'Voz y sonidos de la app', icon: Volume2 },
    { id: 'connection', label: 'Conexión', detail: 'GPS y Bluetooth', icon: Wifi },
    { id: 'privacy', label: 'Privacidad', detail: 'Control de datos locales', icon: Eye },
  ]

  return (
    <section className="module-page settings-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> PERSONALIZA TU ESPACIO</div>
          <h1>Configuración<span>.</span></h1>
          <p>Adapta la interfaz y los controles a tu dispositivo.</p>
        </div>
        <span className="board-count"><Settings2 size={15} /> Preferencias</span>
      </div>

      <nav className="settings-category-grid" aria-label="Categorías de configuración">
        {categories.map(({ id, label, detail, icon: Icon }) => (
          <button type="button" className={`settings-category-card${category === id ? ' active' : ''}`} key={id} onClick={() => setCategory(id)} aria-pressed={category === id}>
            <Icon size={19} /><strong>{label}</strong><small>{detail}</small>
          </button>
        ))}
      </nav>

      {category === 'general' && <article className="panel settings-section">
        <div className="section-title">
          <div><span className="section-kicker">APARIENCIA</span><h2>Tema y preferencias regionales</h2></div>
          <span className="title-icon"><ShieldCheck size={18} /></span>
        </div>
        <div className="setting-row">
          <span className="setting-icon"><Contrast size={17} /></span>
          <span className="setting-copy"><strong>Tema</strong><small>El modo automático sigue la apariencia del sistema.</small></span>
          <div className="theme-options" role="group" aria-label="Tema de la aplicación">
            {[
              { id: 'light', name: 'Claro', icon: Sun },
              { id: 'dark', name: 'Oscuro', icon: Moon },
              { id: 'system', name: 'Automático', icon: Monitor },
            ].map(({ id, name, icon: Icon }) => (
              <button key={id} type="button" className={`theme-option${themeMode === id ? ' chosen' : ''}`} aria-pressed={themeMode === id} onClick={() => setThemeMode(id)}>
                <Icon size={14} /><span>{name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-select-grid">
          <label><span><Gauge size={14} /> Unidades</span><select value={units} onChange={(event) => setUnits(event.target.value)}><option value="metric">Métricas (km, °C)</option><option value="imperial">Imperiales (mi, °F)</option></select></label>
          <label><span><Languages size={14} /> Idioma</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="es">Español</option><option value="en">English</option></select></label>
        </div>
        {language === 'en' && <p className="settings-description" role="note">La preferencia se guarda para los formatos del navegador; las etiquetas de la aplicación todavía están disponibles en español.</p>}
      </article>}

      {category === 'screen' && <article className="panel settings-section">
        <div className="section-title">
          <div><span className="section-kicker">PANTALLA</span><h2>Tipo de dispositivo</h2></div>
          <span className="title-icon"><Compass size={18} /></span>
        </div>
        <p className="settings-description">El diseño se ajusta automáticamente al espacio disponible.</p>
        <div className="device-options">
          {[
            { id: 'tablet', name: 'Tableta', detail: 'Vista amplia para el vehículo', icon: '▭' },
            { id: 'phone', name: 'Teléfono', detail: 'Controles compactos', icon: '▯' },
            { id: 'computer', name: 'Computadora', detail: 'Panel completo de escritorio', icon: '▱' },
          ].map((option) => (
            <button key={option.id} className={`device-option${device === option.id ? ' chosen' : ''}`} onClick={() => setDevice(option.id)}>
              <span className="device-illustration">{option.icon}</span>
              <span><strong>{option.name}</strong><small>{option.detail}</small></span>
              <span className="radio-indicator">{device === option.id && <Check size={12} />}</span>
            </button>
          ))}
        </div>

        <div className="setting-row">
          <span className="setting-icon"><Contrast size={17} /></span>
          <span className="setting-copy"><strong>Alto contraste</strong><small>Refuerza la diferencia entre texto y fondo.</small></span>
          <button role="switch" aria-checked={highContrast} className={`toggle${highContrast ? ' on' : ''}`} onClick={() => setHighContrast(!highContrast)} aria-label="Activar alto contraste"><i /></button>
        </div>

        <div className="setting-row">
          <span className="setting-icon"><span className="text-badge">A</span></span>
          <span className="setting-copy"><strong>Texto grande</strong><small>Aumenta la legibilidad en pantallas pequeñas.</small></span>
          <button role="switch" aria-checked={largeText} className={`toggle${largeText ? ' on' : ''}`} onClick={() => setLargeText(!largeText)} aria-label="Activar texto grande"><i /></button>
        </div>
      </article>}

      {category === 'sound' && <article className="panel settings-section accessibility-section">
        <div className="section-title"><div><span className="section-kicker">AUDIO</span><h2>Sonido y voz</h2></div><span className="title-icon"><Volume2 size={18} /></span></div>
        <div className="setting-row"><span className="setting-icon"><Volume2 size={17} /></span><span className="setting-copy"><strong>Sonidos de la aplicación</strong><small>Permite avisos audibles durante el uso.</small></span><button role="switch" aria-checked={sound} className={`toggle${sound ? ' on' : ''}`} onClick={() => setSound(!sound)} aria-label="Activar sonido"><i /></button></div>
        <div className="setting-row">
          <span className="setting-icon"><span className="voice-badge">🔊</span></span>
          <span className="setting-copy"><strong>Voz asistida</strong><small>Emite avisos por voz al iniciar o completar un trayecto.</small></span>
          <button role="switch" aria-checked={voiceEnabled} className={`toggle${voiceEnabled ? ' on' : ''}`} onClick={alternarVoz} aria-label="Activar voz asistida"><i /></button>
        </div>
      </article>}

      {category === 'notifications' && <article className="panel settings-section">
        <div className="section-title"><div><span className="section-kicker">AVISOS DEL SISTEMA</span><h2>Notificaciones</h2></div><span className="title-icon"><Bell size={18} /></span></div>
        <div className="setting-row"><span className="setting-icon"><Bell size={17} /></span><span className="setting-copy"><strong>Notificaciones del navegador</strong><small>Se muestran mientras AutoDash está abierto. El navegador puede denegar el permiso.</small></span><button type="button" className="secondary-button" onClick={enableNotifications}>{notifications ? 'Desactivar' : 'Permitir'}</button></div>
        <p className="settings-description" role="status">{notificationPermission === 'granted' ? 'Permiso concedido.' : notificationPermission === 'denied' ? 'Permiso denegado en la configuración del navegador.' : notificationPermission === 'unsupported' ? 'Este navegador no es compatible.' : notificationPermission === 'error' ? 'No se pudo actualizar el permiso de notificaciones.' : 'Aún no se ha concedido permiso.'}</p>
      </article>}

      {category === 'connection' && <article className="panel settings-section">
        <div className="section-title"><div><span className="section-kicker">DISPOSITIVOS</span><h2>Conexión</h2></div><span className="title-icon"><Bluetooth size={18} /></span></div>
        <div className="setting-row"><span className="setting-icon"><Wifi size={17} /></span><span className="setting-copy"><strong>Ubicación GPS</strong><small>Estado: {gpsStatus}. Se requiere permiso del dispositivo y HTTPS.</small></span><button type="button" className="secondary-button" onClick={startGps}>Activar GPS</button></div>
        <div className="setting-row"><span className="setting-icon"><Bluetooth size={17} /></span><span className="setting-copy"><strong>Bluetooth del navegador</strong><small>{bluetoothStatus}. No se recibe telemetría del automóvil.</small></span><button type="button" className="secondary-button" onClick={connectBluetooth}>Buscar</button></div>
      </article>}

      {category === 'privacy' && <article className="panel settings-section">
        <div className="section-title"><div><span className="section-kicker">DATOS LOCALES</span><h2>Privacidad</h2></div><span className="title-icon"><Eye size={18} /></span></div>
        <div className="setting-row"><span className="setting-icon"><Eye size={17} /></span><span className="setting-copy"><strong>Ocultar coordenadas</strong><small>Oculta la posición exacta en los paneles de la aplicación.</small></span><button role="switch" aria-checked={privacy} className={`toggle${privacy ? ' on' : ''}`} onClick={() => setPrivacy(!privacy)} aria-label="Ocultar coordenadas"><i /></button></div>
        <p className="settings-description">Ocultar coordenadas solo cambia lo que se muestra; no desactiva GPS ni las solicitudes a los servicios de mapas. Las preferencias y registros se guardan en este navegador.</p>
      </article>}

      <article className="panel settings-section telemetry-demo-settings">
        <div className="section-title"><div><span className="section-kicker">SIMULADOR LOCAL</span><h2>Datos eléctricos de demostración</h2></div><span className="title-icon"><BatteryCharging size={18} /></span></div>
        <p className="settings-description">Los cambios se guardan en este dispositivo y no representan mediciones del vehículo.</p>
        <div className="telemetry-demo-grid">
          {[
            { key: 'battery', label: 'Carga de tracción', min: 0, max: 100, step: 1, unit: '%' },
            { key: 'range', label: 'Autonomía estimada', min: 0, max: units === 'imperial' ? 621 : 1000, step: 1, unit: units === 'imperial' ? 'mi' : 'km' },
            { key: 'temperature', label: 'Temperatura', min: units === 'imperial' ? -40 : -40, max: units === 'imperial' ? 212 : 100, step: 1, unit: units === 'imperial' ? '°F' : '°C' },
            { key: 'consumption', label: 'Consumo', min: 0, max: units === 'imperial' ? 161 : 100, step: 0.1, unit: `kWh/100 ${units === 'imperial' ? 'mi' : 'km'}` },
          ].map(({ key, label, min, max, step, unit }) => (
            <label key={key}><span>{label} <strong>{(key === 'range' ? distanciaDesdeKm(telemetry[key], units).value : key === 'temperature' ? temperaturaDesdeC(telemetry[key], units) : key === 'consumption' ? consumoDesdeKwh100Km(telemetry[key], units) : telemetry[key]).toFixed(key === 'consumption' ? 1 : 0)} {unit}</strong></span><input type="range" min={min} max={max} step={step} value={key === 'range' ? distanciaDesdeKm(telemetry[key], units).value : key === 'temperature' ? temperaturaDesdeC(telemetry[key], units) : key === 'consumption' ? consumoDesdeKwh100Km(telemetry[key], units) : telemetry[key]} onChange={(event) => {
              const value = Number(event.target.value)
              const baseValue = key === 'range' && units === 'imperial'
                ? value / 0.621371
                : key === 'temperature' && units === 'imperial'
                  ? ((value - 32) * 5) / 9
                  : key === 'consumption' && units === 'imperial'
                    ? value / 1.609344
                    : value
              updateTelemetry(key, baseValue)
            }} /></label>
          ))}
        </div>
      </article>
    </section>
  )
}
