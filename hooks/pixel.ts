import type { Animo } from '../types'
import type { Personaje } from './personaje'

// Dibujo de un personaje propio. Puro: no recibe `$` ni toca el disco, y solo importa
// tipos (Node también lo carga). Lo que entra ya pasó por validarPersonaje: colores #rrggbb y filas
// que cuadran. El nombre nunca entra al SVG: va solo en `alt` y en `Text`.

export const MAX_SVG = 131072 // límite de `Svg.source`

const ROJO = '#e24b4a'
const CHISPA = '#fac775'
const SOMBRA = 'rgba(0,0,0,.35)'

// Margen alrededor del personaje (en sus píxeles) para que los efectos no se corten.
const MARGEN = { arriba: 8, lado: 4, abajo: 2 }

// Terminal: alto máximo en píxeles (2 por fila) según el estilo.
const ALTO_TERMINAL = { completo: 16, compacto: 8 }

export type Tramo = { x: number; y: number; ancho: number; c: string } // c: carácter de la paleta ('0'–'f')
export type Celdas = { columns: number; rows: number; cells: string } // lo que pide `Raster`
export type Dibujo = {
  personaje: Personaje
  caja: { ancho: number; alto: number } // viewBox del SVG
  svg: Record<Animo, string>
  terminal: Record<'completo' | 'compacto', Record<Animo, Celdas>>
}

// Une los píxeles seguidos del mismo color de cada fila en un solo tramo; '.' es transparente.
export function tramos(filas: readonly string[]): Tramo[] {
  const lista: Tramo[] = []
  filas.forEach((fila, y) => {
    let x = 0
    while (x < fila.length) {
      let fin = x + 1
      while (fin < fila.length && fila[fin] === fila[x]) fin++
      if (fila[x] !== '.') lista.push({ x, y, ancho: fin - x, c: fila[x] })
      x = fin
    }
  })
  return lista
}

// Mezcla dos colores #rrggbb (t = peso de `con`). Así se tiñe el error, sin filtros CSS.
export function mezclar(color: string, con: string, t = 0.5): string {
  const a = parseInt(color.slice(1), 16)
  const b = parseInt(con.slice(1), 16)
  const canal = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return '#' + [16, 8, 0].map(s => canal(s).toString(16).padStart(2, '0')).join('')
}

const filasDe = (p: Personaje, animo: Animo) => p.poses[animo] ?? p.pixeles
const paletaDe = (p: Personaje, animo: Animo) => (animo === 'error' ? p.paleta.map(c => mezclar(c, ROJO)) : p.paleta)

const rect = (x: number, y: number, ancho: number, alto: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${ancho}" height="${alto}" fill="${fill}"/>`
const puntos = (lista: [number, number][], fill: string) => lista.map(([x, y]) => rect(x, y, 1, 1, fill)).join('')
const zeta = (x: number, y: number, fill: string) =>
  puntos([[x, y], [x + 1, y], [x + 2, y], [x + 1, y + 1], [x, y + 2], [x + 1, y + 2], [x + 2, y + 2]], fill)

// Los efectos de Roco (arte.ts) en una caja genérica: 1px de transform = 1 píxel del personaje.
const SUBE = '@keyframes sube{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-4px);opacity:0}}'
const APARECE = '@keyframes ap{0%{opacity:0}33%{opacity:1}66%{opacity:0}}'
const CSS: Record<Animo, string> = {
  reposo:
    '.cuerpo{animation:resp 3.2s steps(1,end) infinite}.zz g{animation:sube 3s steps(4,end) infinite}.zz g:nth-child(2){animation-delay:-1.5s}' +
    '@keyframes resp{0%,100%{transform:translateY(0)}50%{transform:translateY(1px)}}' +
    SUBE,
  pensando:
    '.bu rect{opacity:0;animation:ap 1.8s steps(1,end) infinite}.bu rect:nth-child(2){animation-delay:.3s}.bu rect:nth-child(3){animation-delay:.6s}' +
    APARECE,
  trabajando:
    '.cuerpo{animation:reb .4s steps(1,end) infinite}.fg rect{opacity:0;animation:ap .4s steps(1,end) infinite}.fg rect:nth-child(odd){animation-delay:.15s}' +
    '@keyframes reb{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}' +
    APARECE,
  listo:
    '.cuerpo{animation:salto .8s steps(1,end) infinite}.fu{animation:sube .8s steps(4,end) infinite}' +
    '@keyframes salto{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}' +
    SUBE,
  error: '.cuerpo{animation:tem .3s steps(1,end) 4}@keyframes tem{0%{transform:translateX(-1px)}50%{transform:translateX(1px)}}',
}
const ANIMOS = Object.keys(CSS) as Animo[]

// Efecto de cada ánimo, ubicado respecto a la caja del personaje (ancho × alto).
function efecto(animo: Animo, ancho: number, alto: number, acento: string): string {
  const cx = Math.floor(ancho / 2)
  switch (animo) {
    case 'reposo':
      return `<g class="zz"><g>${zeta(ancho - 1, -4, '#b4b2a9')}</g><g>${zeta(ancho + 1, -7, '#888780')}</g></g>`
    case 'pensando':
      return `<g class="bu">${rect(ancho - 1, -1, 1, 1, acento)}${rect(ancho, -4, 2, 2, acento)}${rect(ancho + 1, -8, 3, 3, acento)}</g>`
    case 'trabajando':
      return `<g class="fg">${puntos([[-2, alto - 1], [-1, alto + 1], [ancho + 1, alto - 1], [ancho, alto + 1]], CHISPA)}${puntos([[-3, alto], [ancho + 2, alto]], acento)}</g>`
    case 'listo':
      return `<g class="fu">${puntos([[cx - 1, -3], [cx, -3], [cx - 3, -5], [cx + 2, -5], [cx - 1, -6], [cx, -6]], acento)}${puntos([[cx - 2, -4], [cx + 1, -4]], CHISPA)}</g>`
    case 'error':
      return ''
  }
}

// viewBox del SVG: el personaje más el margen de los efectos.
export const cajaSvg = (p: Personaje) => ({ ancho: p.ancho + 2 * MARGEN.lado, alto: p.alto + MARGEN.arriba + MARGEN.abajo })

// SVG autónomo (sin scripts) de un ánimo: la pose si existe; si no, el cuerpo base.
export function svgPixel(p: Personaje, animo: Animo): string {
  const paleta = paletaDe(p, animo)
  const cuerpo = tramos(filasDe(p, animo))
    .map(t => rect(t.x, t.y, t.ancho, 1, paleta[parseInt(t.c, 16)]))
    .join('')
  const caja = cajaSvg(p)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-MARGEN.lado} ${-MARGEN.arriba} ${caja.ancho} ${caja.alto}" width="${caja.ancho * 6}" height="${caja.alto * 6}" shape-rendering="crispEdges">` +
    `<style>${CSS[animo]}</style>` +
    rect(1, p.alto, p.ancho - 2, 1, SOMBRA) +
    `<g class="cuerpo">${cuerpo}</g>` +
    efecto(animo, p.ancho, p.alto, p.acento) +
    '</svg>'
  )
}

// Medida en pantalla para un alto dado. Roco (null) conserva su 156×144; un personaje propio,
// su proporción, sin pasar de 2 veces el alto de ancho.
export function medidaSvg(caja: { ancho: number; alto: number } | null, alto: number) {
  if (!caja) return { width: Math.round((alto * 156) / 144), height: alto }
  const s = Math.min(alto / caja.alto, (2 * alto) / caja.ancho)
  return { width: Math.round(caja.ancho * s), height: Math.round(caja.alto * s) }
}

// Mitad de tamaño por bloques de 2×2: opaco si al menos la mitad del bloque lo es; el color,
// el más repetido entre los opacos (empate: el primero que aparece).
export function reducirMitad(filas: readonly string[]): string[] {
  const ancho = filas[0]?.length ?? 0
  const salida: string[] = []
  for (let y = 0; y < filas.length; y += 2) {
    let fila = ''
    for (let x = 0; x < ancho; x += 2) {
      const bloque: string[] = []
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const c = filas[y + dy]?.[x + dx]
        if (c !== undefined) bloque.push(c)
      }
      const opacos = bloque.filter(c => c !== '.')
      if (opacos.length * 2 < bloque.length) {
        fila += '.'
        continue
      }
      const cuenta = new Map<string, number>()
      for (const c of opacos) cuenta.set(c, (cuenta.get(c) ?? 0) + 1)
      let mejor = opacos[0]
      let veces = 0
      for (const [c, n] of cuenta) {
        if (n > veces) {
          mejor = c
          veces = n
        }
      }
      fila += mejor
    }
    salida.push(fila)
  }
  return salida
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// Base64 estándar con relleno, sin depender de toBase64/btoa del entorno.
export function aBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    s += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '='
    s += i + 2 < bytes.length ? B64[n & 63] : '='
  }
  return s
}

const DEFECTO = 0x01000000 // color de la terminal

// Terminal: medios bloques, 2 filas de píxeles por fila de texto. '▀' pinta arriba con el color
// de letra y abajo con el fondo; '▄' cuando solo hay píxel abajo; espacio si no hay ninguno.
export function celdasRaster(filas: readonly string[], paleta: readonly string[]): Celdas {
  const columns = filas[0].length
  const rows = Math.ceil(filas.length / 2)
  const palabras = new Uint32Array(columns * rows * 3)
  const color = (c: string | undefined) => (c === undefined || c === '.' ? null : parseInt(paleta[parseInt(c, 16)].slice(1), 16))
  for (let r = 0; r < rows; r++) {
    for (let x = 0; x < columns; x++) {
      const arriba = color(filas[2 * r][x])
      const abajo = color(filas[2 * r + 1]?.[x])
      const i = (r * columns + x) * 3
      if (arriba === null && abajo === null) palabras.set([0x20, DEFECTO, DEFECTO], i)
      else if (arriba === null) palabras.set([0x2584, abajo ?? DEFECTO, DEFECTO], i)
      else palabras.set([0x2580, arriba, abajo ?? DEFECTO], i)
    }
  }
  return { columns, rows, cells: aBase64(new Uint8Array(palabras.buffer)) }
}

// Reduce a la mitad hasta caber en `max` filas de píxeles.
const reducirHasta = (filas: readonly string[], max: number) => {
  let f = [...filas]
  while (f.length > max) f = reducirMitad(f)
  return f
}

// Todo se arma una vez, al cargar el personaje. null si algún SVG pasa de MAX_SVG
// (register.tsx avisa con un toast y sigue con Roco).
export function prepararDibujo(p: Personaje): Dibujo | null {
  const svg = {} as Record<Animo, string>
  const completo = {} as Record<Animo, Celdas>
  const compacto = {} as Record<Animo, Celdas>
  for (const animo of ANIMOS) {
    svg[animo] = svgPixel(p, animo)
    if (svg[animo].length > MAX_SVG) return null
    const filas = filasDe(p, animo)
    const paleta = paletaDe(p, animo)
    completo[animo] = celdasRaster(reducirHasta(filas, ALTO_TERMINAL.completo), paleta)
    compacto[animo] = celdasRaster(reducirHasta(filas, ALTO_TERMINAL.compacto), paleta)
  }
  return { personaje: p, caja: cajaSvg(p), svg, terminal: { completo, compacto } }
}
