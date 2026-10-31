import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  crearControlMovimiento,
  emitirVelocidad,
  obtenerVelocidad,
} from './bloqueo_movimiento.js'

describe('crearControlMovimiento', () => {
  it('bloquea al alcanzar el umbral y solo desbloquea tras la espera bajo el umbral', async () => {
    const cambios = []
    const control = crearControlMovimiento((bloqueado) => cambios.push(bloqueado), {
      umbral: 5,
      espera: 15,
    })

    control.actualizarVelocidad({ velocidad: 4.9 })
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.deepEqual(cambios, [false])

    control.actualizarVelocidad({ velocidad: 5 })
    assert.deepEqual(cambios, [false, true])
    control.actualizarVelocidad({ velocidad: 4 })
    control.actualizarVelocidad({ velocidad: 5 })
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.deepEqual(cambios, [false, true])

    control.actualizarVelocidad({ velocidad: 0 })
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.deepEqual(cambios, [false, true, false])
    control.destruir()
  })

  it('mantiene el bloqueo si la señal falla durante la espera', async () => {
    const cambios = []
    const control = crearControlMovimiento((bloqueado) => cambios.push(bloqueado), {
      espera: 15,
    })

    control.actualizarVelocidad({ velocidad: 0 })
    control.actualizarVelocidad({ velocidad: null, error: 'Sin señal GPS' })
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.deepEqual(cambios, [])
    control.destruir()
  })

  it('restablece el bloqueo inmediatamente al perder una señal válida', async () => {
    const cambios = []
    const control = crearControlMovimiento((bloqueado) => cambios.push(bloqueado), {
      espera: 10,
    })

    control.actualizarVelocidad({ velocidad: 0 })
    await new Promise((resolve) => setTimeout(resolve, 20))
    control.actualizarVelocidad({ velocidad: null })
    assert.deepEqual(cambios, [false, true])
    control.destruir()
  })
})

describe('interfaz de velocidad', () => {
  it('devuelve null sin una lectura y conserva lecturas no negativas válidas', () => {
    assert.equal(obtenerVelocidad(), null)
    assert.equal(emitirVelocidad(12.5, 'simulador').velocidad, 12.5)
    assert.equal(obtenerVelocidad(), 12.5)
    assert.equal(emitirVelocidad(Number.NaN).velocidad, null)
    assert.equal(obtenerVelocidad(), null)
  })
})
