// Núcleo puro del conversor: imagen RGBA → personaje (formato 1). Sin disco ni dependencias,
// para probarlo con `node --test`. Una "imagen" es { ancho, alto, datos }: datos RGBA
// (Uint8Array o Buffer), 4 bytes por píxel, filas de arriba abajo.

export const SIMBOLOS = '0123456789abcdef' // SIMBOLOS[i] = color paleta[i]; '.' = transparente
const TOLERANCIA_FONDO = 24
const ALFA_MIN = 128
const MEDIDA_MIN = 8

const distancia2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

export function hexARgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbAHex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

const pixel = (img, x, y) => {
  const i = (y * img.ancho + x) * 4
  return [img.datos[i], img.datos[i + 1], img.datos[i + 2], img.datos[i + 3]]
}

// Vuelve transparente el fondo conectado a los bordes. `fondo`: 'auto' | 'no' | '#rrggbb'.
// Con 'auto' solo actúa si las 4 esquinas son opacas y del mismo color.
export function quitarFondo(img, fondo) {
  const salida = { ancho: img.ancho, alto: img.alto, datos: Uint8Array.from(img.datos) }
  if (fondo === 'no') return salida
  let ref
  if (fondo === 'auto') {
    const w = img.ancho
    const h = img.alto
    const esquinas = [pixel(img, 0, 0), pixel(img, w - 1, 0), pixel(img, 0, h - 1), pixel(img, w - 1, h - 1)]
    if (esquinas.some(c => c[3] < ALFA_MIN)) return salida // ya trae transparencia
    if (!esquinas.every(c => distancia2(c, esquinas[0]) <= TOLERANCIA_FONDO ** 2)) return salida
    ref = esquinas[0]
  } else {
    ref = hexARgb(fondo)
  }
  const { ancho: w, alto: h, datos } = salida
  const esFondo = i =>
    datos[i * 4 + 3] >= ALFA_MIN &&
    distancia2([datos[i * 4], datos[i * 4 + 1], datos[i * 4 + 2]], ref) <= TOLERANCIA_FONDO ** 2
  const visto = new Uint8Array(w * h)
  const pila = new Int32Array(w * h) // cada píxel entra una sola vez
  let tope = 0
  const sembrar = i => {
    if (!visto[i] && esFondo(i)) {
      visto[i] = 1
      pila[tope++] = i
    }
  }
  for (let x = 0; x < w; x++) {
    sembrar(x)
    sembrar((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    sembrar(y * w)
    sembrar(y * w + w - 1)
  }
  while (tope > 0) {
    const i = pila[--tope]
    datos[i * 4 + 3] = 0
    const x = i % w
    if (x > 0) sembrar(i - 1)
    if (x < w - 1) sembrar(i + 1)
    if (i >= w) sembrar(i - w)
    if (i < (h - 1) * w) sembrar(i + w)
  }
  return salida
}

// Caja de los píxeles con alfa ≥ 128, o null si no hay ninguno.
export function cajaOpaca(img) {
  let x0 = img.ancho
  let y0 = img.alto
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < img.alto; y++)
    for (let x = 0; x < img.ancho; x++)
      if (img.datos[(y * img.ancho + x) * 4 + 3] >= ALFA_MIN) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  return x1 < 0 ? null : { x: x0, y: y0, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 }
}

export function unirCajas(cajas) {
  const validas = cajas.filter(Boolean)
  if (!validas.length) return null
  const x0 = Math.min(...validas.map(c => c.x))
  const y0 = Math.min(...validas.map(c => c.y))
  const x1 = Math.max(...validas.map(c => c.x + c.ancho))
  const y1 = Math.max(...validas.map(c => c.y + c.alto))
  return { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 }
}

export function recortar(img, c) {
  const datos = new Uint8Array(c.ancho * c.alto * 4)
  for (let y = 0; y < c.alto; y++) {
    const desde = ((c.y + y) * img.ancho + c.x) * 4
    datos.set(img.datos.subarray(desde, desde + c.ancho * 4), y * c.ancho * 4)
  }
  return { ancho: c.ancho, alto: c.alto, datos }
}

// Lado mayor = tamano, manteniendo la proporción. Nunca agranda.
export function medidaFinal(ancho, alto, tamano) {
  const escala = Math.min(1, tamano / Math.max(ancho, alto))
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) }
}

// Promedio por área, con el color ponderado por alfa (los bordes no se oscurecen).
// Solo reduce: `ancho` ≤ img.ancho y `alto` ≤ img.alto (lo garantiza medidaFinal).
export function reducir(img, ancho, alto) {
  if (img.ancho === ancho && img.alto === alto) return img
  const datos = new Uint8Array(ancho * alto * 4)
  const sx = img.ancho / ancho
  const sy = img.alto / alto
  for (let oy = 0; oy < alto; oy++) {
    const y0 = oy * sy
    const y1 = Math.min(img.alto, y0 + sy)
    for (let ox = 0; ox < ancho; ox++) {
      const x0 = ox * sx
      const x1 = Math.min(img.ancho, x0 + sx)
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let area = 0
      for (let y = Math.floor(y0); y < y1; y++) {
        const fy = Math.min(y + 1, y1) - Math.max(y, y0)
        for (let x = Math.floor(x0); x < x1; x++) {
          const f = fy * (Math.min(x + 1, x1) - Math.max(x, x0))
          const i = (y * img.ancho + x) * 4
          const peso = img.datos[i + 3] * f
          r += img.datos[i] * peso
          g += img.datos[i + 1] * peso
          b += img.datos[i + 2] * peso
          a += peso
          area += f
        }
      }
      const o = (oy * ancho + ox) * 4
      if (a > 0) {
        datos[o] = Math.round(r / a)
        datos[o + 1] = Math.round(g / a)
        datos[o + 2] = Math.round(b / a)
      }
      datos[o + 3] = Math.round(a / area)
    }
  }
  return { ancho, alto, datos }
}

// Lienzo transparente de ancho×alto con la imagen centrada en horizontal y pegada abajo.
export function encuadrar(img, ancho, alto) {
  if (img.ancho === ancho && img.alto === alto) return img
  const dx = Math.floor((ancho - img.ancho) / 2)
  const dy = alto - img.alto
  const datos = new Uint8Array(ancho * alto * 4)
  for (let y = 0; y < img.alto; y++)
    datos.set(img.datos.subarray(y * img.ancho * 4, (y + 1) * img.ancho * 4), ((y + dy) * ancho + dx) * 4)
  return { ancho, alto, datos }
}

// Median-cut: parte la caja de mayor rango por la mediana de ese canal hasta tener `maximo`
// cajas o hasta que ninguna se pueda partir. Recibe un [r,g,b] por píxel opaco (con
// repeticiones, así pesa lo frecuente). Devuelve colores [r,g,b] distintos.
export function medianCut(colores, maximo) {
  if (!colores.length) return []
  const rango = caja => {
    let mejor = { canal: 0, ancho: -1 }
    for (let c = 0; c < 3; c++) {
      let min = 255
      let max = 0
      for (const p of caja) {
        if (p[c] < min) min = p[c]
        if (p[c] > max) max = p[c]
      }
      if (max - min > mejor.ancho) mejor = { canal: c, ancho: max - min }
    }
    return mejor
  }
  const cajas = [colores]
  while (cajas.length < maximo) {
    let elegida = -1
    let mejor = null
    cajas.forEach((caja, i) => {
      const r = rango(caja)
      if (r.ancho > 0 && (!mejor || r.ancho > mejor.ancho)) {
        elegida = i
        mejor = r
      }
    })
    if (elegida < 0) break // todas las cajas son de un solo color
    const canal = mejor.canal
    const orden = [...cajas[elegida]].sort((p, q) => p[canal] - q[canal])
    // Corte en la mediana, corrido para que un mismo valor del canal no quede en las dos mitades.
    const v = orden[orden.length >> 1][canal]
    let corte = orden.findIndex(p => p[canal] === v)
    if (corte === 0) corte = orden.findIndex(p => p[canal] > v)
    cajas.splice(elegida, 1, orden.slice(0, corte), orden.slice(corte))
  }
  const vistos = new Set()
  const paleta = []
  for (const caja of cajas) {
    const suma = [0, 0, 0]
    for (const p of caja) for (let c = 0; c < 3; c++) suma[c] += p[c]
    const color = suma.map(s => Math.round(s / caja.length))
    const hex = rgbAHex(color)
    if (!vistos.has(hex)) {
      vistos.add(hex)
      paleta.push(color)
    }
  }
  return paleta
}

// Índice del color más cercano (distancia RGB); en empate, el primero.
export function masCercano(paleta, rgb) {
  let mejor = 0
  for (let k = 1; k < paleta.length; k++) if (distancia2(paleta[k], rgb) < distancia2(paleta[mejor], rgb)) mejor = k
  return mejor
}

export function hsl([r, g, b]) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  return { s, l }
}

// `paleta` ya ordenada de más a menos frecuente. Devuelve '#rrggbb'.
export function elegirAcento(paleta) {
  const vivo = paleta.find(c => {
    const { s, l } = hsl(c)
    return s >= 0.35 && l >= 0.25 && l <= 0.85
  })
  return rgbAHex(vivo ?? paleta[0])
}

// "Señor Gato" → "senor-gato". Puede devolver '' (el que llama lo revisa con ID_VALIDO).
export function idDesdeNombre(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)
}

// Nombre por defecto a partir del archivo: deja solo lo que acepta NOMBRE_VALIDO (máx. 16).
export function nombreDesdeArchivo(base) {
  const limpio = base
    .normalize('NFC')
    .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16)
    .trim()
  return limpio || 'Personaje'
}

// Imagen base (+ poses opcionales { [animo]: imagen }) → objeto del formato 1, sin validar.
// Todas las imágenes deben medir lo mismo. Lanza Error con un mensaje para el usuario.
export function convertir(base, poses, { nombre, tamano, colores, fondo }) {
  const entradas = [['base', base], ...Object.entries(poses)]
  for (const [animo, img] of entradas)
    if (img.ancho !== base.ancho || img.alto !== base.alto)
      throw new Error(
        `La pose "${animo}" mide ${img.ancho}×${img.alto} y la imagen base ${base.ancho}×${base.alto}: deben medir lo mismo.`,
      )
  const limpias = entradas.map(([animo, img]) => [animo, quitarFondo(img, fondo)])
  const caja = unirCajas(limpias.map(([, img]) => cajaOpaca(img)))
  if (!caja) throw new Error('La imagen queda vacía: no hay píxeles opacos. Prueba con --fondo no.')
  const medida = medidaFinal(caja.ancho, caja.alto, tamano)
  const ancho = Math.max(MEDIDA_MIN, medida.ancho)
  const alto = Math.max(MEDIDA_MIN, medida.alto)
  const chicas = limpias.map(([animo, img]) => [
    animo,
    encuadrar(reducir(recortar(img, caja), medida.ancho, medida.alto), ancho, alto),
  ])

  // Una sola paleta para todas: sale de los píxeles opacos de base y poses.
  const opacos = []
  for (const [, img] of chicas)
    for (let i = 0; i < img.datos.length; i += 4)
      if (img.datos[i + 3] >= ALFA_MIN) opacos.push([img.datos[i], img.datos[i + 1], img.datos[i + 2]])
  const bruta = medianCut(opacos, Math.min(16, Math.max(1, colores)))

  const cuenta = new Array(bruta.length).fill(0)
  const celdas = chicas.map(([animo, img]) => {
    const lista = []
    for (let i = 0; i < img.datos.length; i += 4) {
      const k =
        img.datos[i + 3] < ALFA_MIN ? -1 : masCercano(bruta, [img.datos[i], img.datos[i + 1], img.datos[i + 2]])
      if (k >= 0) cuenta[k]++
      lista.push(k)
    }
    return [animo, lista]
  })
  // Fuera los colores sin uso; de más a menos frecuente (en empate, por hex).
  const orden = bruta
    .map((_, k) => k)
    .filter(k => cuenta[k] > 0)
    .sort((a, b) => cuenta[b] - cuenta[a] || (rgbAHex(bruta[a]) < rgbAHex(bruta[b]) ? -1 : 1))
  const nuevo = new Map(orden.map((k, j) => [k, j]))
  const paleta = orden.map(k => bruta[k])
  const filas = lista =>
    Array.from({ length: alto }, (_, y) =>
      lista
        .slice(y * ancho, (y + 1) * ancho)
        .map(k => (k < 0 ? '.' : SIMBOLOS[nuevo.get(k)]))
        .join(''),
    )

  const [[, celdasBase], ...resto] = celdas
  const pixeles = filas(celdasBase)
  if (pixeles.every(f => !/[^.]/.test(f)))
    throw new Error('La imagen base queda vacía al reducirla. Prueba con un --tamano mayor.')
  const personaje = {
    formato: 1,
    nombre,
    ancho,
    alto,
    paleta: paleta.map(rgbAHex),
    pixeles,
    acento: elegirAcento(paleta),
  }
  if (resto.length) personaje.poses = Object.fromEntries(resto.map(([animo, lista]) => [animo, filas(lista)]))
  return personaje
}

// Vista previa para la terminal: 2 caracteres por píxel, color ANSI de 24 bits.
export function vistaPrevia(p) {
  return p.pixeles
    .map(fila =>
      [...fila]
        .map(c => {
          if (c === '.') return '  '
          const [r, g, b] = hexARgb(p.paleta[SIMBOLOS.indexOf(c)])
          return `\x1b[38;2;${r};${g};${b}m██\x1b[0m`
        })
        .join(''),
    )
    .join('\n')
}
