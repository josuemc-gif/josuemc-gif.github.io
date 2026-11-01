import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { consumoDesdeKwh100Km, distanciaDesdeKm, temperaturaDesdeC, velocidadDesdeKmh } from './unidades.js'

describe('conversión de unidades', () => {
  it('converts distance and speed without changing the metric values', () => {
    assert.deepEqual(distanciaDesdeKm(100, 'metric'), { value: 100, unit: 'km' })
    assert.deepEqual(velocidadDesdeKmh(100, 'metric'), { value: 100, unit: 'km/h' })
  })

  it('converts distance, speed, temperature, and consumption to imperial units', () => {
    assert.ok(Math.abs(distanciaDesdeKm(100, 'imperial').value - 62.1371) < 0.000001)
    assert.ok(Math.abs(velocidadDesdeKmh(100, 'imperial').value - 62.1371) < 0.000001)
    assert.equal(temperaturaDesdeC(0, 'imperial'), 32)
    assert.ok(Math.abs(consumoDesdeKwh100Km(10, 'imperial') - 16.09344) < 0.000001)
  })

  it('keeps negative temperatures valid during Fahrenheit conversion', () => {
    assert.equal(temperaturaDesdeC(-40, 'imperial'), -40)
  })
})
