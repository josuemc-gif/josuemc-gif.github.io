import { useMemo, useState } from 'react'
import { Navigation, Route } from 'lucide-react'
import { BotonTrayecto } from '../panel/boton_trayecto/boton_trayecto'
import { consumoDesdeKwh100Km, distanciaDesdeKm } from '../../utilidades/unidades'
import './trayectos.css'

export function SeccionTrayectos({ trips, deleteTrip, tripStarted, toggleTrip, startGps, setView, units = 'metric' }) {
  const [now] = useState(() => Date.now())
  const [tab, setTab] = useState('list')
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('all')
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const filteredTrips = useMemo(() => trips.filter((trip) => {
    const matchesText = `${trip.route || ''} ${trip.date || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    if (!matchesText) return false
    if (period === 'all') return true
    const tripDate = new Date(trip.startedAt || trip.id)
    if (!Number.isFinite(tripDate.getTime())) return false
    const range = period === 'week' ? 7 : 30
    const age = now - tripDate.getTime()
    return age >= 0 && age <= range * 24 * 60 * 60 * 1000
  }), [now, trips, query, period])
  const distanceTotalKm = trips.reduce((total, trip) => total + Number(trip.distance || 0), 0)
  const tripsWithConsumption = trips.filter((trip) => Number.isFinite(Number(trip.consumptionRate)) && Number(trip.consumptionRate) > 0)
  const averageConsumption = distanceTotalKm > 0 && tripsWithConsumption.length
    ? tripsWithConsumption.reduce((total, trip) => total + Number(trip.consumptionRate) * Number(trip.distance), 0) /
      tripsWithConsumption.reduce((total, trip) => total + Number(trip.distance), 0)
    : null
  const displayDistanceTotal = distanciaDesdeKm(distanceTotalKm, units)
  const displayConsumption = averageConsumption === null ? null : consumoDesdeKwh100Km(averageConsumption, units)

  return (
    <section className="module-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> REGISTRO DE ACTIVIDAD</div>
          <h1>Trayectos<span>.</span></h1>
          <p>Distancias registradas desde tu dispositivo. Este historial se guarda localmente y no se sincroniza con otros equipos.</p>
        </div>
        <BotonTrayecto iniciado={tripStarted} alAlternar={toggleTrip} />
      </div>

      <div className="history-summary">
        <article className="panel">
          <span className="section-kicker">TRAYECTOS GUARDADOS</span>
          <strong>{trips.length}</strong>
        </article>
        <article className="panel">
          <span className="section-kicker">DISTANCIA REGISTRADA</span>
          <strong>{displayDistanceTotal.value.toFixed(2)} <small>{displayDistanceTotal.unit}</small></strong>
        </article>
        <article className="panel">
          <span className="section-kicker">CONSUMO PROMEDIO</span>
          {displayConsumption
            ? <strong>{displayConsumption.toFixed(1)} <small>kWh/100 {displayDistanceTotal.unit}</small></strong>
            : <strong className="history-unavailable">Sin datos registrados</strong>}
          {displayConsumption && <small className="history-simulation-note">Estimado con la configuración de demostración.</small>}
        </article>
      </div>

      <article className="panel history-table">
        <div className="section-title">
          <div><span className="section-kicker">HISTORIAL</span><h2>Todos tus trayectos</h2></div>
        </div>
        <div className="history-tabs" role="group" aria-label="Vista del historial">
          <button type="button" aria-pressed={tab === 'list'} className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>Lista de trayectos</button>
          <button type="button" aria-pressed={tab === 'summary'} className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>Resumen</button>
        </div>

        {tab === 'list' && trips.length > 0 && <div className="history-filters">
          <label><span>Filtrar por ruta o fecha</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar trayectos" /></label>
          <label><span>Periodo</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todo el historial</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option></select></label>
        </div>}

        {tab === 'summary' ? (
          <div className="history-summary-detail">
            <p><strong>{trips.length}</strong><span>trayectos registrados</span></p>
            <p><strong>{displayDistanceTotal.value.toFixed(2)} {displayDistanceTotal.unit}</strong><span>distancia acumulada</span></p>
            <p><strong>{displayConsumption ? `${displayConsumption.toFixed(1)} kWh/100 ${displayDistanceTotal.unit}` : 'Sin datos'}</strong><span>consumo promedio de demostración</span></p>
          </div>
        ) : filteredTrips.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>FECHA</th><th>RUTA</th><th>DISTANCIA</th><th>DURACIÓN</th><th>CONSUMO ELÉCTRICO</th><th>ACCIONES</th></tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.date}</td>
                    <td>{trip.route || 'Sin ruta registrada'}</td>
                    <td>{distanciaDesdeKm(Number(trip.distance), units).value.toFixed(2)} {distanciaDesdeKm(Number(trip.distance), units).unit}</td>
                    <td>{trip.duration}</td>
                    <td>{Number.isFinite(Number(trip.consumptionRate)) && trip.consumptionRate != null ? `${consumoDesdeKwh100Km(Number(trip.consumptionRate), units).toFixed(1)} kWh/100 ${displayDistanceTotal.unit} · demo` : trip.consumption}</td>
                    <td className="trip-actions"><button type="button" className="text-action" onClick={() => setSelectedTrip(trip)} aria-label={`Ver detalles de ${trip.route || 'trayecto'}`}>Detalles</button>{confirmDelete === trip.id ? <><button type="button" className="text-action danger-action" onClick={() => { deleteTrip(trip.id); setConfirmDelete(null); if (selectedTrip?.id === trip.id) setSelectedTrip(null) }}>Confirmar</button><button type="button" className="text-action" onClick={() => setConfirmDelete(null)}>Cancelar</button></> : <button type="button" className="text-action danger-action" onClick={() => setConfirmDelete(trip.id)} aria-label={`Eliminar ${trip.route || 'trayecto'}`}>Eliminar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'list' && trips.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Route size={20} /></span>
            <strong>Tu primer trayecto empieza aquí</strong>
            <span>Inicia un trayecto con el GPS activo para guardar la distancia recorrida.</span>
            <button className="secondary-button" onClick={() => { setView('dashboard'); startGps() }}><Navigation size={15} /> Activar GPS</button>
          </div>
        ) : <p className="history-empty-filter">No hay trayectos que coincidan con el filtro.</p>}
        {selectedTrip && <aside className="selected-trip-detail" aria-live="polite">
          <div><strong>Detalle del trayecto</strong><button className="text-action" type="button" onClick={() => setSelectedTrip(null)}>Cerrar</button></div>
          <span>{selectedTrip.route || 'Sin ruta registrada'} · {selectedTrip.date}</span>
          <span>{distanciaDesdeKm(Number(selectedTrip.distance), units).value.toFixed(2)} {distanciaDesdeKm(Number(selectedTrip.distance), units).unit} · {selectedTrip.duration} · {selectedTrip.consumption}</span>
        </aside>}
      </article>
    </section>
  )
}
