import { useState } from 'react'
import { Bluetooth, ChevronRight, Gauge, LogOut, Music2, Play, Settings2 } from 'lucide-react'
import { mensajeErrorAutenticacion } from '../../servicios/autenticacion'
import './estructura.css'

export function BarraLateral({
  navigation,
  view,
  setView,
  menuOpen,
  setMenuOpen,
  mediaSection,
  setMediaSection,
  user,
  onSignOut,
}) {
  const [signOutError, setSignOutError] = useState('')
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Conductor'
  const initials = username
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    setSignOutError('')
    try {
      await onSignOut()
    } catch (error) {
      setSignOutError(mensajeErrorAutenticacion(error, 'cierre'))
    }
  }

  function navigateToSection(id) {
    setView(id)
    if (id === 'media' && !mediaSection) setMediaSection('music')
    setMenuOpen(false)
  }

  function navigateToMediaSection(section) {
    setMediaSection(section)
    setView('media')
    setMenuOpen(false)
  }

  return (
    <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
      <a className="brand" href="#panel" onClick={() => navigateToSection('dashboard')} aria-label="AutoDash, ir al panel">
        <span className="brand-mark"><Gauge size={21} strokeWidth={2.2} /></span>
        <span>auto<span>dash</span><small>VEHICLE COMPANION</small></span>
      </a>

      <div className="side-label">ESPACIO DEL CONDUCTOR</div>
      <nav aria-label="Navegación principal">
        {navigation.map(({ id, label, icon: Icon }) => (
          <div className="nav-item" key={id}>
            <button
              type="button"
              className={`nav-link${view === id ? ' active' : ''}`}
              aria-current={view === id ? 'page' : undefined}
              aria-expanded={id === 'media' ? view === 'media' : undefined}
              aria-controls={id === 'media' ? 'media-subnav' : undefined}
              onClick={() => navigateToSection(id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === 'dashboard' && <span className="live-dot" />}
            </button>
            {id === 'media' && view === 'media' && (
              <div id="media-subnav" className="media-subnav" aria-label="Secciones de Multimedia">
                <button
                  type="button"
                  className={`media-subnav-link${mediaSection === 'music' ? ' active' : ''}`}
                  aria-current={mediaSection === 'music' ? 'page' : undefined}
                  onClick={() => navigateToMediaSection('music')}
                >
                  <Music2 size={15} />
                  <span>Música</span>
                </button>
                <button
                  type="button"
                  className={`media-subnav-link${mediaSection === 'video' ? ' active' : ''}`}
                  aria-current={mediaSection === 'video' ? 'page' : undefined}
                  onClick={() => navigateToMediaSection('video')}
                >
                  <Play size={15} />
                  <span>Video</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="vehicle-connect">
          <div className="connect-icon"><Bluetooth size={17} /></div>
          <div>
            <strong>Carrito</strong>
            <span><i /> Sin conectar</span>
          </div>
          <ChevronRight size={16} />
        </div>

        <button className={`nav-link settings-link${view === 'settings' ? ' active' : ''}`} aria-current={view === 'settings' ? 'page' : undefined} onClick={() => navigateToSection('settings')}>
          <Settings2 size={18} />
          <span>Configuración</span>
        </button>

        <div className="profile">
          <div className="avatar">{initials}</div>
          <div>
            <strong title={username}>{username}</strong>
            <span title={user?.email}>{user?.email}</span>
          </div>
          <button type="button" className="profile-signout" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={handleSignOut}>
            <LogOut size={16} />
          </button>
        </div>
        {signOutError && <p className="profile-error" role="alert">{signOutError}</p>}
      </div>
    </aside>
  )
}
