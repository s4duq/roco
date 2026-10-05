// Pruebas del conversor: cd scripts && npm test (node --test). No es *.test.* a propósito:
// `plugin test` no debe recogerlo (corre en Node, no en el kit).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Jimp } from 'jimp'
import { validarPersonaje } from '../hooks/personaje.ts'
import {
  cajaOpaca,
  convertir,
  elegirAcento,
  hexARgb,
  idDesdeNombre,
  medianCut,
  medidaFinal,
  nombreDesdeArchivo,
  quitarFondo,
  reducir,
  rgbAHex,
  unirCajas,
} from './pixelar.mjs'

const CLI = fileURLToPath(new URL('./personaje.mjs', import.meta.url))

// Imagen de prueba: cada carácter de `dibujo` es un color de `colores` ('.' = transparente)
// y ocupa escala×escala píxeles.
function imagen(dibujo, colores, escala = 1) {
  const ancho = dibujo[0].length * escala
  const alto = dibujo.length * escala
  const datos = new Uint8Array(ancho * alto * 4)
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const c = dibujo[Math.floor(y / escala)][Math.floor(x / escala)]
      if (c !== '.') datos.set([...hexARgb(colores[c]), 255], (y * ancho + x) * 4)
    }
  return { ancho, alto, datos }
}
const alfa = (img, x, y) => img.datos[(y * img.ancho + x) * 4 + 3]

// Figura de 8×8 celdas (k = contorno, o = naranja) sobre fondo blanco de 12×12.
const DIBUJO = [
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  'wwkkkkkkkkww',
  'wwkookkookww',
  'wwkookkookww',
  'wwkkkkkkkkww',
  'wwkkoooookww',
  'wwkkkkkkkkww',
  'wwkokkkkokww',
  'wwkkkkkkkkww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
]
const COLORES = { w: '#ffffff', k: '#2b2321', o: '#ff8a3d', r: '#e24b4a' }
const OPCIONES = { nombre: 'Michi', tamano: 8, colores: 12, fondo: 'auto' }

test('quitarFondo auto: quita el fondo unido al borde y conserva el blanco encerrado', () => {
  const img = imagen(['wwwwww', 'wkkkkw', 'wkwwkw', 'wkkkkw', 'wwwwww'], COLORES)
  const sin = quitarFondo(img, 'auto')
  assert.equal(alfa(sin, 0, 0), 0)
  assert.equal(alfa(sin, 5, 4), 0)
  assert.equal(alfa(sin, 1, 1), 255)
  assert.equal(alfa(sin, 2, 2), 255)
  assert.equal(alfa(img, 0, 0), 255) // no toca la original
})

test("quitarFondo: 'no' no toca nada", () => {
  const sin = quitarFondo(imagen(['wwww', 'wkkw', 'wwww'], COLORES), 'no')
  for (let i = 3; i < sin.datos.length; i += 4) assert.equal(sin.datos[i], 255)
})

test('quitarFondo #hex: actúa aunque las esquinas no coincidan (auto no)', () => {
  const img = imagen(['kggg', 'gkkg', 'gggg'], { ...COLORES, g: '#00ff00' })
  const hex = quitarFondo(img, '#08f808')
  assert.equal(alfa(hex, 1, 0), 0)
  assert.equal(alfa(hex, 0, 0), 255)
  assert.equal(alfa(hex, 1, 1), 255)
  assert.equal(alfa(quitarFondo(img, 'auto'), 1, 0), 255)
})

test('cajaOpaca y unirCajas', () => {
  assert.deepEqual(cajaOpaca(imagen(['....', '.k..', '..k.', '....'], COLORES)), { x: 1, y: 1, ancho: 2, alto: 2 })
  assert.equal(cajaOpaca(imagen(['..', '..'], COLORES)), null)
  assert.deepEqual(
    unirCajas([{ x: 1, y: 1, ancho: 2, alto: 2 }, { x: 0, y: 2, ancho: 1, alto: 1 }, null]),
    { x: 0, y: 1, ancho: 3, alto: 2 },
  )
})

test('medidaFinal mantiene la proporción y nunca agranda', () => {
  assert.deepEqual(medidaFinal(400, 200, 24), { ancho: 24, alto: 12 })
  assert.deepEqual(medidaFinal(10, 20, 24), { ancho: 10, alto: 20 })
  assert.deepEqual(medidaFinal(1000, 10, 24), { ancho: 24, alto: 1 })
})

test('reducir promedia por área y pondera el color por alfa', () => {
  const byn = { ancho: 2, alto: 1, datos: Uint8Array.from([255, 255, 255, 255, 0, 0, 0, 255]) }
  assert.deepEqual([...reducir(byn, 1, 1).datos], [128, 128, 128, 255])
  const medio = { ancho: 2, alto: 1, datos: Uint8Array.from([255, 255, 255, 255, 0, 0, 0, 0]) }
  assert.deepEqual([...reducir(medio, 1, 1).datos], [255, 255, 255, 128])
})

test('medianCut: no inventa colores y respeta el máximo', () => {
  const rojo = [255, 0, 0]
  const azul = [0, 0, 255]
  const verde = [0, 255, 0]
  const pixeles = [rojo, rojo, rojo, rojo, azul, azul, azul, azul, verde, verde]
  assert.deepEqual(medianCut(pixeles, 16).map(rgbAHex).sort(), ['#0000ff', '#00ff00', '#ff0000'])
  const dos = medianCut(pixeles, 2).map(rgbAHex)
  assert.equal(dos.length, 2)
  assert.ok(dos.includes('#ff0000'))
  assert.deepEqual(medianCut(pixeles, 1).map(rgbAHex), ['#663366'])
})

test('elegirAcento: el primer color vivo; si no hay, el más frecuente', () => {
  assert.equal(elegirAcento([[0, 0, 0], [255, 255, 255], [255, 138, 61]]), '#ff8a3d')
  assert.equal(elegirAcento([[0, 0, 0], [128, 128, 128]]), '#000000')
})

test('idDesdeNombre y nombreDesdeArchivo', () => {
  assert.equal(idDesdeNombre('Señor Gato'), 'senor-gato')
  assert.equal(idDesdeNombre('  Á_b-C 2 '), 'a_b-c-2')
  assert.equal(nombreDesdeArchivo('IMG_2024 (1)'), 'IMG_2024 1')
  assert.equal(nombreDesdeArchivo('un nombre larguísimo de verdad'), 'un nombre larguí')
  assert.equal(nombreDesdeArchivo('***'), 'Personaje')
})

test('convertir: recorta, reduce, ordena la paleta y pasa validarPersonaje', () => {
  const p = convertir(imagen(DIBUJO, COLORES, 3), {}, OPCIONES)
  assert.equal(p.ancho, 8)
  assert.equal(p.alto, 8)
  assert.deepEqual(p.paleta, ['#2b2321', '#ff8a3d'])
  assert.equal(p.acento, '#ff8a3d')
  assert.equal(p.pixeles[0], '00000000')
  assert.equal(p.pixeles[1], '01100110')
  assert.equal(p.pixeles[4], '00111110')
  assert.equal(p.poses, undefined)
  assert.ok(validarPersonaje(JSON.stringify(p), 'michi').ok)
})

test('convertir con poses: misma caja, una sola paleta y medidas iguales', () => {
  const listo = DIBUJO.slice(1).concat(['wwwwwwwwwwww']).map(f => f.replaceAll('o', 'r'))
  const base = imagen(DIBUJO, COLORES, 3)
  const p = convertir(base, { listo: imagen(listo, COLORES, 3) }, { ...OPCIONES, tamano: 9 })
  assert.equal(p.ancho, 8)
  assert.equal(p.alto, 9)
  assert.deepEqual(p.paleta, ['#2b2321', '#e24b4a', '#ff8a3d'])
  assert.equal(p.pixeles[0], '........')
  assert.equal(p.pixeles[1], '00000000')
  assert.equal(p.poses.listo[0], '00000000')
  assert.equal(p.poses.listo[1], '01100110')
  const r = validarPersonaje(JSON.stringify(p), 'michi')
  assert.ok(r.ok && r.personaje.poses.listo.length === 9)
  assert.throws(() => convertir(base, { error: imagen(['k'], COLORES) }, OPCIONES), /mide/)
})

test('convertir rechaza una imagen que queda vacía', () => {
  assert.throws(() => convertir(imagen(['wwww', 'wwww', 'wwww', 'wwww'], COLORES), {}, OPCIONES), /vacía/)
})

test('CLI: escribe <id>.json válido, no reemplaza sin --forzar y reserva "roco"', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'roco-'))
  try {
    const fig = imagen(DIBUJO, COLORES, 3)
    const png = new Jimp({ width: fig.ancho, height: fig.alto, color: 0 })
    png.bitmap.data.set(fig.datos)
    await png.write(join(tmp, 'michi.png'))
    const args = [CLI, join(tmp, 'michi.png'), '--nombre', 'Señor Gato', '--tamano', '8', '--salida', tmp]
    execFileSync(process.execPath, args, { stdio: 'pipe' })
    const r = validarPersonaje(readFileSync(join(tmp, 'senor-gato.json'), 'utf8'), 'senor-gato')
    assert.ok(r.ok)
    assert.equal(r.personaje.nombre, 'Señor Gato')
    assert.equal(r.personaje.pixeles[1], '01100110')
    const falla = (lista, texto) =>
      assert.throws(
        () => execFileSync(process.execPath, lista, { stdio: 'pipe' }),
        e => e.status === 1 && String(e.stderr).includes(texto),
      )
    falla(args, 'Ya existe')
    execFileSync(process.execPath, [...args, '--forzar'], { stdio: 'pipe' })
    falla([CLI, join(tmp, 'michi.png'), '--nombre', 'Roco', '--salida', tmp], 'reservado')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
