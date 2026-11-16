export function descriviMeteo(codice) {
  if (codice === 0) return ['Cielo sereno', 'sereno']
  if (codice === 1) return ['Prevalentemente sereno', 'nuvoloso']
  if (codice === 2) return ['Parzialmente nuvoloso', 'nuvoloso']
  if (codice === 3) return ['Cielo coperto', 'nuvoloso']
  if ([45, 48].includes(codice)) return ['Nebbia', 'nuvoloso']
  if ([71, 73, 75, 77, 85, 86].includes(codice)) return ['Neve', 'neve']
  if ([95, 96, 99].includes(codice)) return ['Temporale', 'pioggia']
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(codice)) {
    return ['Pioggia', 'pioggia']
  }
  return ['Condizioni non disponibili', 'nuvoloso']
}
