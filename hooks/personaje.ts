import type { Animo } from '../types'

// Contrato de un personaje propio. Lo que sale de aquí ya está validado: los colores
// terminan dentro de un SVG, así que nada pasa sin cumplir estas reglas. Solo se copian los campos
// revisados; cualquier otra clave del JSON se descarta. Este módulo nunca recibe `$`.

export type Personaje = {
  id: string // nombre del archivo sin `.json`
  nombre: string
  ancho: number
  alto: number
  paleta: string[] // '#rrggbb' en minúsculas
  pixeles: string[]
  acento: string
  poses: Partial<Record<Animo, string[]>>
}

export type MotivoInvalido =
  | 'falta'
  | 'grande'
  | 'json'
  | 'formato'
  | 'nombre'
  | 'medida'
  | 'paleta'
  | 'color'
  | 'filas'
  | 'caracter'
  | 'vacio'
  | 'pose'

export type Resultado = { ok: true; personaje: Personaje } | { ok: false; motivo: MotivoInvalido }

export const MAX_BYTES = 65536
export const ANIMOS: readonly Animo[] = ['reposo', 'pensando', 'trabajando', 'listo', 'error']
// Id = nombre del archivo: solo esto, para que `/roco personaje ../x` nunca arme una ruta.
export const ID_VALIDO = /^[a-z0-9_-]{1,32}$/
// El nombre solo va en `Text` y en `alt`, pero igual se limita.
export const NOMBRE_VALIDO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _-]{1,16}$/
const COLOR = /^#[0-9a-fA-F]{6}$/
// Posición 0 = transparente; posición i = color paleta[i - 1].
const PIXEL = '.0123456789abcdef'

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const esMedida = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 8 && v <= 32

const esColor = (v: unknown): v is string => typeof v === 'string' && COLOR.test(v)

// Revisa una cuadrícula (la base o una pose). Devuelve el motivo, o null si está bien.
function revisarFilas(filas: unknown, ancho: number, alto: number, colores: number): MotivoInvalido | null {
  if (!Array.isArray(filas) || filas.length !== alto) return 'filas'
  for (const fila of filas) {
    if (typeof fila !== 'string' || fila.length !== ancho) return 'filas'
    for (const c of fila) {
      const i = PIXEL.indexOf(c)
      if (i < 0 || i > colores) return 'caracter'
    }
  }
  return null
}

const no = (motivo: MotivoInvalido): Resultado => ({ ok: false, motivo })

export function validarPersonaje(texto: string, id: string): Resultado {
  if (texto.length > MAX_BYTES) return no('grande')
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    return no('json')
  }
  if (!esObjeto(datos)) return no('json')
  const d = datos
  if (d.formato !== 1) return no('formato')

  const nombre = typeof d.nombre === 'string' ? d.nombre.trim() : ''
  if (!NOMBRE_VALIDO.test(nombre)) return no('nombre')

  const ancho = d.ancho
  const alto = d.alto
  if (!esMedida(ancho) || !esMedida(alto)) return no('medida')

  const paleta = d.paleta
  if (!Array.isArray(paleta) || paleta.length < 1 || paleta.length > 16) return no('paleta')
  if (!paleta.every(esColor)) return no('color')
  const acento = d.acento
  if (!esColor(acento)) return no('color')

  const malBase = revisarFilas(d.pixeles, ancho, alto, paleta.length)
  if (malBase) return no(malBase)
  const pixeles = d.pixeles as string[]
  if (!pixeles.some(f => /[^.]/.test(f))) return no('vacio')

  const poses: Partial<Record<Animo, string[]>> = {}
  if (d.poses !== undefined) {
    if (!esObjeto(d.poses)) return no('pose')
    for (const [clave, filas] of Object.entries(d.poses)) {
      const animo = ANIMOS.find(a => a === clave)
      if (!animo) return no('pose')
      const mal = revisarFilas(filas, ancho, alto, paleta.length)
      if (mal) return no(mal)
      poses[animo] = [...(filas as string[])]
    }
  }

  return {
    ok: true,
    personaje: {
      id,
      nombre,
      ancho,
      alto,
      paleta: paleta.map(c => (c as string).toLowerCase()),
      pixeles: [...pixeles],
      acento: acento.toLowerCase(),
      poses,
    },
  }
}

// Lo único que este módulo necesita del disco. register.tsx lo arma con el `fs` del engine.
export type Disco = {
  // Como `fs.list` del engine: entradas de la carpeta; rechaza si no existe.
  listar: (carpeta: string) => Promise<{ name: string; kind: string; size: number }[]>
  // Como `fs.read` del engine: el texto del archivo.
  leer: (ruta: string) => Promise<string>
}

// Entradas `<id>.json` que son archivos normales. Un enlace simbólico llega como `other` y se ignora.
async function archivos(disco: Disco, carpeta: string) {
  const entradas = await disco.listar(carpeta).catch(() => [])
  return entradas.filter(e => e.kind === 'file' && e.name.endsWith('.json') && ID_VALIDO.test(e.name.slice(0, -5)))
}

// Ids disponibles: 'roco' primero y luego los de las carpetas, sin repetir y en orden alfabético.
export async function listarPersonajes(disco: Disco, carpetas: string[]): Promise<string[]> {
  const ids = new Set<string>()
  for (const carpeta of carpetas) {
    for (const e of await archivos(disco, carpeta)) ids.add(e.name.slice(0, -5))
  }
  ids.delete('roco')
  return ['roco', ...[...ids].sort()]
}

// Busca `<id>.json` en las carpetas en orden (gana la primera) y lo valida.
// 'roco' no se carga de archivo: es el golem de arte.ts.
export async function cargarPersonaje(id: string, disco: Disco, carpetas: string[]): Promise<Resultado> {
  if (id === 'roco' || !ID_VALIDO.test(id)) return no('falta')
  for (const carpeta of carpetas) {
    const e = (await archivos(disco, carpeta)).find(x => x.name === `${id}.json`)
    if (!e) continue
    if (e.size > MAX_BYTES) return no('grande')
    const texto = await disco.leer(`${carpeta}/${e.name}`).catch(() => undefined)
    if (texto === undefined) return no('falta')
    return validarPersonaje(texto, id)
  }
  return no('falta')
}
