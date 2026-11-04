import { useState } from 'react'
import { BatteryCharging, Check, CircleAlert, Plus, Wrench, Zap } from 'lucide-react'
import './mantenimiento.css'

const urgencyLabels = { urgent: 'Prioritario / urgente', medium: 'Nivel medio', low: 'No prioritario' }
const urgencyExamples = [
  { id: 'low-charge', urgency: 'low', system: 'BATERÍA', title: 'Batería con carga baja', detail: 'Aún queda autonomía suficiente para terminar el trayecto.' },
  { id: 'oil-change', urgency: 'low', system: 'MOTOR', title: 'Cambio de aceite', detail: 'Ejemplo para vehículos de combustión; no aplica a este vehículo eléctrico.' },
  { id: 'coolant', urgency: 'medium', system: 'REFRIGERACIÓN', title: 'Nivel de refrigerante bajo', detail: 'Sin alerta de temperatura ni mensaje crítico.' },
  { id: 'tire-pressure', urgency: 'medium', system: 'NEUMÁTICOS', title: 'Presión baja en un neumático', detail: 'Pérdida lenta, sin daño visible ni desinflado rápido.' },
  { id: 'motor-fault', urgency: 'urgent', system: 'MOTOR ELÉCTRICO', title: 'Falla del motor eléctrico', detail: 'Pérdida de potencia o alerta que impide conducir con normalidad.' },
  { id: 'electrical-fault', urgency: 'urgent', system: 'SISTEMA ELÉCTRICO', title: 'Falla eléctrica de alto voltaje', detail: 'Alerta crítica o vehículo que no inicia. No manipular; solicitar asistencia.' },
]
const urgencyGroups = [
  { urgency: 'low', title: 'No prioritario' },
  { urgency: 'medium', title: 'Nivel medio' },
  { urgency: 'urgent', title: 'Prioritario / urgente' },
]
const systems = [
  { name: 'Batería', key: 'BATERÍA DE TRACCIÓN', icon: BatteryCharging },
  { name: 'Sistema eléctrico', key: 'SISTEMA ELÉCTRICO', icon: Zap },
  { name: 'Frenos', key: 'FRENOS', icon: CircleAlert },
  { name: 'Neumáticos', key: 'NEUMÁTICOS', icon: Wrench },
  { name: 'Luces', key: 'ILUMINACIÓN', icon: Check },
]

export function SeccionMantenimiento({ tasks, addTask }) {
  const [formOpen, setFormOpen] = useState(false)
  const [examplePriorities, setExamplePriorities] = useState(() => Object.fromEntries(urgencyExamples.map(({ id, urgency }) => [id, urgency])))
  const tareasCompletadas = tasks.filter((task) => task.status === 'Completado')
  const completadas = tareasCompletadas.length

  return (
    <section className="module-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> CUIDADO DEL VEHÍCULO ELÉCTRICO</div>
          <h1>Mantenimiento<span>.</span></h1>
          <p>Revisiones eléctricas y de seguridad, organizadas por estado.</p>
        </div>
        <div className="maintenance-heading-actions">
          <span className="board-count"><Wrench size={15} /> {tasks.length} tareas</span>
          <button className="trip-button" type="button" onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen}>
            <Plus size={15} /> {formOpen ? 'Cancelar' : 'Agregar revisión'}
          </button>
        </div>
      </div>

      <div className="maintenance-summary">
        {systems.map(({ name, key, icon: Icon }) => {
          const systemTasks = tasks.filter((task) => task.system === key)
          const percent = systemTasks.length
            ? Math.round((systemTasks.filter((task) => task.status === 'Completado').length / systemTasks.length) * 100)
            : 0
          return (
            <article className="panel maintenance-health-card" key={key}>
              <span className="maintenance-health-ring" style={{ '--health': `${percent}%` }}><strong>{percent}%</strong></span>
              <span className="maintenance-health-label"><Icon size={14} /><strong>{name}</strong><small>{systemTasks.length ? `${systemTasks.length} revisiones` : 'Sin revisiones'}</small></span>
            </article>
          )
        })}
      </div>

      {formOpen && (
        <form className="panel maintenance-add-form" onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const data = new FormData(form)
          addTask({ title: data.get('title'), system: data.get('system'), detail: data.get('detail'), urgency: data.get('urgency') })
          form.reset()
          setFormOpen(false)
        }}>
          <label>Nombre de la revisión<input required name="title" maxLength="90" placeholder="Ej. Inspección de conectores" /></label>
          <label>Sistema<select name="system">{systems.map((system) => <option key={system.key} value={system.key}>{system.name}</option>)}</select></label>
          <label>Detalle (opcional)<input name="detail" maxLength="140" placeholder="Fecha, kilometraje o notas" /></label>
          <label>Prioridad<select name="urgency" defaultValue="medium"><option value="urgent">Prioritario / urgente</option><option value="medium">Nivel medio</option><option value="low">No prioritario</option></select></label>
          <button className="trip-button" type="submit"><Plus size={15} /> Guardar revisión</button>
        </form>
      )}

      <p className="maintenance-telemetry-note" role="note">
        Los porcentajes representan revisiones completadas, no salud del componente. Los estados son manuales y no equivalen a diagnóstico del vehículo.
      </p>

      <section className="maintenance-priority-guide" aria-labelledby="maintenance-priority-title">
        <div className="maintenance-priority-heading">
          <span className="section-kicker">EJEMPLOS DE CLASIFICACIÓN</span>
          <h2 id="maintenance-priority-title">Identifica el nivel del problema</h2>
        </div>
        <div className="maintenance-priority-levels">
          {urgencyGroups.map(({ urgency, title }) => (
            <section className={`maintenance-priority-group maintenance-priority-group--${urgency}`} key={urgency}>
              <h3>{title}</h3>
              <div className="maintenance-priority-examples">
                {urgencyExamples.filter((example) => example.urgency === urgency).map((example) => {
                  const currentUrgency = examplePriorities[example.id]
                  return (
                    <article className={`task-card task-card--${currentUrgency} maintenance-example-card`} key={example.id}>
                      <span className="task-type"><Wrench size={13} /> {example.system}</span>
                      <span className={`task-urgency task-urgency--${currentUrgency}`}>{urgencyLabels[currentUrgency]}</span>
                      <h4>{example.title}</h4>
                      <p>{example.detail}</p>
                      <label className="task-priority">
                        Prioridad
                        <select
                          aria-label={`Prioridad del ejemplo: ${example.title}`}
                          value={currentUrgency}
                          onChange={(event) => setExamplePriorities((current) => ({ ...current, [example.id]: event.target.value }))}
                        >
                          <option value="urgent">Prioritario / urgente</option>
                          <option value="medium">Nivel medio</option>
                          <option value="low">No prioritario</option>
                        </select>
                      </label>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
        <p className="maintenance-priority-warning">Ejemplos orientativos, no diagnósticos. Ante una alerta crítica o riesgo inmediato, detente en un lugar seguro y solicita asistencia.</p>
      </section>

      <article className="panel maintenance-history">
        <div className="section-title">
          <div><span className="section-kicker">REGISTRO DE REVISIONES</span><h2>Historial de mantenimiento</h2></div>
          <span className="board-count">{completadas} completadas</span>
        </div>
        {tareasCompletadas.length ? (
          <ul className="maintenance-history-list">
            {tareasCompletadas.map((task) => (
              <li key={task.id}>
                <span className="maintenance-history-check"><Check size={14} /></span>
                <span><strong>{task.title}</strong><small>{task.system || 'Mantenimiento'} · {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Completado manualmente'}</small></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="maintenance-history-empty">Las tareas completadas aparecerán aquí. Las tareas antiguas no contienen fecha de finalización.</p>
        )}
      </article>
    </section>
  )
}
