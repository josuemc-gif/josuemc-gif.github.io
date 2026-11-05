import { useEffect, useRef, useState } from 'react'
import { Bluetooth, ExternalLink, FolderOpen, Music2, Pause, Play, Repeat, Search, Shuffle, SkipBack, SkipForward, Square, Volume2 } from 'lucide-react'
import { SeccionVideos } from './seccion_videos'
import { agregarElementoReciente, guardarHistorialLocal, leerHistorialLocal } from '../../servicios/historial_local'
import './multimedia.css'

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

function formatActivityDate(timestamp) {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function getSongTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, '')
}

function getPlainText(value) {
  if (!value) return ''
  return new DOMParser().parseFromString(value, 'text/html').body.textContent.trim()
}

function getLocalTrackId(file) {
  return `${file.name}:${file.lastModified}:${file.size}`
}

function readPlaylists() {
  try {
    const stored = JSON.parse(localStorage.getItem('autodash-playlists'))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function readTrackMetadata() {
  try {
    const stored = JSON.parse(localStorage.getItem('autodash-track-metadata'))
    return stored && typeof stored === 'object' ? stored : {}
  } catch {
    return {}
  }
}

export function SeccionMultimedia({ userId, isVideoPlayerLocked = false, mediaTab = 'music', setMediaTab }) {
  const audioRef = useRef(null)
  const autoplaySelectionRef = useRef(false)
  const fileInputRef = useRef(null)
  const searchControllerRef = useRef(null)
  const [songs, setSongs] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedOnlineTrack, setSelectedOnlineTrack] = useState(null)
  const [search, setSearch] = useState('')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.65)
  const [repeatQueue, setRepeatQueue] = useState(false)
  const [shuffleQueue, setShuffleQueue] = useState(false)
  const [message, setMessage] = useState('')
  const [playlists, setPlaylists] = useState(readPlaylists)
  const [trackMetadata, setTrackMetadata] = useState(readTrackMetadata)
  const [recentTracks, setRecentTracks] = useState(() => leerHistorialLocal('musica', userId))
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null)
  const [playlistName, setPlaylistName] = useState('')

  const selectedSong = songs[selectedIndex]
  const hasSelection = Boolean(selectedSong || selectedOnlineTrack)
  const filteredSongs = songs
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => {
      if (!selectedPlaylistId) return true
      const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId)
      return selectedPlaylist?.trackIds.includes(getLocalTrackId(file))
    })
    .filter(({ file }) => {
      const metadata = trackMetadata[getLocalTrackId(file)]
      const text = `${file.name} ${metadata?.artist || ''} ${metadata?.album || ''}`.toLowerCase()
      return text.includes(search.trim().toLowerCase())
    })
  const playbackQueue = [
    ...songs.map((file, index) => ({ id: `local-${index}`, type: 'local', index })),
    ...catalogResults.map((track) => ({ id: `online-${track.trackId}`, type: 'online', track })),
  ]
  const currentQueueId = selectedOnlineTrack
    ? `online-${selectedOnlineTrack.trackId}`
    : selectedSong ? `local-${selectedIndex}` : null
  const currentQueueIndex = playbackQueue.findIndex((item) => item.id === currentQueueId)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined

    let localUrl
    if (selectedOnlineTrack) {
      audio.src = selectedOnlineTrack.audioUrl
    } else if (selectedSong) {
      localUrl = URL.createObjectURL(selectedSong)
      audio.src = localUrl
    } else {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (autoplaySelectionRef.current) {
        autoplaySelectionRef.current = false
        audio.play().catch(() => {
          setPlaying(false)
          setMessage('No se pudo reproducir esta pista. Comprueba el formato o intenta con otra vista previa.')
        })
      }
      return undefined
    }

    audio.load()
    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [selectedSong, selectedOnlineTrack, repeatQueue])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = repeatQueue
  }, [repeatQueue])

  useEffect(() => () => searchControllerRef.current?.abort(), [])

  useEffect(() => {
    localStorage.setItem('autodash-playlists', JSON.stringify(playlists))
  }, [playlists])

  useEffect(() => {
    localStorage.setItem('autodash-track-metadata', JSON.stringify(trackMetadata))
  }, [trackMetadata])

  useEffect(() => {
    guardarHistorialLocal('musica', userId, recentTracks)
  }, [recentTracks, userId])

  function createPlaylist(event) {
    event.preventDefault()
    const name = playlistName.trim()
    if (!name) return
    const playlist = {
      id: `playlist-${Date.now()}`,
      name,
      trackIds: songs.map(getLocalTrackId),
      trackNames: songs.map((song) => getSongTitle(song.name)),
    }
    setPlaylists((current) => [...current, playlist])
    setSelectedPlaylistId(playlist.id)
    setPlaylistName('')
  }

  function addSongs(event) {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return

    const firstNewIndex = songs.length
    setSongs((currentSongs) => [...currentSongs, ...selectedFiles])
    if (selectedPlaylistId) {
      setPlaylists((current) => current.map((playlist) => playlist.id === selectedPlaylistId
        ? {
          ...playlist,
          trackIds: [...new Set([...playlist.trackIds, ...selectedFiles.map(getLocalTrackId)])],
          trackNames: [...new Set([...playlist.trackNames, ...selectedFiles.map((song) => getSongTitle(song.name))])],
        }
        : playlist))
    }
    if (selectedIndex < 0 && !selectedOnlineTrack) setSelectedIndex(firstNewIndex)
    setMessage('')
    event.target.value = ''
  }

  function resetPlaybackState() {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setMessage('')
  }

  function selectSong(index, autoplay = false) {
    autoplaySelectionRef.current = autoplay
    setSelectedIndex(index)
    setSelectedOnlineTrack(null)
    resetPlaybackState()
  }

  function selectOnlineTrack(track, autoplay = false) {
    autoplaySelectionRef.current = autoplay
    setSelectedOnlineTrack(track)
    setSelectedIndex(-1)
    resetPlaybackState()
  }

  function moveInQueue(direction) {
    if (playbackQueue.length < 2) return

    let targetIndex
    if (shuffleQueue) {
      const availableIndices = playbackQueue
        .map((_, index) => index)
        .filter((index) => index !== currentQueueIndex)
      targetIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else {
      const startIndex = currentQueueIndex < 0 ? (direction > 0 ? -1 : 0) : currentQueueIndex
      targetIndex = startIndex + direction
      if (targetIndex < 0 || targetIndex >= playbackQueue.length) {
        if (!repeatQueue) return
        targetIndex = (targetIndex + playbackQueue.length) % playbackQueue.length
      }
    }

    const target = playbackQueue[targetIndex]
    if (target.type === 'local') selectSong(target.index, true)
    else selectOnlineTrack(target.track, true)
  }

  async function searchCatalog(event) {
    event.preventDefault()
    const term = catalogQuery.trim()
    if (!term) {
      setCatalogError('Escribe una canción o artista para buscar.')
      setCatalogResults([])
      return
    }

    searchControllerRef.current?.abort()
    const controller = new AbortController()
    searchControllerRef.current = controller
    setCatalogLoading(true)
    setCatalogError('')

    const parameters = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${term} filetype:audio`,
      gsrnamespace: '6',
      gsrlimit: '25',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      format: 'json',
      origin: '*',
    })

    try {
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, {
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`La búsqueda respondió con el estado ${response.status}.`)

      const data = await response.json()
      const results = Object.values(data.query?.pages || [])
        .map((page) => {
          const file = page.imageinfo?.[0]
          const extension = page.title.split('.').pop()?.toLowerCase()
          if (!file?.url || !['ogg', 'mp3', 'wav', 'flac', 'm4a'].includes(extension)) return null
          return {
            trackId: page.pageid,
            trackName: getSongTitle(page.title.replace(/^File:/, '')),
            artistName: getPlainText(file.extmetadata?.Artist?.value) || 'Artista no especificado',
            audioUrl: file.url,
            trackViewUrl: file.descriptionurl,
            license: getPlainText(file.extmetadata?.LicenseShortName?.value) || 'Consulta la página del archivo',
            licenseUrl: file.extmetadata?.LicenseUrl?.value,
          }
        })
        .filter(Boolean)
      setCatalogResults(results)
      if (!results.length) setCatalogError('No encontramos archivos de música compatibles con esa búsqueda.')
    } catch (error) {
      if (error.name !== 'AbortError') {
        setCatalogResults([])
        setCatalogError('No se pudo buscar música. Revisa tu conexión e inténtalo de nuevo.')
      }
    } finally {
      if (!controller.signal.aborted) setCatalogLoading(false)
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio || !hasSelection) return

    if (audio.paused) {
      try {
        await audio.play()
        setMessage('')
      } catch {
        setPlaying(false)
        setMessage('No se pudo reproducir este audio. Puede que el formato no sea compatible o que la vista previa no esté disponible.')
      }
    } else {
      audio.pause()
    }
  }

  function stopPlayback() {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setCurrentTime(0)
  }

  function seek(event) {
    const time = Number(event.target.value)
    if (audioRef.current) audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const currentTitle = selectedOnlineTrack?.trackName || (selectedSong && getSongTitle(selectedSong.name))
  const currentMetadata = selectedSong ? trackMetadata[getLocalTrackId(selectedSong)] || {} : {}
  const currentArtist = selectedOnlineTrack?.artistName || currentMetadata.artist || ''
  const currentAlbum = currentMetadata.album || ''

  function updateCurrentMetadata(field, value) {
    if (!selectedSong) return
    const id = getLocalTrackId(selectedSong)
    setTrackMetadata((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  return (
    <section className="module-page media-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> CENTRO MULTIMEDIA</div>
          <h1>Multimedia<span>.</span></h1>
          <p>{mediaTab === 'music'
            ? 'Busca música de uso libre o reproduce archivos de audio de tu dispositivo.'
            : 'Explora videos y reproduce contenido desde YouTube.'}</p>
        </div>
        <span className="board-count"><Bluetooth size={15} /> {mediaTab === 'music' ? 'Música libre y audio local' : 'Biblioteca de videos'}</span>
      </div>

      <div className="media-tabs" role="group" aria-label="Secciones de multimedia">
        <button
          id="media-tab-music"
          className={`media-tab${mediaTab === 'music' ? ' active' : ''}`}
          type="button"
          aria-pressed={mediaTab === 'music'}
          aria-controls="media-panel-music"
          onClick={() => setMediaTab('music')}
        >
          <Music2 size={16} /> Música
        </button>
        <button
          id="media-tab-video"
          className={`media-tab${mediaTab === 'video' ? ' active' : ''}`}
          type="button"
          aria-pressed={mediaTab === 'video'}
          aria-controls="media-panel-video"
          onClick={() => setMediaTab('video')}
        >
          <Play size={16} /> Video
        </button>
      </div>

      <div id="media-panel-music" className="media-section" aria-labelledby="media-tab-music" hidden={mediaTab !== 'music'}>
        <div className="media-layout">
        <article className="panel media-playlists-panel">
          <div className="section-title"><div><span className="section-kicker">TU COLECCIÓN</span><h2>Listas de reproducción</h2></div><span className="playlist-count">{playlists.length}</span></div>
          <button type="button" className={`playlist-item${selectedPlaylistId === null ? ' selected' : ''}`} onClick={() => setSelectedPlaylistId(null)}>
            <span className="playlist-number"><Music2 size={14} /></span><span className="playlist-song"><strong>Toda mi música</strong><small>{songs.length} pistas en este dispositivo</small></span>
          </button>
          {playlists.map((playlist) => (
            <div className={`saved-playlist${selectedPlaylistId === playlist.id ? ' selected' : ''}`} key={playlist.id}>
              <button type="button" className="playlist-item" onClick={() => setSelectedPlaylistId(playlist.id)}>
                <span className="playlist-number"><Music2 size={14} /></span><span className="playlist-song"><strong>{playlist.name}</strong><small>{playlist.trackIds.length} pistas guardadas</small></span>
              </button>
              <button type="button" className="playlist-delete-button" aria-label={`Eliminar lista ${playlist.name}`} onClick={() => { setPlaylists((current) => current.filter((item) => item.id !== playlist.id)); if (selectedPlaylistId === playlist.id) setSelectedPlaylistId(null) }}>×</button>
            </div>
          ))}
          <form className="playlist-create-form" onSubmit={createPlaylist}>
            <label htmlFor="playlist-name">Crear una lista</label>
            <input id="playlist-name" value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} maxLength="50" placeholder="Nombre de la lista" />
            <button type="submit" className="secondary-button" disabled={!playlistName.trim()}>Crear</button>
            <small>Incluye los archivos locales añadidos actualmente.</small>
          </form>
        </article>
        <article className="panel media-player">
          <div className="album-art">
            <span className="album-sun" />
            <span className="album-horizon" />
            <span className="album-disc"><Music2 size={26} /></span>
            <small>A U T O D A S H&nbsp; R A D I O</small>
          </div>

          <div className="track-info" aria-live="polite">
            <span className="section-kicker">{selectedOnlineTrack ? 'AUDIO LIBRE EN LÍNEA' : selectedSong ? 'ARCHIVO DE TU DISPOSITIVO' : 'REPRODUCTOR DE AUDIO'}</span>
            <h2>{currentTitle || 'Selecciona una canción'}</h2>
            <p>{selectedOnlineTrack
              ? `${currentArtist} · ${selectedOnlineTrack.license}`
              : selectedSong ? `${currentArtist || 'Artista sin especificar'}${currentAlbum ? ` · ${currentAlbum}` : ''} · ${selectedSong.name}` : 'Busca música en línea o añade archivos desde tu dispositivo.'}</p>
            {selectedOnlineTrack?.trackViewUrl && (
              <a className="media-store-link" href={selectedOnlineTrack.trackViewUrl} target="_blank" rel="noreferrer">
                Ver archivo y atribución <ExternalLink size={12} />
              </a>
            )}
          </div>
          {selectedSong && <div className="track-metadata-editor">
            <label>Artista<input value={currentMetadata.artist || ''} maxLength="80" placeholder="Añadir artista" onChange={(event) => updateCurrentMetadata('artist', event.target.value)} /></label>
            <label>Álbum<input value={currentMetadata.album || ''} maxLength="80" placeholder="Añadir álbum" onChange={(event) => updateCurrentMetadata('album', event.target.value)} /></label>
          </div>}

          <audio
            ref={audioRef}
            preload="metadata"
            onCanPlay={() => setMessage('')}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => {
              setPlaying(true)
              if (!currentTitle) return
              const trackId = selectedOnlineTrack
                ? `online-${selectedOnlineTrack.trackId}`
                : `local-${getLocalTrackId(selectedSong)}`
              setRecentTracks((current) => agregarElementoReciente(current, {
                id: trackId,
                title: currentTitle,
                artist: currentArtist || 'Artista no especificado',
                source: selectedOnlineTrack ? 'En línea' : 'Archivo local',
                playedAt: new Date().toISOString(),
              }, 20))
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => {
              if (hasSelection) {
                setPlaying(false)
                setMessage('No se puede reproducir este audio. Comprueba el formato o intenta con otra vista previa.')
              }
            }}
          />

          <div className="audio-progress">
            <input
              type="range"
              aria-label="Progreso de reproducción"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={seek}
              disabled={!hasSelection || !duration}
            />
          </div>
          <div className="audio-times"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>

          <div className="player-controls">
            <button className={`icon-button queue-mode-button${shuffleQueue ? ' selected' : ''}`} aria-label="Reproducción aleatoria" title="Reproducción aleatoria" aria-pressed={shuffleQueue} onClick={() => setShuffleQueue((enabled) => !enabled)} disabled={playbackQueue.length < 2}>
              <Shuffle size={16} />
            </button>
            <button className="icon-button" aria-label="Pista anterior" title="Pista anterior" onClick={() => moveInQueue(-1)} disabled={playbackQueue.length < 2}>
              <SkipBack size={17} fill="currentColor" />
            </button>
            <button className="play-button" aria-label={playing ? 'Pausar' : 'Reproducir'} onClick={togglePlayback} disabled={!hasSelection}>
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button className="icon-button" aria-label="Pista siguiente" title="Pista siguiente" onClick={() => moveInQueue(1)} disabled={playbackQueue.length < 2}>
              <SkipForward size={17} fill="currentColor" />
            </button>
            <button className={`icon-button queue-mode-button${repeatQueue ? ' selected' : ''}`} aria-label="Repetir pista" title="Repetir pista" aria-pressed={repeatQueue} onClick={() => setRepeatQueue((enabled) => !enabled)} disabled={!hasSelection}>
              <Repeat size={16} />
            </button>
            <button className="icon-button" aria-label="Detener audio" title="Detener audio" onClick={stopPlayback} disabled={!hasSelection}>
              <Square size={15} fill="currentColor" />
            </button>
          </div>

          <div className="volume-control">
            <Volume2 size={16} />
            <input type="range" aria-label="Volumen" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
          </div>
          {message && <p className="media-message" role="alert">{message}</p>}
          <section className="media-recent-history" aria-labelledby="recent-music-heading">
            <div className="media-library-heading">
              <div><span className="section-kicker">SOLO EN ESTE DISPOSITIVO</span><h2 id="recent-music-heading">Reproducido recientemente</h2></div>
              <span className="playlist-count">{recentTracks.length}</span>
            </div>
            {recentTracks.length ? (
              <ul>
                {recentTracks.slice(0, 8).map((track) => (
                  <li key={`${track.id}-${track.playedAt}`}>
                    <span><strong>{track.title}</strong><small>{track.artist} · {track.source}</small></span>
                    <time dateTime={track.playedAt}>{formatActivityDate(track.playedAt)}</time>
                  </li>
                ))}
              </ul>
            ) : <p className="media-empty">Las canciones aparecerán aquí cuando las reproduzcas.</p>}
          </section>
          <p className="media-disclaimer">El catálogo contiene archivos de audio con licencia abierta de Wikimedia Commons; se requiere conexión a Internet y se muestra la atribución disponible.</p>
        </article>

        <article className="panel playlist-panel">
          <div className="media-source-grid">
          <section className="media-source-column media-online-source" aria-label="Catálogo de música en línea">
          <div className="section-title">
            <div><span className="section-kicker">CATÁLOGO EN LÍNEA</span><h2>Buscar música</h2></div>
            <span className="playlist-count">Wikimedia Commons</span>
          </div>

          <form className="media-search-form" onSubmit={searchCatalog}>
            <label className="media-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Busca por título o artista"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                aria-label="Buscar audio libre por título o artista"
              />
            </label>
            <button className="secondary-button media-search-button" type="submit" disabled={catalogLoading}>
              {catalogLoading ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          {catalogError && <p className="media-search-status" role="status">{catalogError}</p>}
          {catalogResults.length > 0 && (
            <div className="media-playlist media-catalog-results" aria-label="Resultados de música en línea">
              {catalogResults.map((track) => (
                <div className={`playlist-item media-catalog-item${selectedOnlineTrack?.trackId === track.trackId ? ' selected' : ''}`} key={track.trackId}>
                  <button
                    className="media-track-select"
                    onClick={() => selectOnlineTrack(track)}
                    aria-label={`Reproducir ${track.trackName} de ${track.artistName}`}
                    aria-current={selectedOnlineTrack?.trackId === track.trackId ? 'true' : undefined}
                  >
                    <span className="playlist-number"><Music2 size={14} /></span>
                    <span className="playlist-song"><strong>{track.trackName}</strong><small>{track.artistName}</small></span>
                  </button>
                  {track.trackViewUrl && <a className="media-track-link" href={track.trackViewUrl} target="_blank" rel="noreferrer" aria-label={`Ver licencia y detalles de ${track.trackName} en Wikimedia Commons`}><ExternalLink size={14} /></a>}
                </div>
              ))}
            </div>
          )}

          </section>
          <section className="media-source-column media-local-source" aria-label="Biblioteca de audio local">
          <div className="media-library-heading">
            <div><span className="section-kicker">TU DISPOSITIVO</span><h2>{selectedPlaylistId ? playlists.find((playlist) => playlist.id === selectedPlaylistId)?.name || 'Lista' : 'Archivos locales'}</h2></div>
            <span className="playlist-count">{songs.length} {songs.length === 1 ? 'pista' : 'pistas'}</span>
          </div>
          <label className="media-search">
            <Search size={16} />
            <input type="search" placeholder="Filtrar archivos locales" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Filtrar archivos locales" />
          </label>

          <input
            ref={fileInputRef}
            className="media-file-input"
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
            multiple
            onChange={addSongs}
            aria-label="Seleccionar archivos de audio"
          />
          <button className="secondary-button media-add-button" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen size={16} /> Añadir audio
          </button>

          <div className="media-playlist">
            {filteredSongs.map(({ file, index }) => (
              <button
                key={getLocalTrackId(file)}
                className={`playlist-item${!selectedOnlineTrack && selectedIndex === index ? ' selected' : ''}`}
                onClick={() => selectSong(index)}
                aria-current={!selectedOnlineTrack && selectedIndex === index ? 'true' : undefined}
              >
                <span className="playlist-number">{!selectedOnlineTrack && selectedIndex === index && playing ? <span className="playing-bars"><i /><i /><i /></span> : <Music2 size={14} />}</span>
                <span className="playlist-song"><strong>{getSongTitle(file.name)}</strong><small>{trackMetadata[getLocalTrackId(file)]?.artist || trackMetadata[getLocalTrackId(file)]?.album || file.name}</small></span>
              </button>
            ))}
            {songs.length === 0 && <p className="media-empty">Añade archivos si quieres reproducir música guardada en tu dispositivo.</p>}
            {songs.length > 0 && selectedPlaylistId && filteredSongs.length === 0 && <p className="media-empty">Los archivos de esta lista no están cargados en esta sesión. Vuelve a seleccionar los archivos originales.</p>}
            {songs.length > 0 && filteredSongs.length === 0 && <p className="media-empty">No se encontraron archivos con esa búsqueda.</p>}
          </div>
          </section>
          </div>
        </article>
        </div>
      </div>

      <div id="media-panel-video" className="media-section" aria-labelledby="media-tab-video" hidden={mediaTab !== 'video'}>
        <SeccionVideos userId={userId} isVideoPlayerLocked={isVideoPlayerLocked} />
      </div>
    </section>
  )
}
