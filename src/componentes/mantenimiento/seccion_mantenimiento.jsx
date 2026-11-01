import { useState } from 'react'
import { BatteryCharging, Check, CircleAlert, Plus, Trash2, Wrench, Zap } from 'lucide-react'
import './mantenimiento.css'

const columns = ['Pendiente', 'En curso', 'Completado']
const systems = [
  { name: 'Batería', key: 'BATERÍA DE TRACCIÓN', icon: BatteryCharging },
  { name: 'Sistema eléctrico', key: 'SISTEMA ELÉCTRICO', icon: Zap },
  { name: 'Frenos', key: 'FRENOS', icon: CircleAlert },
  { name: 'Neumáticos', key: 'NEUMÁTICOS', icon: Wrench },
  { name: 'Luces', key: 'ILUMINACIÓN', icon: Check },
]

export function SeccionMantenimiento({ tasks, moveTask, addTask, deleteTask }) {
  const [formOpen, setFormOpen] = useState(false)
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
          addTask({ title: data.get('title'), system: data.get('system'), detail: data.get('detail') })
          form.reset()
          setFormOpen(false)
        }}>
          <label>Nombre de la revisión<input required name="title" maxLength="90" placeholder="Ej. Inspección de conectores" /></label>
          <label>Sistema<select name="system">{systems.map((system) => <option key={system.key} value={system.key}>{system.name}</option>)}</select></label>
          <label>Detalle (opcional)<input name="detail" maxLength="140" placeholder="Fecha, kilometraje o notas" /></label>
          <button className="trip-button" type="submit"><Plus size={15} /> Guardar revisión</button>
        </form>
      )}

      <p className="maintenance-telemetry-note" role="note">
        Los porcentajes representan revisiones completadas, no salud del componente. Los estados son manuales y no equivalen a diagnóstico del vehículo.
      </p>

      <div className="kanban-board">
        {columns.map((column) => (
          <section className="kanban-column" key={column}>
            <div className="kanban-heading">
              <span className={`column-dot ${column.toLowerCase().replace(' ', '-')}`} />
              <h2>{column}</h2>
              <span className="column-count">{tasks.filter((task) => task.status === column).length}</span>
            </div>

            {tasks.filter((task) => task.status === column).map((task) => (
              <article className="task-card" key={task.id}>
                <span className="task-type"><Wrench size={13} /> {task.system || 'SISTEMA ELÉCTRICO'}</span>
                <h3>{task.title}</h3>
                <p>{task.detail}</p>
                <label className="task-move">
                  Mover a
                  <select aria-label={`Estado de ${task.title}`} value={task.status} onChange={(event) => moveTask(task.id, event.target.value)}>
                    {columns.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                {task.custom && <button className="maintenance-delete-task" type="button" onClick={() => deleteTask(task.id)} aria-label={`Eliminar ${task.title}`}><Trash2 size={14} /></button>}
              </article>
            ))}

            {!tasks.some((task) => task.status === column) && <div className="column-empty">Sin tareas</div>}
          </section>
        ))}
      </div>

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
