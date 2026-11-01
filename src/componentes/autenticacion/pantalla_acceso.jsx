import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Gauge,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { mensajeErrorAutenticacion } from '../../servicios/autenticacion'
import './pantalla_acceso.css'

function prefiereTemaOscuro() {
  const temaGuardado = localStorage.getItem('autodash-theme')
  if (temaGuardado === 'dark') return true
  if (temaGuardado === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return false
}

export function PantallaAcceso({ auth }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [darkMode, setDarkMode] = useState(prefiereTemaOscuro)
  const isRegistering = mode === 'register'

  useEffect(() => {
    if (localStorage.getItem('autodash-theme') !== 'system') return undefined

    const preference = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!preference) return undefined

    const updateTheme = (event) => setDarkMode(event.matches)
    preference.addEventListener('change', updateTheme)
    return () => preference.removeEventListener('change', updateTheme)
  }, [])

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (isRegistering && username.trim().length < 2) {
      setError('El nombre de usuario debe tener al menos 2 caracteres.')
      return
    }

    setBusy(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (isRegistering) {
        await auth.registrarCuenta(username.trim(), normalizedEmail, password)
      } else {
        await auth.iniciarSesion(normalizedEmail, password)
      }
    } catch (requestError) {
      setError(mensajeErrorAutenticacion(requestError, isRegistering ? 'registro' : 'acceso'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={`auth-page${darkMode ? ' dark-mode' : ''}`}>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-showcase">
          <a className="auth-brand" href="#inicio" aria-label="AutoDash">
            <span className="auth-brand-icon"><Gauge size={23} strokeWidth={2} /></span>
            <span>auto<span>dash</span></span>
          </a>

          <div className="auth-showcase-content">
            <span className="auth-eyebrow"><i /> TU ESPACIO DE CONDUCCIÓN</span>
            <h1>Todo tu camino,<br /><span>en un solo lugar.</span></h1>
            <p>Accede a tus trayectos, navegación y herramientas de AutoDash con tu cuenta personal.</p>
            <div className="auth-security-note">
              <span><ShieldCheck size={18} /></span>
              <div>
                <strong>Acceso de demostración</strong>
                <small>Tu cuenta se conserva en este navegador</small>
              </div>
            </div>
          </div>
          <div className="auth-showcase-footer">AUTODASH <span>·</span> VEHICLE COMPANION</div>
          <div className="auth-orbit auth-orbit-one" />
          <div className="auth-orbit auth-orbit-two" />
        </div>

        <div className="auth-form-side">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand">
              <span className="auth-brand-icon"><Gauge size={21} /></span>
              <strong>auto<span>dash</span></strong>
            </div>

            <div className="auth-heading">
              <span className="auth-kicker">{isRegistering ? 'ÚNETE A AUTODASH' : 'BIENVENIDO DE NUEVO'}</span>
              <h2 id="auth-title">{isRegistering ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
              <p>{isRegistering ? 'Registra tus datos para comenzar.' : 'Ingresa tus datos para continuar.'}</p>
            </div>

            <div className="auth-mode-switch" role="group" aria-label="Acceso o registro">
              <button
                type="button"
                aria-pressed={!isRegistering}
                className={!isRegistering ? 'active' : ''}
                onClick={() => changeMode('login')}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                aria-pressed={isRegistering}
                className={isRegistering ? 'active' : ''}
                onClick={() => changeMode('register')}
              >
                Crear cuenta
              </button>
            </div>

            {auth.initializationError && (
              <div className="auth-alert error" role="alert">{auth.initializationError}</div>
            )}

            <div className="auth-setup-notice" role="note">
              <ShieldCheck size={17} />
              <span>Acceso simulado: tu cuenta solo existe en este navegador y no se sincroniza con otros dispositivos.</span>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isRegistering && (
                <label className="auth-field">
                  <span>Nombre de usuario</span>
                  <div className="auth-input-wrap">
                    <UserRound size={17} aria-hidden="true" />
                    <input
                      type="text"
                      name="username"
                      autoComplete="nickname"
                      placeholder="Cómo te llamamos"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      minLength={2}
                      maxLength={40}
                      required
                      disabled={busy}
                    />
                  </div>
                </label>
              )}

              <label className="auth-field">
                <span>Correo electrónico</span>
                <div className="auth-input-wrap">
                  <Mail size={17} aria-hidden="true" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={busy}
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>Contraseña</span>
                <div className="auth-input-wrap">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    name="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    placeholder={isRegistering ? 'Al menos 8 caracteres' : 'Tu contraseña'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={isRegistering ? 8 : undefined}
                    required
                    disabled={busy}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                  >
                    {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {error && <div className="auth-alert error" role="alert">{error}</div>}

              <button className="auth-submit" type="submit" disabled={busy}>
                {busy
                  ? 'Procesando…'
                  : isRegistering
                    ? <>Crear cuenta <ArrowRight size={17} /></>
                    : <>Entrar a AutoDash <ArrowRight size={17} /></>}
              </button>
            </form>

            <p className="auth-privacy-copy">
              <ShieldCheck size={14} />
              Es una simulación local. No uses una contraseña que tengas en otras cuentas.
            </p>
          </div>
        </div>
      </section>
      <footer className="auth-page-footer">© {new Date().getFullYear()} AutoDash <span>·</span> Conduce conectado</footer>
    </main>
  )
}
