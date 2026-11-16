import assert from 'node:assert/strict'
import { test } from 'node:test'
import { descriviMeteo } from '../src/meteo.js'

test('distingue cielo coperto da parzialmente nuvoloso', () => {
  assert.deepEqual(descriviMeteo(3), ['Cielo coperto', 'nuvoloso'])
  assert.deepEqual(descriviMeteo(2), ['Parzialmente nuvoloso', 'nuvoloso'])
})

test('attiva la neve anche per i rovesci di neve', () => {
  for (const codice of [71, 73, 75, 77, 85, 86]) {
    assert.equal(descriviMeteo(codice)[1], 'neve')
  }
})

test('distingue pioggia, temporale e cielo sereno', () => {
  assert.deepEqual(descriviMeteo(61), ['Pioggia', 'pioggia'])
  assert.deepEqual(descriviMeteo(95), ['Temporale', 'pioggia'])
  assert.deepEqual(descriviMeteo(0), ['Cielo sereno', 'sereno'])
})

test('ignora codici assenti o sconosciuti senza attivare precipitazioni', () => {
  for (const codice of [null, undefined, -1, 4, 79, 100]) {
    assert.deepEqual(descriviMeteo(codice), ['Condizioni non disponibili', 'nuvoloso'])
  }
})
