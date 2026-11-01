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
