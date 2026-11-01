import { useEffect, useRef, useState } from 'react'
import { LockKeyhole, Search, Video } from 'lucide-react'
import { getYouTubeEmbedUrl, getYouTubeVideoId } from '../../utilidades/youtube'

const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY
const youtubeIframeApiUrl = 'https://www.youtube.com/iframe_api'
let youtubeIframeApiPromise

const videoPlayerStyles = `
  .media-tools { display: grid; gap: 13px; margin-top: 13px; }
  .media-panel { min-width: 0; padding: 16px; }
  .media-panel-heading { margin-bottom: 12px; }
  .media-panel-heading h2 { margin-top: 4px; font-family: var(--display); font-size: 15px; }
  .media-panel-heading p { margin-top: 4px; color: var(--ink-faint); font-size: 11px; line-height: 1.5; }
  .youtube-search-form { display: flex; gap: 8px; }
  .youtube-search-input { width: 100%; min-width: 0; min-height: 44px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface, white); padding: 0 12px; color: var(--ink); font: inherit; font-size: 13px; }
  .youtube-category-select { min-width: 150px; min-height: 44px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface, white); padding: 0 10px; color: var(--ink); font: inherit; font-size: 12px; }
  .youtube-search-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 5px; background: var(--teal); padding: 0 15px; color: white; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
  .youtube-search-button:disabled, .youtube-result:disabled, .youtube-retry-button:disabled { cursor: not-allowed; opacity: .55; }
  .youtube-key-notice, .youtube-status, .youtube-error, .media-lock { margin: 10px 0 0; border-radius: 5px; padding: 10px 12px; font-size: 11px; line-height: 1.5; }
  .youtube-key-notice { background: #fff8ed; color: #765c37; }
  .youtube-status { color: var(--ink-faint); }
  .youtube-error { background: #fff0ef; color: #8d3932; }
  .youtube-results { display: grid; gap: 8px; margin-top: 12px; }
  .youtube-results-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 15px; }
  .youtube-results-heading strong { color: var(--ink); font-size: 12px; }
  .youtube-results-heading small { color: var(--ink-faint); font-size: 10px; }
  .youtube-result { display: flex; width: 100%; min-width: 0; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: 5px; background: transparent; padding: 8px; text-align: left; cursor: pointer; }
  .youtube-result:hover:not(:disabled), .youtube-result.selected { border-color: var(--teal); background: var(--surface, white); }
  .youtube-thumbnail-wrap { position: relative; width: 120px; aspect-ratio: 16 / 9; flex: 0 0 auto; overflow: hidden; border-radius: 3px; background: #e9efec; }
  .youtube-thumbnail { display: block; width: 100%; height: 100%; object-fit: cover; }
  .youtube-duration { position: absolute; right: 4px; bottom: 4px; border-radius: 3px; background: rgb(0 0 0 / 82%); padding: 2px 4px; color: white; font-size: 9px; font-variant-numeric: tabular-nums; }
  .youtube-result-copy { display: grid; min-width: 0; gap: 5px; }
  .youtube-result-copy strong { overflow: hidden; color: var(--ink); font-size: 12px; line-height: 1.4; text-overflow: ellipsis; }
  .youtube-result-copy small { overflow: hidden; color: var(--ink-faint); font-size: 10px; text-overflow: ellipsis; }
  .youtube-recent { display: grid; gap: 7px; margin-top: 16px; border-top: 1px solid var(--line); padding-top: 12px; }
  .youtube-recent .youtube-result { padding: 6px; }
  .youtube-recent .youtube-thumbnail-wrap { width: 90px; }
  .youtube-player-frame { position: relative; display: grid; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; place-items: center; border-radius: 5px; background: #111817; }
  .youtube-player-frame > div { width: 100%; height: 100%; }
  .youtube-player-frame iframe { display: block; width: 100%; height: 100%; border: 0; }
  .youtube-player-empty { display: grid; justify-items: center; gap: 10px; padding: 20px; color: #d3ddda; text-align: center; }
  .youtube-player-empty p { margin: 0; font-size: 13px; }
  .youtube-selected-title { margin: 10px 0 0; color: var(--ink); font-size: 13px; font-weight: 600; line-height: 1.5; }
  .youtube-retry-button { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; margin-top: 8px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface, white); padding: 0 12px; color: var(--ink); font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
  .youtube-retry-button:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  .media-lock { display: flex; align-items: center; gap: 8px; background: #fff4e5; color: #765c37; }
  .youtube-search-button:focus-visible, .youtube-search-input:focus-visible, .youtube-result:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  @media (max-width: 600px) {
    .media-panel { padding: 12px; }
    .youtube-search-form { align-items: stretch; flex-direction: column; }
    .youtube-search-button { width: 100%; }
    .youtube-category-select { width: 100%; }
    .youtube-thumbnail-wrap { width: 96px; }
  }
`

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const script = document.querySelector(`script[src="${youtubeIframeApiUrl}"]`) || document.createElement('script')
    const previousReady = window.onYouTubeIframeAPIReady
    let settled = false
    let timeout

    const handleReady = () => {
      if (!window.YT?.Player || settled) return
      settled = true
      cleanup()
      resolve(window.YT)
      if (typeof previousReady === 'function') previousReady()
    }

    const cleanup = () => {
      window.clearTimeout(timeout)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      if (window.onYouTubeIframeAPIReady === handleReady) {
        window.onYouTubeIframeAPIReady = previousReady || null
      }
    }

    const handleLoad = () => handleReady()
    const handleError = () => {
      if (settled) return
      settled = true
      cleanup()
      script.remove()
      youtubeIframeApiPromise = null
      reject(new Error('No se pudo conectar con la API del reproductor de YouTube. Revisa tu conexión o bloqueo de red e inténtalo de nuevo.'))
    }

    window.onYouTubeIframeAPIReady = handleReady
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      youtubeIframeApiPromise = null
      reject(new Error('La API del reproductor de YouTube tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo.'))
    }, 15000)

    if (!script.parentNode) {
      script.src = youtubeIframeApiUrl
      script.async = true
      document.head.appendChild(script)
    } else {
      handleReady()
    }
  })

  return youtubeIframeApiPromise
}

function getYouTubePlayerErrorMessage(code) {
  if (code === 2) return 'YouTube rechazó el identificador de este video.'
  if (code === 5) return 'YouTube no pudo decodificar este video. Prueba con otro resultado.'
  if (code === 100) return 'Este video fue eliminado, es privado o no está disponible para inserción.'
  if (code === 101 || code === 150) return 'El propietario no permite insertar este video. Prueba con otro resultado.'
  if (code === 153) return 'YouTube no recibió la identificación del sitio necesaria. Comprueba el dominio, origin y la política de referencia del iframe.'
  return 'YouTube no pudo cargar este video integrado. Comprueba tu conexión e inténtalo de nuevo.'
}

function getYouTubeSearchErrorMessage(data, status) {
  const reason = data.error?.errors?.[0]?.reason
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return 'Se agotó la cuota diaria de YouTube Data API. Inténtalo más tarde.'
  }
  if (reason === 'keyInvalid') {
    return 'La clave de YouTube Data API no es válida. Revisa VITE_YOUTUBE_API_KEY.'
  }
  if (reason === 'ipRefererBlocked') {
    return 'La clave de YouTube Data API no permite solicitudes desde este dominio. Revisa sus restricciones HTTP referrer en Google Cloud.'
  }
  if (reason === 'accessNotConfigured') {
    return 'YouTube Data API v3 no está habilitada en el proyecto de Google Cloud de esta clave.'
  }

  return data.error?.message || `La búsqueda falló (HTTP ${status}).`
}

function formatVideoDuration(isoDuration) {
  const parts = isoDuration?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!parts) return '--:--'

  const hours = Number(parts[1] || 0)
  const minutes = Number(parts[2] || 0)
  const seconds = Number(parts[3] || 0)
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function readRecentVideos() {
  try {
    const savedVideos = JSON.parse(localStorage.getItem('autodash-recent-videos'))
    return Array.isArray(savedVideos) ? savedVideos : []
  } catch {
    return []
  }
}

export function SeccionVideos({ isVideoPlayerLocked = false }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [videoCategory, setVideoCategory] = useState('')
  const [searchRevision, setSearchRevision] = useState(0)
  const [searchResults, setSearchResults] = useState([])
  const [recentVideos, setRecentVideos] = useState(readRecentVideos)
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchError, setSearchError] = useState('')
  const [durationWarning, setDurationWarning] = useState('')
  const [selectedYouTubeVideo, setSelectedYouTubeVideo] = useState(null)
  const [youTubePlayerError, setYouTubePlayerError] = useState('')
  const [youTubePlayerReady, setYouTubePlayerReady] = useState(false)
  const [youTubePlaybackState, setYouTubePlaybackState] = useState('loading')
  const [useYouTubeEmbedFallback, setUseYouTubeEmbedFallback] = useState(false)
  const [playerRetryCount, setPlayerRetryCount] = useState(0)
  const youtubePlayerHostRef = useRef(null)
  const youtubePlayerRef = useRef(null)
  const securityLockRef = useRef(isVideoPlayerLocked)

  useEffect(() => {
    localStorage.setItem('autodash-recent-videos', JSON.stringify(recentVideos))
  }, [recentVideos])

  useEffect(() => {
    securityLockRef.current = isVideoPlayerLocked
    if (isVideoPlayerLocked) youtubePlayerRef.current?.pauseVideo()
  }, [isVideoPlayerLocked])

  useEffect(() => {
    const query = searchQuery.trim()
    if (isVideoPlayerLocked || !query || !youtubeApiKey) return undefined

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSearchStatus('loading')
      setSearchError('')

      try {
        const parameters = new URLSearchParams({
          part: 'snippet',
          q: query,
          type: 'video',
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          maxResults: '10',
          key: youtubeApiKey,
        })
        if (videoCategory) parameters.set('videoCategoryId', videoCategory)
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${parameters}`, {
          signal: controller.signal,
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(getYouTubeSearchErrorMessage(data, response.status))
        }

        let results = (data.items || [])
          .map((item) => {
            const id = getYouTubeVideoId(item.id?.videoId)
            if (!id || !item.snippet) return null

            return {
              id,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            }
          })
          .filter(Boolean)

        setDurationWarning('')
        if (results.length) {
          try {
            const durationParameters = new URLSearchParams({
              part: 'contentDetails',
              id: results.map((result) => result.id).join(','),
              key: youtubeApiKey,
            })
            const durationResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${durationParameters}`, {
              signal: controller.signal,
            })
            const durationData = await durationResponse.json()
            if (!durationResponse.ok) {
              throw new Error(getYouTubeSearchErrorMessage(durationData, durationResponse.status))
            }

            const durations = new Map(
              (durationData.items || []).map((item) => [item.id, formatVideoDuration(item.contentDetails?.duration)]),
            )
            results = results.map((result) => ({ ...result, duration: durations.get(result.id) || '--:--' }))
          } catch (error) {
            if (error.name === 'AbortError') return
            results = results.map((result) => ({ ...result, duration: '--:--' }))
            setDurationWarning(`No se pudieron cargar las duraciones: ${error.message}`)
          }
        }

        setSearchResults(results)
        setSearchStatus(results.length ? 'success' : 'empty')
      } catch (error) {
        if (error.name === 'AbortError') return
        setSearchStatus('error')
        setSearchError(error.message || 'No se pudo conectar con YouTube. Inténtalo de nuevo.')
      }
    }, 450)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [searchQuery, searchRevision, videoCategory, isVideoPlayerLocked])

  useEffect(() => {
    const videoId = selectedYouTubeVideo?.id
    const videoTitle = selectedYouTubeVideo?.title
    const playerHost = youtubePlayerHostRef.current
    if (!videoId || !playerHost) return undefined

    let cancelled = false
    let playerInstance = null
    let readyTimeout
    const playerMount = document.createElement('div')
    playerHost.replaceChildren(playerMount)
    setYouTubePlayerReady(false)
    setYouTubePlayerError('')
    setYouTubePlaybackState('loading')
    setUseYouTubeEmbedFallback(false)

    loadYouTubeIframeApi()
      .then((youtubeApi) => {
        if (cancelled) return

        const player = new youtubeApi.Player(playerMount, {
          videoId,
          playerVars: {
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return
              window.clearTimeout(readyTimeout)
              youtubePlayerRef.current = player
              const iframe = event.target.getIframe()
              iframe.title = videoTitle
              iframe.referrerPolicy = 'strict-origin-when-cross-origin'
              setYouTubePlayerReady(true)
              setYouTubePlaybackState('ready')
              if (securityLockRef.current) event.target.pauseVideo()
            },
            onError: (event) => {
              if (cancelled) return
              window.clearTimeout(readyTimeout)
              setYouTubePlaybackState('error')
              setYouTubePlayerError(getYouTubePlayerErrorMessage(event.data))
            },
            onStateChange: (event) => {
              if (cancelled) return
              if (event.data === youtubeApi.PlayerState.PLAYING) setYouTubePlaybackState('playing')
              else if (event.data === youtubeApi.PlayerState.PAUSED) setYouTubePlaybackState('paused')
              else if (event.data === youtubeApi.PlayerState.ENDED) setYouTubePlaybackState('ended')
            },
          },
        })
        playerInstance = player
        youtubePlayerRef.current = player
        readyTimeout = window.setTimeout(() => {
          if (cancelled) return
          setYouTubePlayerError('')
          setUseYouTubeEmbedFallback(true)
          if (youtubePlayerRef.current === playerInstance) youtubePlayerRef.current = null
          playerInstance?.destroy()
        }, 15000)
      })
      .catch(() => {
        if (cancelled) return
        setYouTubePlayerError('')
        setUseYouTubeEmbedFallback(true)
      })

    return () => {
      cancelled = true
      window.clearTimeout(readyTimeout)
      if (youtubePlayerRef.current === playerInstance) youtubePlayerRef.current = null
      playerInstance?.destroy()
      playerHost.replaceChildren()
    }
  }, [selectedYouTubeVideo?.id, selectedYouTubeVideo?.title, playerRetryCount])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    if (isVideoPlayerLocked) return
    setSearchResults([])
    setSearchStatus('waiting')
    setSearchQuery((query) => query.trim())
    setSearchRevision((revision) => revision + 1)
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.currentTarget.value)
    setSearchResults([])
    setSearchError('')
    setSearchStatus(event.currentTarget.value.trim() ? 'waiting' : 'idle')
  }

  const handleYouTubeSelection = (result) => {
    if (isVideoPlayerLocked) return
    setSelectedYouTubeVideo(result)
    setRecentVideos((currentVideos) => [
      result,
      ...currentVideos.filter((video) => video.id !== result.id),
    ].slice(0, 6))
    setYouTubePlayerError('')
    setYouTubePlayerReady(false)
    setYouTubePlaybackState('loading')
    setUseYouTubeEmbedFallback(false)
    setPlayerRetryCount(0)
  }

  const handlePlayerRetry = () => {
    setYouTubePlayerError('')
    setYouTubePlayerReady(false)
    setYouTubePlaybackState('loading')
    setUseYouTubeEmbedFallback(false)
    setPlayerRetryCount((count) => count + 1)
  }

  const handleFallbackFrameLoad = () => {
    setYouTubePlayerReady(true)
    setYouTubePlaybackState('ready')
    setYouTubePlayerError('')
  }

  const missingApiKey = Boolean(searchQuery.trim()) && !youtubeApiKey && !isVideoPlayerLocked
  const visibleSearchError = missingApiKey
    ? 'Configura VITE_YOUTUBE_API_KEY en el entorno de Vite para habilitar la búsqueda.'
    : searchError

  return (
    <>
      <style>{videoPlayerStyles}</style>
      {isVideoPlayerLocked && (
        <p className="media-lock" role="alert">
          <LockKeyhole size={16} />
          Multimedia bloqueada por el sistema de seguridad.
        </p>
      )}

      <div className="media-tools">
        <article className="panel media-panel">
          <div className="media-panel-heading">
            <span className="section-kicker">BÚSQUEDA DE YOUTUBE</span>
            <h2>Encuentra un video</h2>
            <p>Los resultados se cargan desde YouTube Data API v3.</p>
          </div>

          <form className="youtube-search-form" onSubmit={handleSearchSubmit}>
            <select
              className="youtube-category-select"
              value={videoCategory}
              onChange={(event) => {
                setVideoCategory(event.target.value)
                setSearchResults([])
                setSearchError('')
                setDurationWarning('')
                setSearchStatus(searchQuery.trim() ? 'waiting' : 'idle')
              }}
              aria-label="Categoría de videos"
              disabled={isVideoPlayerLocked}
            >
              <option value="">Todas las categorías</option>
              <option value="10">Música</option>
              <option value="27">Educación</option>
              <option value="24">Entretenimiento</option>
              <option value="28">Ciencia y tecnología</option>
              <option value="17">Deportes</option>
            </select>
            <input
              className="youtube-search-input"
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Busca una canción o un video"
              aria-label="Buscar videos de YouTube"
              disabled={isVideoPlayerLocked}
            />
            <button
              className="youtube-search-button"
              type="submit"
              disabled={isVideoPlayerLocked || !searchQuery.trim()}
            >
              <Search size={16} />
              Buscar
            </button>
          </form>

          {!youtubeApiKey && (
            <p className="youtube-key-notice" role="note">
              Para habilitar la búsqueda, configura VITE_YOUTUBE_API_KEY en el entorno de Vite. Si se usa en el navegador, la clave será visible para los usuarios.
            </p>
          )}
          {!isVideoPlayerLocked && searchStatus === 'waiting' && <p className="youtube-status" role="status">Esperando para buscar…</p>}
          {!isVideoPlayerLocked && searchStatus === 'loading' && <p className="youtube-status" role="status">Buscando videos…</p>}
          {searchStatus === 'empty' && <p className="youtube-status" role="status">No se encontraron videos que permitan reproducción integrada. Prueba otra búsqueda.</p>}
          {(searchStatus === 'error' || missingApiKey) && <p className="youtube-error" role="alert">{visibleSearchError}</p>}
          {durationWarning && <p className="youtube-status" role="status">{durationWarning}</p>}

          {searchResults.length > 0 && (
            <>
              <div className="youtube-results-heading"><strong>Biblioteca de videos</strong><small>{searchResults.length} resultados</small></div>
              <div className="youtube-results" aria-label="Resultados de búsqueda">
                {searchResults.map((result) => (
                <button
                  className={`youtube-result${selectedYouTubeVideo?.id === result.id ? ' selected' : ''}`}
                  key={result.id}
                  type="button"
                  disabled={isVideoPlayerLocked}
                  onClick={() => handleYouTubeSelection(result)}
                >
                  {result.thumbnail && (
                    <span className="youtube-thumbnail-wrap">
                      <img className="youtube-thumbnail" src={result.thumbnail} alt="" loading="lazy" />
                      <span className="youtube-duration">{result.duration || '--:--'}</span>
                    </span>
                  )}
                  <span className="youtube-result-copy">
                    <strong>{result.title}</strong>
                    <small>{result.channel}</small>
                  </span>
                </button>
                ))}
              </div>
            </>
          )}

          {recentVideos.length > 0 && (
            <div className="youtube-recent">
              <div className="youtube-results-heading"><strong>Videos recientes</strong><small>Reproducidos en este dispositivo</small></div>
              {recentVideos.map((video) => (
                <button
                  className={`youtube-result${selectedYouTubeVideo?.id === video.id ? ' selected' : ''}`}
                  key={video.id}
                  type="button"
                  disabled={isVideoPlayerLocked}
                  onClick={() => handleYouTubeSelection(video)}
                >
                  {video.thumbnail && (
                    <span className="youtube-thumbnail-wrap">
                      <img className="youtube-thumbnail" src={video.thumbnail} alt="" loading="lazy" />
                      <span className="youtube-duration">{video.duration || '--:--'}</span>
                    </span>
                  )}
                  <span className="youtube-result-copy">
                    <strong>{video.title}</strong>
                    <small>{video.channel}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="panel media-panel">
          <div className="media-panel-heading">
            <span className="section-kicker">REPRODUCTOR INTEGRADO</span>
            <h2>{selectedYouTubeVideo ? 'YouTube' : 'Video seleccionado'}</h2>
          </div>
          <div className="youtube-player-frame" aria-busy={Boolean(selectedYouTubeVideo) && !youTubePlayerReady}>
            {selectedYouTubeVideo ? (
              useYouTubeEmbedFallback ? (
                <iframe
                  key={`${selectedYouTubeVideo.id}-${playerRetryCount}-fallback`}
                  title={selectedYouTubeVideo.title}
                  src={getYouTubeEmbedUrl(selectedYouTubeVideo.id, window.location.origin)}
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  onLoad={handleFallbackFrameLoad}
                  onError={() => {
                    setYouTubePlaybackState('error')
                    setYouTubePlayerError('No se pudo cargar el video incrustado de YouTube. Comprueba tu conexión e inténtalo de nuevo.')
                  }}
                />
              ) : (
                <div ref={youtubePlayerHostRef} />
              )
            ) : (
              <div className="youtube-player-empty">
                <Video size={28} aria-hidden="true" />
                <p>Busca y selecciona un video para reproducirlo aquí.</p>
              </div>
            )}
          </div>
          {selectedYouTubeVideo && <p className="youtube-selected-title">{selectedYouTubeVideo.title}</p>}
          {selectedYouTubeVideo && !youTubePlayerReady && !youTubePlayerError && (
            <p className="youtube-status" role="status">
              {useYouTubeEmbedFallback
                ? 'La API de control no respondió; cargando el reproductor integrado de YouTube…'
                : 'Cargando reproductor de YouTube…'}
            </p>
          )}
          {youTubePlaybackState === 'ready' && (
            <p className="youtube-status" role="status">
              {useYouTubeEmbedFallback
                ? 'Reproductor integrado cargado. Usa los controles para reproducirlo.'
                : 'Video listo. Usa los controles para reproducirlo.'}
            </p>
          )}
          {youTubePlaybackState === 'playing' && <p className="youtube-status" role="status">Video reproduciéndose dentro de AutoDash.</p>}
          {youTubePlaybackState === 'paused' && <p className="youtube-status" role="status">Video en pausa.</p>}
          {youTubePlaybackState === 'ended' && <p className="youtube-status" role="status">El video terminó.</p>}
          {youTubePlayerError && <p className="youtube-error" role="alert">{youTubePlayerError}</p>}
          {youTubePlayerError && selectedYouTubeVideo && !isVideoPlayerLocked && (
            <button className="youtube-retry-button" type="button" onClick={handlePlayerRetry}>
              Volver a intentar
            </button>
          )}
          {isVideoPlayerLocked && (
            <p className="youtube-status" role="note">
              La aplicación bloquea las búsquedas y selecciones e intenta pausar el video; los controles internos del reproductor de YouTube pueden seguir disponibles.
            </p>
          )}
        </article>
      </div>
    </>
  )
}
