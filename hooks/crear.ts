import { ID_VALIDO, MAX_BYTES, validarPersonaje } from './personaje'
import type { MotivoInvalido, Personaje } from './personaje'
import { CAMPOS_TODOS, COLOR, ESTILOS, IDIOMAS, TEMAS_VALIDOS } from './opciones'

// Asistente de creación (/roco crear): Claude conversa con la persona en su idioma y guarda el
// personaje con la herramienta `guardar_personaje`. Lo que llega de Claude pasa por el mismo
// contrato que un archivo (validarPersonaje) y solo se escriben los campos revisados.
// Este módulo nunca recibe `$`.

export const GUARDAR = 'guardar_personaje'
export const AJUSTAR = 'ajustar'

// Contorno de 1 px: todo píxel opaco que toca el borde o un transparente (4 vecinos) pasa a '0',
// el primer color de la paleta. Así Claude solo dibuja el relleno.
export function contornear(filas: readonly string[]): string[] {
  const alto = filas.length
  const opaco = (x: number, y: number) => y >= 0 && y < alto && x >= 0 && x < filas[y].length && filas[y][x] !== '.'
  return filas.map((fila, y) =>
    [...fila]
      .map((c, x) => {
        if (c === '.') return c
        const borde = !opaco(x - 1, y) || !opaco(x + 1, y) || !opaco(x, y - 1) || !opaco(x, y + 1)
        return borde ? '0' : c
      })
      .join(''),
  )
}

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const sonFilas = (v: unknown): v is string[] => Array.isArray(v) && v.every(f => typeof f === 'string')

// El archivo que se escribe: solo los campos del contrato, ya validados.
export function aArchivo(p: Personaje): string {
  const datos: Record<string, unknown> = {
    formato: 1,
    nombre: p.nombre,
    ancho: p.ancho,
    alto: p.alto,
    paleta: p.paleta,
    pixeles: p.pixeles,
    acento: p.acento,
  }
  if (Object.keys(p.poses).length > 0) datos.poses = p.poses
  return JSON.stringify(datos, null, 2) + '\n'
}

export type Preparado =
  | { ok: true; id: string; personaje: Personaje; archivo: string }
  | { ok: false; motivo: MotivoInvalido | 'id' }

// Lo que manda Claude a `guardar_personaje`: { id, personaje (objeto o texto JSON), contorno? }.
export function prepararPersonaje(e: Record<string, unknown>): Preparado {
  const id = typeof e.id === 'string' ? e.id.trim().toLowerCase() : ''
  if (!ID_VALIDO.test(id) || id === 'roco') return { ok: false, motivo: 'id' }

  let datos = e.personaje
  if (typeof datos === 'string') {
    if (datos.length > MAX_BYTES) return { ok: false, motivo: 'grande' }
    try {
      datos = JSON.parse(datos)
    } catch {
      return { ok: false, motivo: 'json' }
    }
  }
  if (!esObjeto(datos)) return { ok: false, motivo: 'json' }

  const copia: Record<string, unknown> = { formato: 1, ...datos }
  if (e.contorno !== false) {
    if (sonFilas(copia.pixeles)) copia.pixeles = contornear(copia.pixeles)
    if (esObjeto(copia.poses)) {
      copia.poses = Object.fromEntries(
        Object.entries(copia.poses).map(([animo, filas]) => [animo, sonFilas(filas) ? contornear(filas) : filas]),
      )
    }
  }

  const r = validarPersonaje(JSON.stringify(copia), id)
  if (!r.ok) return r
  const archivo = aArchivo(r.personaje)
  if (archivo.length > MAX_BYTES) return { ok: false, motivo: 'grande' }
  return { ok: true, id, personaje: r.personaje, archivo }
}

export const MOTIVO_ID = 'the id must be 1 to 32 characters of a-z, 0-9, _ or -, and not "roco"'

// Lo que manda Claude a `ajustar`: cada campo presente se revisa con la misma regla que /roco.
const REGLAS: Record<string, (v: string) => boolean> = {
  nombre: v => v.length <= 16,
  acento: v => v === '' || COLOR.test(v),
  tema: v => TEMAS_VALIDOS.includes(v),
  estilo: v => (ESTILOS as readonly string[]).includes(v),
  idioma: v => IDIOMAS.includes(v),
  campos: v => v !== '' && v.split(',').every(c => CAMPOS_TODOS.includes(c)),
}

const normalizar = (campo: string, v: string): string =>
  campo === 'acento' ? v.trim().toLowerCase()
  : campo === 'campos' ? v.split(',').map(c => c.trim()).filter(Boolean).join(',')
  : v.trim()

export function validarAjustes(e: Record<string, unknown>): { cambios: [string, string][]; rechazados: string[] } {
  const cambios: [string, string][] = []
  const rechazados: string[] = []
  for (const [campo, regla] of Object.entries(REGLAS)) {
    const v = e[campo]
    if (v === undefined) continue
    const valor = typeof v === 'string' ? normalizar(campo, v) : null
    if (valor !== null && regla(valor)) cambios.push([`roco.${campo}`, valor])
    else rechazados.push(campo)
  }
  return { cambios, rechazados }
}

// Descripciones e inputSchema de las herramientas (las lee el modelo, por eso en inglés).
export const HERRAMIENTAS = [
  {
    name: GUARDAR,
    description:
      'Saves a Roco mascot (pixel art shown above the prompt) to ~/.claude/roco/personajes/<id>.json and activates it. ' +
      'Refuses with the reason when the character breaks a rule; fix it and call again.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'File name: 1-32 chars of a-z, 0-9, _ or -; not "roco".' },
        personaje: {
          type: 'object',
          description:
            '{ formato: 1, nombre, ancho, alto, paleta, pixeles, acento, poses? }. ancho/alto 16-24. paleta: 2-6 "#rrggbb", ' +
            'paleta[0] = dark outline. pixeles: alto strings of exactly ancho chars, "." = transparent, "0"-"5" = paleta index. ' +
            'acento: "#rrggbb". poses: optional, same size, keys reposo | pensando | trabajando | listo | error.',
        },
        contorno: { type: 'boolean', description: 'Add the 1-px outline with paleta[0] around the shape (default true).' },
      },
      required: ['id', 'personaje'],
    },
  },
  {
    name: AJUSTAR,
    description: "Changes Roco's options (only the fields given). The strip reloads with them.",
    inputSchema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Name shown in the strip, up to 16 chars ("" = the character\'s own name).' },
        acento: { type: 'string', description: 'Accent color for the strip, "#rrggbb" ("" = the theme\'s).' },
        tema: { type: 'string', enum: TEMAS_VALIDOS },
        estilo: { type: 'string', enum: [...ESTILOS] },
        idioma: { type: 'string', enum: IDIOMAS },
        campos: {
          type: 'string',
          description: `What the strip shows, comma-separated in order, from: ${CAMPOS_TODOS.join(', ')}.`,
        },
      },
    },
  },
]

// Contexto que deja /roco crear: la guía completa es la skill roco:crear (skills/crear/SKILL.md).
export function guiaCrear(descripcion: string): string {
  const pedido = descripcion.trim().slice(0, 300)
  return [
    'The person ran /roco crear: they want to create their own Roco mascot.',
    `If their next message asks to start, load the skill "roco:crear" with the Skill tool and follow it${pedido ? `, starting from their idea: "${pedido}"` : ''}.`,
    `It saves with mcp__roco__${GUARDAR} and adjusts with mcp__roco__${AJUSTAR}.`,
  ].join('\n')
}
