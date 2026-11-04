import assert from 'node:assert/strict'
import test from 'node:test'
import { migrarTareas } from './tareas_mantenimiento.js'

test('migrarTareas preserves matching task states and adds electric-vehicle checks', () => {
  const tasks = migrarTareas([
    { id: 1, title: 'Revisar presión de neumáticos', status: 'En curso' },
    { id: 2, title: 'Comprobar luces delanteras', status: 'Completado' },
    { id: 3, title: 'Limpiar cadena y transmisión', status: 'Pendiente' },
    { id: 4, title: 'Ajustar freno trasero', status: 'Pendiente' },
  ])

  assert.equal(tasks.find((task) => task.id === 'tires').status, 'En curso')
  assert.equal(tasks.find((task) => task.id === 'lights').status, 'Completado')
  assert.equal(tasks.find((task) => task.id === 'brakes').status, 'Pendiente')
  assert.equal(tasks.find((task) => task.id === 'tires').urgency, 'medium')
  assert.ok(tasks.some((task) => task.id === 'battery'))
  assert.ok(tasks.some((task) => task.id === 'electrical'))
  assert.ok(tasks.some((task) => task.id === 'electronics'))
  assert.ok(tasks.some((task) => task.id === 'regeneration'))
  assert.ok(tasks.every((task) => task.title !== 'Limpiar cadena y transmisión'))
})

test('migrarTareas initializes the electric maintenance board for invalid saved data', () => {
  const tasks = migrarTareas(null)

  assert.equal(tasks.length, 7)
  assert.ok(tasks.some((task) => task.system === 'BATERÍA DE TRACCIÓN'))
})

test('migrarTareas keeps valid urgency and defaults older or invalid values to medium', () => {
  const tasks = migrarTareas([
    { id: 'custom-1', title: 'Revisión urgente', status: 'Pendiente', urgency: 'urgent' },
    { id: 'custom-2', title: 'Revisión antigua', status: 'Pendiente' },
    { id: 'custom-3', title: 'Prioridad inválida', status: 'Pendiente', urgency: 'high' },
  ])

  assert.equal(tasks.find((task) => task.id === 'custom-1').urgency, 'urgent')
  assert.equal(tasks.find((task) => task.id === 'custom-2').urgency, 'medium')
  assert.equal(tasks.find((task) => task.id === 'custom-3').urgency, 'medium')
})
