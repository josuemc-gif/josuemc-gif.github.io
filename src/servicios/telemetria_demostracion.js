import { useEffect, useState } from 'react'

const clave = 'autodash-demo-telemetry'
const consumoInicial = 14.6

function readTelemetry() {
  try {
    const stored = JSON.parse(localStorage.getItem(clave))
    if (!stored || typeof stored !== 'object') return { consumption: consumoInicial }
    return { consumption: clamp(stored.consumption, 0, 100, consumoInicial) }
  } catch {
    return { consumption: consumoInicial }
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
