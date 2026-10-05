// Pruebas de la galería: cd scripts && npm test (node --test). Como pruebas.mjs, no es *.test.* a
// propósito. Todo personaje de personajes/ cumple el contrato y las reglas de la galería.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MAX_BYTES, validarPersonaje } from '../hooks/personaje.ts'
import { prepararDibujo } from '../hooks/pixel.ts'

const CARPETA = fileURLToPath(new URL('../personajes/', import.meta.url))
const IDS = readdirSync(CARPETA)
  .filter(n => n.endsWith('.json'))
  .map(n => n.slice(0, -5))
  .sort()

// Luminancia relativa aproximada (0 = negro, 1 = blanco).
const luz = hex => {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

test('personajes/ incluye las 7 mascotas de serie', () => {
  for (const id of ['astronauta', 'dragon', 'fantasma', 'gato', 'hongo', 'pulpo', 'robot']) assert.ok(IDS.includes(id), `falta ${id}.json`)
})

for (const id of IDS) {
  test(`${id}: contrato, 16–24 px, ≤ 6 colores y contorno oscuro de 1 px`, () => {
    const bytes = readFileSync(`${CARPETA}${id}.json`)
    assert.ok(bytes.length <= MAX_BYTES, 'pesa más de 64 KB')
    const r = validarPersonaje(bytes.toString('utf8'), id)
    assert.ok(r.ok, `validarPersonaje lo rechaza: ${r.motivo}`)
    const p = r.personaje
    assert.ok(p.ancho >= 16 && p.ancho <= 24 && p.alto >= 16 && p.alto <= 24, 'la medida no está entre 16 y 24')
    assert.ok(p.paleta.length <= 6, 'más de 6 colores')
    assert.ok(luz(p.paleta[0]) < 0.2, 'paleta[0] (el contorno) no es oscuro')
    // Todo píxel opaco que toca el borde o un transparente (4 vecinos) es '0' = paleta[0].
    const opaco = (x, y) => y >= 0 && y < p.alto && x >= 0 && x < p.ancho && p.pixeles[y][x] !== '.'
    for (let y = 0; y < p.alto; y++) {
      for (let x = 0; x < p.ancho; x++) {
        if (!opaco(x, y)) continue
        const borde = !opaco(x - 1, y) || !opaco(x + 1, y) || !opaco(x, y - 1) || !opaco(x, y + 1)
        if (borde) assert.equal(p.pixeles[y][x], '0', `contorno en (${x}, ${y})`)
      }
    }
    assert.ok(prepararDibujo(p), 'el SVG no cabe en el límite de Svg')
  })
}
