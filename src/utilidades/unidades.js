export function distanciaDesdeKm(kilometros, unidades) {
  const millas = unidades === 'imperial'
  return {
    value: millas ? kilometros * 0.621371 : kilometros,
    unit: millas ? 'mi' : 'km',
  }
}

export function velocidadDesdeKmh(kilometrosPorHora, unidades) {
  const millas = unidades === 'imperial'
  return {
    value: millas ? kilometrosPorHora * 0.621371 : kilometrosPorHora,
    unit: millas ? 'mph' : 'km/h',
  }
}

export function temperaturaDesdeC(celsius, unidades) {
  return unidades === 'imperial' ? (celsius * 9) / 5 + 32 : celsius
}

export function consumoDesdeKwh100Km(consumo, unidades) {
  return unidades === 'imperial' ? consumo * 1.609344 : consumo
}
