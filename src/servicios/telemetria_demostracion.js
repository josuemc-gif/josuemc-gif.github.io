import { useEffect, useState } from 'react'

const clave = 'autodash-demo-telemetry'
const valoresIniciales = {
  battery: 85,
  range: 320,
  temperature: 27,
  consumption: 14.6,
}

function readTelemetry() {
  try {
    const stored = JSON.parse(localStorage.getItem(clave))
    if (!stored || typeof stored !== 'object') return valoresIniciales
    return {
      battery: clamp(stored.battery, 0, 100, valoresIniciales.battery),
      range: clamp(stored.range, 0, 1000, valoresIniciales.range),
      temperature: clamp(stored.temperature, -40, 100, valoresIniciales.temperature),
      consumption: clamp(stored.consumption, 0, 100, valoresIniciales.consumption),
    }
  } catch {
    return valoresIniciales
  }
}

function clamp(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}

export function useTelemetriaDemostracion() {
  const [telemetry, setTelemetry] = useState(readTelemetry)

  useEffect(() => {
    localStorage.setItem(clave, JSON.stringify(telemetry))
  }, [telemetry])

  function updateTelemetry(field, value) {
    setTelemetry((current) => ({ ...current, [field]: value }))
  }

  return { telemetry, updateTelemetry }
}
