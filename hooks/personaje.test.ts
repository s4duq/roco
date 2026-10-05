import { expect, test } from 'claude-code/testing'
import { cargarPersonaje, listarPersonajes, MAX_BYTES, validarPersonaje } from './personaje'
import type { Disco, MotivoInvalido } from './personaje'
import { obtenerTextos } from './textos'

const FILAS = ['........', '..0110..', '.011110.', '.011110.', '.011110.', '.011110.', '..0110..', '........']

// Personaje válido de 8×8; `cambios` pisa campos para probar cada regla.
const base = (cambios: Record<string, unknown> = {}) =>
  JSON.stringify({
    formato: 1,
    nombre: 'Michi',
    ancho: 8,
    alto: 8,
    paleta: ['#2b2321', '#ff8a3d'],
    pixeles: FILAS,
    acento: '#ff8a3d',
    ...cambios,
  })

const motivo = (texto: string) => {
  const r = validarPersonaje(texto, 'michi')
  return r.ok ? 'ok' : r.motivo
}

const con = (ultima: string) => [...FILAS.slice(0, 7), ultima]

// Disco falso: cada carpeta es una lista de entradas; anota qué rutas se leyeron.
type Falsa = { name: string; kind?: string; size?: number; texto?: string }
const discoFalso = (carpetas: Record<string, Falsa[]>) => {
  const leidos: string[] = []
  const disco: Disco = {
    listar: async c => {
      const lista = carpetas[c]
      if (!lista) throw new Error('ENOENT')
      return lista.map(f => ({ name: f.name, kind: f.kind ?? 'file', size: f.size ?? (f.texto ?? '').length }))
    },
    leer: async ruta => {
      leidos.push(ruta)
      const corte = ruta.lastIndexOf('/')
      const f = carpetas[ruta.slice(0, corte)]?.find(x => x.name === ruta.slice(corte + 1))
      if (f?.texto === undefined) throw new Error('ENOENT')
      return f.texto
    },
  }
  return { disco, leidos }
}

test('validarPersonaje acepta el mínimo y copia solo lo validado', () => {
  const r = validarPersonaje(base({ paleta: ['#2B2321', '#FF8A3D'], acento: '#FF8A3D', extra: '<x>' }), 'michi')
  if (!r.ok) throw new Error(`rechazado: ${r.motivo}`)
  expect(r.personaje.id).toBe('michi')
  expect(r.personaje.paleta).toEqual(['#2b2321', '#ff8a3d'])
  expect(r.personaje.acento).toBe('#ff8a3d')
  expect(r.personaje.poses).toEqual({})
  expect('extra' in r.personaje).toBe(false)
})

test('validarPersonaje rechaza colores que podrían romper el SVG', () => {
  expect(motivo(base({ paleta: ['#fff"/><x', '#ff8a3d'] }))).toBe('color')
  expect(motivo(base({ paleta: ['#fff', '#ff8a3d'] }))).toBe('color')
  expect(motivo(base({ paleta: ['#2b2321', 'red'] }))).toBe('color')
  expect(motivo(base({ paleta: ['#2b2321', 7] }))).toBe('color')
  expect(motivo(base({ acento: '#fff"/><x' }))).toBe('color')
})

test('validarPersonaje rechaza filas que no cuadran', () => {
  expect(motivo(base({ pixeles: con('.......') }))).toBe('filas')
  expect(motivo(base({ pixeles: FILAS.slice(0, 7) }))).toBe('filas')
  expect(motivo(base({ pixeles: [...FILAS.slice(0, 7), 12345678] }))).toBe('filas')
  expect(motivo(base({ pixeles: 'no es lista' }))).toBe('filas')
})

test('validarPersonaje rechaza caracteres fuera del contrato o de la paleta', () => {
  expect(motivo(base({ pixeles: con('...2....') }))).toBe('caracter') // paleta de 2: el índice 2 no existe
  expect(motivo(base({ pixeles: con('...A....') }))).toBe('caracter')
  expect(motivo(base({ pixeles: con('...<....') }))).toBe('caracter')
  expect(motivo(base({ pixeles: con('... ....') }))).toBe('caracter')
})

test('validarPersonaje rechaza más de 64 KB antes de parsear', () => {
  expect(motivo(' '.repeat(MAX_BYTES + 1))).toBe('grande')
})

test('validarPersonaje rechaza lo que no es un objeto JSON', () => {
  for (const t of ['{', '[]', 'null', '"hola"', '']) expect(motivo(t)).toBe('json')
})

test('validarPersonaje rechaza medidas fuera de 8–32', () => {
  for (const ancho of [7, 33, 8.5, '8', null]) expect(motivo(base({ ancho }))).toBe('medida')
  expect(motivo(base({ alto: 40 }))).toBe('medida')
})

test('validarPersonaje exige formato 1', () => {
  expect(motivo(base({ formato: 2 }))).toBe('formato')
  expect(motivo(base({ formato: '1' }))).toBe('formato')
})

test('validarPersonaje limita el nombre', () => {
  for (const nombre of ['<b>Michi</b>', 'x'.repeat(17), '', '   ', 7]) expect(motivo(base({ nombre }))).toBe('nombre')
  const r = validarPersonaje(base({ nombre: '  Ñandú 2  ' }), 'nandu')
  expect(r.ok ? r.personaje.nombre : r.motivo).toBe('Ñandú 2')
})

test('validarPersonaje exige de 1 a 16 colores', () => {
  const diecisiete = Array.from({ length: 17 }, (_, i) => `#0000${(i + 16).toString(16)}`)
  expect(motivo(base({ paleta: diecisiete }))).toBe('paleta')
  expect(motivo(base({ paleta: [] }))).toBe('paleta')
  expect(motivo(base({ paleta: '#2b2321' }))).toBe('paleta')
})

test('validarPersonaje rechaza un personaje invisible', () => {
  expect(motivo(base({ pixeles: Array(8).fill('........') }))).toBe('vacio')
})

test('validarPersonaje revisa las poses', () => {
  const r = validarPersonaje(base({ poses: { listo: FILAS } }), 'michi')
  expect(r.ok ? Object.keys(r.personaje.poses) : r.motivo).toEqual(['listo'])
  expect(motivo(base({ poses: { bailando: FILAS } }))).toBe('pose')
  expect(motivo(base({ poses: [FILAS] }))).toBe('pose')
  expect(motivo(base({ poses: { listo: ['........'] } }))).toBe('filas')
  expect(motivo(base({ poses: { error: con('...9....') } }))).toBe('caracter')
  // Escrito a mano: en un objeto literal, __proto__ no quedaría como clave.
  expect(motivo(base().slice(0, -1) + `,"poses":{"__proto__":${JSON.stringify(FILAS)}}}`)).toBe('pose')
})

test('cargarPersonaje: gana la primera carpeta y si no está, busca en la siguiente', async () => {
  const { disco } = discoFalso({
    usuario: [{ name: 'michi.json', texto: base({ nombre: 'Del usuario' }) }],
    incluidos: [
      { name: 'michi.json', texto: base({ nombre: 'Incluido' }) },
      { name: 'fantasma.json', texto: base({ nombre: 'Fantasma' }) },
    ],
  })
  const m = await cargarPersonaje('michi', disco, ['usuario', 'incluidos'])
  const f = await cargarPersonaje('fantasma', disco, ['usuario', 'incluidos'])
  expect([m.ok ? m.personaje.nombre : m.motivo, f.ok ? f.personaje.nombre : f.motivo]).toEqual(['Del usuario', 'Fantasma'])
})

test('cargarPersonaje rechaza ids que no son un nombre de archivo, sin tocar el disco', async () => {
  const { disco, leidos } = discoFalso({ usuario: [{ name: 'michi.json', texto: base() }] })
  for (const id of ['../secreto', 'a/b', 'C:x', 'Michi', '', 'roco', 'x'.repeat(33)]) {
    const r = await cargarPersonaje(id, disco, ['usuario'])
    expect(r.ok ? 'ok' : r.motivo).toBe('falta')
  }
  expect(leidos).toEqual([])
})

test('cargarPersonaje: más de 64 KB se rechaza sin leer y un enlace se ignora', async () => {
  const { disco, leidos } = discoFalso({
    usuario: [
      { name: 'grande.json', size: MAX_BYTES + 1, texto: base() },
      { name: 'enlace.json', kind: 'other', texto: base() },
    ],
  })
  const g = await cargarPersonaje('grande', disco, ['usuario'])
  const e = await cargarPersonaje('enlace', disco, ['usuario'])
  expect([g.ok ? 'ok' : g.motivo, e.ok ? 'ok' : e.motivo]).toEqual(['grande', 'falta'])
  expect(leidos).toEqual([])
})

test('listarPersonajes: roco primero, sin repetir, ignora lo que no es <id>.json', async () => {
  const { disco } = discoFalso({
    usuario: [{ name: 'robot.json' }, { name: 'gato.json' }, { name: 'Mayus.json' }, { name: 'notas.txt' }, { name: 'roco.json' }],
    incluidos: [{ name: 'gato.json' }, { name: 'fantasma.json' }],
  })
  expect(await listarPersonajes(disco, ['usuario', 'incluidos', 'no-existe'])).toEqual(['roco', 'fantasma', 'gato', 'robot'])
})

test('cada motivo tiene texto en es y en', () => {
  const motivos: MotivoInvalido[] = ['falta', 'grande', 'json', 'formato', 'nombre', 'medida', 'paleta', 'color', 'filas', 'caracter', 'vacio', 'pose']
  for (const idioma of ['es', 'en']) {
    const m = obtenerTextos(idioma).personaje.motivo
    expect(motivos.filter(k => !(typeof m[k] === 'string' && m[k].length > 0))).toEqual([])
  }
  expect(obtenerTextos('en').personaje.fallo('michi', 'x')).toBe('Could not load character "michi": x. Using Roco.')
})
