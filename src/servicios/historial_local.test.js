import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  agregarElementoReciente,
  claveHistorialLocal,
  guardarHistorialLocal,
  leerHistorialLocal,
} from './historial_local.js'

describe('historial local por dispositivo y cuenta', () => {
  it('genera claves separadas por tipo de actividad y cuenta', () => {
    assert.notEqual(claveHistorialLocal('trayectos', 'cuenta-a'), claveHistorialLocal('trayectos', 'cuenta-b'))
    assert.notEqual(claveHistorialLocal('videos', 'cuenta-a'), claveHistorialLocal('musica', 'cuenta-a'))
  })

  it('guarda y recupera el historial solo desde la clave de su cuenta', () => {
    const anterior = globalThis.localStorage
    const datos = new Map()
    globalThis.localStorage = {
      getItem: (key) => datos.get(key) ?? null,
      setItem: (key, value) => datos.set(key, value),
    }

    try {
      guardarHistorialLocal('videos', 'cuenta-a', [{ id: 'video-1' }])

      assert.deepEqual(leerHistorialLocal('videos', 'cuenta-a'), [{ id: 'video-1' }])
      assert.deepEqual(leerHistorialLocal('videos', 'cuenta-b'), [])
    } finally {
      if (anterior === undefined) delete globalThis.localStorage
      else globalThis.localStorage = anterior
    }
  })

  it('pone lo reciente primero, elimina duplicados y limita el tamaño', () => {
    const historial = [{ id: 'a' }, { id: 'b' }]
    assert.deepEqual(agregarElementoReciente(historial, { id: 'b', title: 'Nuevo' }, 2), [
      { id: 'b', title: 'Nuevo' },
      { id: 'a' },
    ])
  })

  it('devuelve una lista vacía si el historial guardado está dañado', () => {
    const anterior = globalThis.localStorage
    globalThis.localStorage = { getItem: () => '{inválido' }

    try {
      assert.deepEqual(leerHistorialLocal('trayectos', 'cuenta-a'), [])
    } finally {
      if (anterior === undefined) delete globalThis.localStorage
      else globalThis.localStorage = anterior
    }
  })
})
