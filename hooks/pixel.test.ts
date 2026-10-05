import { expect, test } from 'claude-code/testing'
import { NOMBRE } from './arte'
import { conPersonaje, leerOpciones } from './opciones'
import type { Personaje } from './personaje'
import { aBase64, cajaSvg, celdasRaster, MAX_SVG, medidaSvg, mezclar, prepararDibujo, reducirMitad, svgPixel, tramos } from './pixel'

const FILAS = ['........', '..0110..', '.011110.', '.011110.', '.011110.', '.011110.', '..0110..', '........']
const ANIMOS = ['reposo', 'pensando', 'trabajando', 'listo', 'error'] as const

// Personaje ya validado de 8×8; `cambios` pisa campos.
const pj = (cambios: Partial<Personaje> = {}): Personaje => ({
  id: 'michi',
  nombre: 'Michi',
  ancho: 8,
  alto: 8,
  paleta: ['#112233', '#ffeedd'],
  pixeles: FILAS,
  acento: '#ff8800',
  poses: {},
  ...cambios,
})

// Peor caso: 32×32 en damero de 16 colores; ningún tramo se une.
const DAMERO = Array.from({ length: 32 }, (_, y) => Array.from({ length: 32 }, (_, x) => ((x + y) % 16).toString(16)).join(''))
const PALETA16 = Array.from({ length: 16 }, (_, i) => '#' + (i * 0x0f0f0f).toString(16).padStart(6, '0'))
const peor = () => pj({ ancho: 32, alto: 32, paleta: PALETA16, pixeles: DAMERO })

// Rehace la cuadrícula a partir de los tramos.
const pintar = (filas: string[]) => {
  const g = filas.map(f => [...f].map(() => '.'))
  for (const t of tramos(filas)) for (let i = 0; i < t.ancho; i++) g[t.y][t.x + i] = t.c
  return g.map(f => f.join(''))
}

// `cells` de un Raster → lista de u32: código, letra, fondo, código, …
const palabras = (cells: string) => [...new Uint32Array(Uint8Array.from(atob(cells), ch => ch.charCodeAt(0)).buffer)]
const D = 0x01000000

test('tramos cubre exactamente los mismos píxeles', () => {
  for (const filas of [FILAS, DAMERO, ['0011.22', '.......', 'fff0fff']]) expect(pintar(filas)).toEqual(filas)
})

test('tramos une los seguidos del mismo color y salta los transparentes', () => {
  expect(tramos(['0011.22'])).toEqual([
    { x: 0, y: 0, ancho: 2, c: '0' },
    { x: 2, y: 0, ancho: 2, c: '1' },
    { x: 5, y: 0, ancho: 2, c: '2' },
  ])
  expect(tramos(DAMERO).length).toBe(32 * 32)
})

test('svgPixel: el peor caso queda por debajo del límite de Svg', () => {
  for (const animo of ANIMOS) expect(svgPixel(peor(), animo).length < MAX_SVG).toBe(true)
  expect(prepararDibujo(peor()) !== null).toBe(true)
})

test('svgPixel: sin texto libre, crispEdges, caja con margen y el cuerpo en <g class="cuerpo">', () => {
  const s = svgPixel(pj(), 'reposo')
  expect(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -8 16 18"')).toBe(true)
  expect(s.endsWith('</svg>')).toBe(true)
  expect(s).toContain('shape-rendering="crispEdges"')
  expect(s).toContain('<g class="cuerpo"><rect x="2" y="1" width="1" height="1" fill="#112233"/><rect x="3" y="1" width="2" height="1" fill="#ffeedd"/>')
  expect(s).not.toContain('Michi')
  expect(cajaSvg(pj())).toEqual({ ancho: 16, alto: 18 })
})

test('svgPixel: cada ánimo trae su efecto y usa su pose si existe', () => {
  const marcas = { reposo: 'class="zz"', pensando: 'class="bu"', trabajando: 'class="fg"', listo: 'class="fu"', error: 'animation:tem' }
  for (const animo of ANIMOS) expect(svgPixel(pj(), animo)).toContain(marcas[animo])
  const conPose = pj({ poses: { listo: FILAS.map(f => f.replace(/1/g, '0')) } })
  expect(svgPixel(conPose, 'listo')).not.toContain('fill="#ffeedd"')
  expect(svgPixel(conPose, 'reposo')).toContain('fill="#ffeedd"')
})

test('error tiñe la paleta: mezcla al 50 % con #e24b4a, calculada en código', () => {
  expect(mezclar('#000000', '#e24b4a')).toBe('#712625')
  const s = svgPixel(pj(), 'error')
  expect(s).toContain(`fill="${mezclar('#112233', '#e24b4a')}"`)
  expect(s).not.toContain('#112233')
  expect(s).not.toContain('filter')
})

test('medidaSvg: Roco conserva 40×37, 48×44 y 78×72; un personaje propio, su proporción', () => {
  expect(medidaSvg(null, 37)).toEqual({ width: 40, height: 37 })
  expect(medidaSvg(null, 44)).toEqual({ width: 48, height: 44 })
  expect(medidaSvg(null, 72)).toEqual({ width: 78, height: 72 })
  expect(medidaSvg({ ancho: 16, alto: 18 }, 72)).toEqual({ width: 64, height: 72 })
  expect(medidaSvg({ ancho: 40, alto: 18 }, 72)).toEqual({ width: 144, height: 65 })
})

test('celdasRaster: medios bloques, color de letra arriba y fondo abajo', () => {
  const r = celdasRaster(['0.', '1.', '.0', '1.'], ['#112233', '#ffeedd'])
  expect(r.columns).toBe(2)
  expect(r.rows).toBe(2)
  expect(palabras(r.cells)).toEqual([0x2580, 0x112233, 0xffeedd, 0x20, D, D, 0x2584, 0xffeedd, D, 0x2580, 0x112233, D])
  expect(celdasRaster(['0', '1', '0'], ['#112233', '#ffeedd']).rows).toBe(2)
})

test('reducirMitad: opaco si al menos la mitad del bloque lo es; el color, el más repetido', () => {
  expect(reducirMitad(['0011', '0.1.', '....', '...1'])).toEqual(['01', '..'])
  expect(reducirMitad(['01', '10'])).toEqual(['0'])
  expect(reducirMitad(['0.0', '...'])).toEqual(['.0'])
  const d = prepararDibujo(peor())
  expect(d?.terminal.completo.reposo.columns).toBe(16)
  expect(d?.terminal.completo.reposo.rows).toBe(8)
  expect(d?.terminal.compacto.reposo.columns).toBe(8)
  expect(d?.terminal.compacto.reposo.rows).toBe(4)
})

test('aBase64 da el base64 estándar', () => {
  expect(aBase64(Uint8Array.of(1, 2, 3))).toBe('AQID')
  expect(aBase64(Uint8Array.of(1, 2, 3, 4))).toBe('AQIDBA==')
  expect(aBase64(Uint8Array.of(255, 254))).toBe('//4=')
})

test('conPersonaje: sin nombre puesto usa el del personaje; con tema auto, su acento', () => {
  const sinNada = conPersonaje(leerOpciones({}), pj())
  expect(sinNada.nombre).toBe('Michi')
  expect(sinNada.tema.acento).toBe('#FF8A3D')
  const conTodo = conPersonaje(leerOpciones({ nombre: 'Rocky', tema: 'auto' }), pj())
  expect(conTodo.nombre).toBe('Rocky')
  expect(conTodo.tema.acento).toBe('#ff8800')
  expect(leerOpciones({ tema: 'auto' }).tema.acento).toBe('#FF8A3D') // no tocó TEMAS
  expect(leerOpciones({}).nombre).toBe(NOMBRE)
  expect(leerOpciones({}).personaje).toBe('roco')
  expect(leerOpciones({ personaje: '  Gato ' }).personaje).toBe('gato')
})
