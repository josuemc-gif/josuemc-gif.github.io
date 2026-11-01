import { Bell, Gauge, Menu, Monitor, Moon, Sun } from 'lucide-react'

export function BarraSuperior({ viewLabel, gpsStatus, statusText, setMenuOpen, themeMode, setThemeMode }) {
  return (
    <header className="topbar">
      <button className="icon-button menu-toggle" aria-label="Abrir menú" title="Abrir menú" onClick={() => setMenuOpen(true)}>
        <Menu size={20} />
      </button>

      <a className="topbar-brand" href="#panel" aria-label="AutoDash, ir al panel">
        <span className="topbar-brand-mark"><Gauge size={16} /></span>
        <strong>AutoDash</strong>
      </a>
      <span className="topbar-divider" />
      <div className="breadcrumbs">
        <strong>{viewLabel}</strong>
        <span className="topbar-tagline">Diseño moderno, intuitivo y funcional</span>
      </div>

      <div className="topbar-actions">
        <div className="topbar-theme" role="group" aria-label="Tema de la aplicación">
          {[
            { id: 'light', label: 'Claro', Icon: Sun },
            { id: 'dark', label: 'Oscuro', Icon: Moon },
            { id: 'system', label: 'Automático', Icon: Monitor },
          ].map(({ id, label, Icon }) => (
            <button type="button" key={id} className={themeMode === id ? 'active' : ''} aria-label={`Tema ${label}`} aria-pressed={themeMode === id} onClick={() => setThemeMode(id)}>
              <Icon size={14} /><span>{label}</span>
            </button>
          ))}
        </div>
        <span className={`connection-pill${gpsStatus === 'active' ? ' connected' : ''}`}>
          <i />
          {statusText}
        </span>
        <button className="icon-button notification-button" aria-label="Notificaciones no configuradas" title="Notificaciones no configuradas" disabled>
          <Bell size={18} />
        </button>
        <span className="today-date">
          {new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
        </span>
      </div>
    </header>
  )
}
