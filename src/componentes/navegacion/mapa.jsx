import { useEffect, useRef, useState } from 'react'
import { LocateFixed, LoaderCircle, MapPin, MapPinned, Route } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatearDuracion } from '../../utilidades/formateadores'
import { distanciaDesdeKm } from '../../utilidades/unidades'
import './navegacion.css'

export function Mapa({ position, destination, onRouteReady, gpsStatus, darkMode = false, units = 'metric' }) {
  const [mapNode, setMapNode] = useState(null)
  const mapStateRef = useRef(null)
  const [routeOptions, setRouteOptions] = useState([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [routeError, setRouteError] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const routeKey = destination?.origin
    ? `${destination.origin.lat},${destination.origin.lng};${destination.lat},${destination.lon}`
    : ''
  const selectedOption = routeOptions[selectedRouteIndex]
  const routeSummary = selectedOption?.key === routeKey && routeKey ? selectedOption.summary : null

  useEffect(() => {
    if (!mapNode) return undefined

    const worldBounds = L.latLngBounds([-85.0511, -180], [85.0511, 180])
    const minimumZoom = Math.max(2, Math.ceil(Math.log2(mapNode.clientWidth / 256)))
    const map = L.map(mapNode, {
      zoomControl: false,
      minZoom: minimumZoom,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1,
      worldCopyJump: false,
    }).setView([20, 0], 2)
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.scale({ position: 'bottomleft', maxWidth: 120, metric: true, imperial: false }).addTo(map)

    const vehicleIcon = L.divIcon({
      className: 'vehicle-marker',
      html: '<span></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })
    const destinationIcon = L.divIcon({
      className: 'destination-marker',
      html: '<span></span>',
      iconSize: [28, 36],
      iconAnchor: [14, 33],
    })

    mapStateRef.current = { map, baseLayer: null, marker: null, destinationMarker: null, routes: [], vehicleIcon, destinationIcon }
    requestAnimationFrame(() => map.invalidateSize())

    return () => map.remove()
  }, [mapNode])

  useEffect(() => {
    const mapState = mapStateRef.current
    if (!mapNode || !mapState) return undefined

    const tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        noWrap: true,
        bounds: L.latLngBounds([-85.0511, -180], [85.0511, 180]),
      },
    ).addTo(mapState.map)
    mapState.baseLayer = tileLayer

    return () => {
      if (mapState.baseLayer === tileLayer) mapState.baseLayer = null
      mapState.map.removeLayer(tileLayer)
    }
  }, [darkMode, mapNode])

  useEffect(() => {
    const mapState = mapStateRef.current
    if (!mapState || !position) return

    const point = [position.lat, position.lng]
    if (mapState.marker) mapState.marker.setLatLng(point)
    else mapState.marker = L.marker(point, { icon: mapState.vehicleIcon }).addTo(mapState.map)

    if (!mapState.routes.length) mapState.map.setView(point, Math.max(mapState.map.getZoom(), 14))
  }, [position])

  useEffect(() => {
    const mapState = mapStateRef.current
    const option = routeOptions[selectedRouteIndex]
    if (!mapState || !option || option.key !== routeKey || !mapState.routes[selectedRouteIndex]) return

    mapState.routes.forEach(({ line }, index) => {
      line.setStyle({
        color: index === selectedRouteIndex
          ? (darkMode ? '#00c8ff' : '#0878d1')
          : (darkMode ? '#6d879a' : '#8c9da0'),
        weight: index === selectedRouteIndex ? 7 : 5,
        opacity: index === selectedRouteIndex ? 1 : 0.72,
      })
    })
    mapState.map.fitBounds(mapState.routes[selectedRouteIndex].line.getBounds(), { padding: [64, 64] })
    const distance = distanciaDesdeKm(Number(option.summary.distance), units)
    onRouteReady?.({ ...option.summary, distanceLabel: `${distance.value.toFixed(1)} ${distance.unit}` })
  }, [darkMode, routeKey, routeOptions, selectedRouteIndex, onRouteReady, units])

  useEffect(() => {
    const mapState = mapStateRef.current
    if (!mapState) return undefined

    if (!destination?.origin || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lon)) {
      mapState.routes.forEach(({ line, halo }) => {
        mapState.map.removeLayer(line)
        mapState.map.removeLayer(halo)
      })
      mapState.routes = []
      if (mapState.destinationMarker) mapState.map.removeLayer(mapState.destinationMarker)
      mapState.destinationMarker = null
      return undefined
    }

    let cancelled = false

    const fetchRoute = async () => {
      setRouteError('')
      setRouteOptions([])
      setSelectedRouteIndex(0)
      setRouteLoading(true)
      mapState.routes.forEach(({ line, halo }) => {
        mapState.map.removeLayer(line)
        mapState.map.removeLayer(halo)
      })
      mapState.routes = []
      if (mapState.destinationMarker) mapState.map.removeLayer(mapState.destinationMarker)
      mapState.destinationMarker = L.marker([destination.lat, destination.lon], {
        icon: mapState.destinationIcon,
        zIndexOffset: 1000,
        title: destination.name,
        alt: `Destino: ${destination.name}`,
      }).addTo(mapState.map)

      try {
        const routeResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${destination.origin.lng},${destination.origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&alternatives=true`,
        )

        if (!routeResponse.ok) throw new Error('No se pudo calcular la ruta.')

        const routeData = await routeResponse.json()
        if (!routeData.routes?.length) throw new Error('No hay una ruta disponible para ese destino.')

        if (cancelled) return

        const options = routeData.routes.map((route, index) => {
          const duration = Math.max(1, Math.round(route.duration / 60))
          const summary = {
            distance: (route.distance / 1000).toFixed(1),
            duration,
            durationLabel: formatearDuracion(duration),
            arrival: new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(
              new Date(Date.now() + duration * 60000),
            ),
            name: destination.name,
          }
          const halo = L.geoJSON(route.geometry, {
            style: {
              color: darkMode ? '#061426' : '#ffffff',
              weight: index === 0 ? 13 : 10,
              opacity: 0.94,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }).addTo(mapState.map)
          const line = L.geoJSON(route.geometry, {
            style: {
              color: index === 0 ? (darkMode ? '#00c8ff' : '#0878d1') : (darkMode ? '#6d879a' : '#8c9da0'),
              weight: index === 0 ? 7 : 5,
              opacity: index === 0 ? 1 : 0.72,
              lineCap: 'round',
              lineJoin: 'round',
            },
          }).addTo(mapState.map)
          line.on('click', () => setSelectedRouteIndex(index))
          halo.on('click', () => setSelectedRouteIndex(index))
          return { summary, line, halo }
        })

        mapState.routes = options.map(({ line, halo }) => ({ line, halo }))
        setRouteOptions(options.map(({ summary }) => ({ summary, key: routeKey })))
        setSelectedRouteIndex(0)
      } catch (error) {
        if (!cancelled) setRouteError(error.message)
      } finally {
        if (!cancelled) setRouteLoading(false)
      }
    }

    fetchRoute()
    return () => {
      cancelled = true
    }
  }, [darkMode, destination, routeKey])

  return (
    <div className={`map-frame${darkMode ? ' map-frame-dark' : ''}`}>
      <div className="map-canvas" ref={setMapNode} />
      <div className="map-live-badge">
        <span className={`map-live-indicator${position ? ' active' : ''}`} />
        <span><strong>MAPA EN VIVO</strong><small>{position ? 'Ubicación actualizada' : 'Vista general'}</small></span>
      </div>
      {position && (
        <div className="map-legend" aria-label="Referencias del mapa">
          <span><i className="map-legend-location" /> Tu ubicación</span>
          {routeSummary && <span><i className="map-legend-route" /> Ruta seleccionada</span>}
          {routeSummary && <span><i className="map-legend-destination" /> Destino</span>}
        </div>
      )}
      <div className="map-brand-stamp"><MapPinned size={14} /><span>AutoDash <i>MAPS</i></span></div>
      {position && (
        <button
          className="map-center-button"
          type="button"
          aria-label="Centrar mapa en mi ubicación"
          title="Centrar mapa en mi ubicación"
          onClick={() => mapStateRef.current?.map.setView([position.lat, position.lng], Math.max(mapStateRef.current.map.getZoom(), 14))}
        >
          <LocateFixed size={17} />
        </button>
      )}

      {!position && (
        <div className="map-notice">
          <MapPin size={16} />
          <span>
            <strong>{gpsStatus === 'insecure' ? 'GPS no disponible' : 'Conecta tu ubicación'}</strong>
            <small>{gpsStatus === 'insecure' ? 'El GPS requiere una dirección HTTPS.' : 'Activa el GPS para centrar el mapa y calcular rutas.'}</small>
          </span>
        </div>
      )}

      {routeLoading && destination?.origin && (
        <div className="route-loading">
          <LoaderCircle size={15} className="spin" />
          Calculando ruta y hora de llegada…
        </div>
      )}

      {routeSummary && destination?.name === routeSummary.name && (
        <div className="route-summary">
          <div className="route-summary-main">
            <Route size={16} />
            <span className="route-arrival">
              <strong>{routeSummary.arrival}</strong>
              <small>Hora estimada de llegada</small>
            </span>
            <span className="route-separator" />
            <span className="route-duration">
              <strong>{routeSummary.durationLabel}</strong>
              <small>{distanciaDesdeKm(Number(routeSummary.distance), units).value.toFixed(1)} {distanciaDesdeKm(Number(routeSummary.distance), units).unit}</small>
            </span>
            <small className="route-destination-name">{routeSummary.name}</small>
          </div>
          {routeOptions.length > 1 && (
            <div className="route-alternatives" role="group" aria-label="Rutas disponibles">
              {routeOptions.map(({ summary }, index) => (
                <button
                  type="button"
                  key={`${summary.distance}-${summary.duration}-${index}`}
                  className={`route-alternative${index === selectedRouteIndex ? ' selected' : ''}`}
                  aria-pressed={index === selectedRouteIndex}
                  onClick={() => setSelectedRouteIndex(index)}
                >
                  <strong>Ruta {index + 1}</strong>
                  <span>{summary.durationLabel} · {distanciaDesdeKm(Number(summary.distance), units).value.toFixed(1)} {distanciaDesdeKm(Number(summary.distance), units).unit}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {routeError && <div className="route-error">{routeError}</div>}
    </div>
  )
}
