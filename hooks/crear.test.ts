import { expect, test } from 'claude-code/testing'
import { AJUSTAR, GUARDAR, HERRAMIENTAS, contornear, guiaCrear, prepararPersonaje, validarAjustes } from './crear'
import { validarPersonaje } from './personaje'

// El gato de personajes/gato.json dibujado solo con el relleno: el contorno lo pone contornear.
const RELLENO = [
  '.1............1.',
  '.11..........11.',
  '.131........131.',
  '.13311111111331.',
  '.11111111111111.',
  '.11111111111111.',
  '.11140111140111.',
  '.11100111100111.',
  '.11112233221111.',
  '.11112022021111.',
  '..100111111001..',
  '...1112222111...',
  '...1112222111...',
  '...1112222111...',
  '...1221111221...',
  '...1111111111...',
]
const GATO = [
  '.0............0.',
  '.00..........00.',
  '.030........030.',
  '.03300000000330.',
  '.01111111111110.',
  '.01111111111110.',
  '.01140111140110.',
  '.01100111100110.',
  '.01112233221110.',
  '.01112022021110.',
  '..000111111000..',
  '...0112222110...',
  '...0112222110...',
  '...0112222110...',
  '...0221111220...',
  '...0000000000...',
]
const base = () => ({
  nombre: 'Michi',
  ancho: 16,
  alto: 16,
  paleta: ['#2b2321', '#ff8a3d', '#ffe0c2', '#ff7aa2', '#ffffff'],
  pixeles: RELLENO,
  acento: '#FF8A3D',
})

test('contornear: del relleno sale exactamente el gato incluido', () => {
  expect(contornear(RELLENO)).toEqual(GATO)
})

test('prepararPersonaje: valida, pone el contorno y escribe solo los campos del contrato', () => {
  const r = prepararPersonaje({ id: 'Michi', personaje: { ...base(), extra: '<script>' } })
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.id).toBe('michi')
  expect(r.personaje.pixeles).toEqual(GATO)
  expect(r.archivo.includes('extra')).toBe(false)
  const otra = validarPersonaje(r.archivo, 'michi')
  expect(otra.ok).toBe(true)
})

test('prepararPersonaje: acepta el personaje como texto JSON y respeta contorno: false', () => {
  const r = prepararPersonaje({ id: 'michi', personaje: JSON.stringify(base()), contorno: false })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.personaje.pixeles).toEqual(RELLENO)
})

test('prepararPersonaje: rechaza ids que no son nombres de archivo y el id reservado', () => {
  for (const id of ['roco', '../x', '', 'a/b', 'x'.repeat(33)]) {
    const r = prepararPersonaje({ id, personaje: base() })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toBe('id')
  }
})

test('prepararPersonaje: un color con markup no pasa', () => {
  const r = prepararPersonaje({ id: 'michi', personaje: { ...base(), paleta: ['#fff"/><x', '#ff8a3d'] } })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.motivo).toBe('color')
})

test('validarAjustes: guarda solo lo válido, con el color en minúsculas', () => {
  const { cambios, rechazados } = validarAjustes({ nombre: 'Michi', acento: '#FF0080', tema: 'oceano', estilo: 'raro', idioma: 3 })
  expect(cambios).toEqual([
    ['roco.nombre', 'Michi'],
    ['roco.acento', '#ff0080'],
    ['roco.tema', 'oceano'],
  ])
  expect(rechazados).toEqual(['estilo', 'idioma'])
})

test('guiaCrear: remite a la skill, parte de la descripción y nombra las herramientas', () => {
  const g = guiaCrear('un gato con sombrero')
  expect(g.includes('"un gato con sombrero"')).toBe(true)
  expect(g.includes(`mcp__roco__${GUARDAR}`)).toBe(true)
  expect(g.includes(`mcp__roco__${AJUSTAR}`)).toBe(true)
  expect(g.includes('roco:crear')).toBe(true)
  expect(guiaCrear('').includes('""')).toBe(false)
  expect(HERRAMIENTAS.map(h => h.name)).toEqual([GUARDAR, AJUSTAR])
})

test('validarAjustes: campos limpia espacios y rechaza campos desconocidos', () => {
  expect(validarAjustes({ campos: ' estado, uso ,git ' }).cambios).toEqual([['roco.campos', 'estado,uso,git']])
  expect(validarAjustes({ campos: 'estado,clima' }).rechazados).toEqual(['campos'])
  expect(validarAjustes({ campos: '' }).rechazados).toEqual(['campos'])
})
