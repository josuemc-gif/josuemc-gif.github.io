import { useEffect, useState } from 'react'

const tareasIniciales = [
  { id: 'battery', system: 'BATERÍA DE TRACCIÓN', title: 'Diagnóstico de batería de tracción', detail: 'Estado de salud y carga · requiere telemetría', status: 'Pendiente', urgency: 'medium' },
  { id: 'electrical', system: 'SISTEMA ELÉCTRICO', title: 'Revisar sistema eléctrico de alto voltaje', detail: 'Conectores y aislamiento · inspección manual', status: 'Pendiente', urgency: 'medium' },
  { id: 'brakes', system: 'FRENOS', title: 'Revisar sistema de frenos', detail: 'Pastillas, discos y respuesta · inspección manual', status: 'Completado', urgency: 'medium' },
  { id: 'tires', system: 'NEUMÁTICOS', title: 'Revisar presión y desgaste de neumáticos', detail: 'Presión y banda de rodadura · inspección manual', status: 'Pendiente', urgency: 'medium' },
  { id: 'lights', system: 'ILUMINACIÓN', title: 'Comprobar luces y señalización', detail: 'Luces delanteras, traseras e indicadores', status: 'Pendiente', urgency: 'medium' },
  { id: 'electronics', system: 'SISTEMA ELECTRÓNICO', title: 'Comprobar sistema electrónico', detail: 'Diagnóstico de alertas · requiere telemetría', status: 'En curso', urgency: 'medium' },
  { id: 'regeneration', system: 'RECUPERACIÓN DE ENERGÍA', title: 'Revisar recuperación de energía', detail: 'Funcionamiento regenerativo · requiere telemetría', status: 'Pendiente', urgency: 'medium' },
]

const urgenciasValidas = ['urgent', 'medium', 'low']

function normalizarUrgencia(urgencia) {
  return urgenciasValidas.includes(urgencia) ? urgencia : 'medium'
}

export function migrarTareas(tareasGuardadas) {
  if (!Array.isArray(tareasGuardadas)) return tareasIniciales

  const estadosLegados = new Map([
    ['Revisar presión de neumáticos', 'tires'],
    ['Comprobar luces delanteras', 'lights'],
    ['Ajustar freno trasero', 'brakes'],
  ])
  const tareasMigradas = tareasGuardadas.flatMap((tarea) => {
    if (tarea.title === 'Limpiar cadena y transmisión') return []
    const idMigrado = estadosLegados.get(tarea.title)
    if (!idMigrado) return [{ ...tarea, urgency: normalizarUrgencia(tarea.urgency) }]
    const definicion = tareasIniciales.find((item) => item.id === idMigrado)
    return [{ ...definicion, status: tarea.status, urgency: normalizarUrgencia(tarea.urgency) }]
  })
  const idsGuardados = new Set(tareasMigradas.map((tarea) => tarea.id))
  return [
    ...tareasMigradas,
    ...tareasIniciales.filter((tarea) => !idsGuardados.has(tarea.id)),
  ]
}

function leerTareas() {
  try {
    return migrarTareas(JSON.parse(localStorage.getItem('autodash-tasks')))
  } catch {
    return tareasIniciales
  }
}

export function useTareasMantenimiento() {
  const [tareas, setTareas] = useState(leerTareas)

  useEffect(() => {
    localStorage.setItem('autodash-tasks', JSON.stringify(tareas))
  }, [tareas])

  function cambiarEstadoTarea(idTarea, estado) {
    setTareas((actuales) => actuales.map((tarea) => (
      tarea.id === idTarea
        ? { ...tarea, status: estado, completedAt: estado === 'Completado' ? new Date().toISOString() : null }
        : tarea
    )))
  }

  function cambiarUrgenciaTarea(idTarea, urgencia) {
    const urgenciaNormalizada = normalizarUrgencia(urgencia)
    setTareas((actuales) => actuales.map((tarea) => (
      tarea.id === idTarea ? { ...tarea, urgency: urgenciaNormalizada } : tarea
    )))
  }

  function agregarTarea({ title, system, detail, urgency }) {
    const tarea = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      system,
      detail: detail.trim() || 'Revisión añadida manualmente',
      status: 'Pendiente',
      urgency: normalizarUrgencia(urgency),
      createdAt: new Date().toISOString(),
      custom: true,
    }
    setTareas((actuales) => [tarea, ...actuales])
  }

  function eliminarTarea(idTarea) {
    setTareas((actuales) => actuales.filter((tarea) => tarea.id !== idTarea || !tarea.custom))
  }

  return { tareas, cambiarEstadoTarea, cambiarUrgenciaTarea, agregarTarea, eliminarTarea }
}
