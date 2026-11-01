import { useEffect, useState } from 'react'

export function usePreferencias() {
  const [dispositivo, setDispositivo] = useState(() => localStorage.getItem('autodash-device') || 'tablet')
  const [altoContraste, setAltoContraste] = useState(() => localStorage.getItem('autodash-contrast') === 'true')
  const [tema, setTema] = useState(() => {
    const temaGuardado = localStorage.getItem('autodash-theme')
    if (['light', 'dark', 'system'].includes(temaGuardado)) return temaGuardado
    return localStorage.getItem('autodash-dark-mode') === 'true' ? 'dark' : 'light'
  })
  const [prefiereOscuro, setPrefiereOscuro] = useState(() => (
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  ))
  const [textoGrande, setTextoGrande] = useState(() => localStorage.getItem('autodash-large-text') === 'true')
  const [vozActivada, setVozActivada] = useState(() => localStorage.getItem('autodash-voice') === 'true')
  const [notificaciones, setNotificaciones] = useState(() => localStorage.getItem('autodash-notifications') === 'true')
  const [sonido, setSonido] = useState(() => localStorage.getItem('autodash-sound') !== 'false')
  const [privacidad, setPrivacidad] = useState(() => localStorage.getItem('autodash-privacy') === 'true')
  const [unidades, setUnidades] = useState(() => localStorage.getItem('autodash-units') || 'metric')
  const [idioma, setIdioma] = useState(() => localStorage.getItem('autodash-language') || 'es')
  const [estadoNotificaciones, setEstadoNotificaciones] = useState(() => (
    'Notification' in window ? Notification.permission : 'unsupported'
  ))
  const modoOscuro = tema === 'dark' || (tema === 'system' && prefiereOscuro)

  useEffect(() => {
    const consulta = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!consulta) return undefined

    const actualizarPreferencia = (event) => setPrefiereOscuro(event.matches)
    consulta.addEventListener('change', actualizarPreferencia)
    return () => consulta.removeEventListener('change', actualizarPreferencia)
  }, [])

  useEffect(() => {
    localStorage.setItem('autodash-device', dispositivo)
    localStorage.setItem('autodash-contrast', String(altoContraste))
    localStorage.setItem('autodash-theme', tema)
    localStorage.setItem('autodash-large-text', String(textoGrande))
    localStorage.setItem('autodash-voice', String(vozActivada))
    localStorage.setItem('autodash-notifications', String(notificaciones))
    localStorage.setItem('autodash-sound', String(sonido))
    localStorage.setItem('autodash-privacy', String(privacidad))
    localStorage.setItem('autodash-units', unidades)
    localStorage.setItem('autodash-language', idioma)
    document.documentElement.lang = idioma
  }, [dispositivo, altoContraste, tema, textoGrande, vozActivada, notificaciones, sonido, privacidad, unidades, idioma])

  async function activarNotificaciones() {
    if (notificaciones) {
      setNotificaciones(false)
      return false
    }
    if (!('Notification' in window)) {
      setEstadoNotificaciones('unsupported')
      return false
    }
    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
      setEstadoNotificaciones(permission)
      const enabled = permission === 'granted'
      setNotificaciones(enabled)
      return enabled
    } catch {
      setEstadoNotificaciones('error')
      return false
    }
  }

  function alternarVoz() {
    const siguienteEstado = !vozActivada
    setVozActivada(siguienteEstado)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      if (siguienteEstado) {
        const anuncio = new SpeechSynthesisUtterance('Indicaciones por voz activadas')
        anuncio.lang = 'es-ES'
        window.speechSynthesis.speak(anuncio)
      }
    }
  }

  return {
    dispositivo,
    setDispositivo,
    altoContraste,
    setAltoContraste,
    tema,
    setTema,
    modoOscuro,
    textoGrande,
    setTextoGrande,
    vozActivada,
    alternarVoz,
    notificaciones,
    activarNotificaciones,
    estadoNotificaciones,
    sonido,
    setSonido,
    privacidad,
    setPrivacidad,
    unidades,
    setUnidades,
    idioma,
    setIdioma,
  }
}
