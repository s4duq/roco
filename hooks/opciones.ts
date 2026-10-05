import type { PluginOptions } from 'claude-code'

import { NOMBRE } from './arte'
import type { Personaje } from './personaje'
import { obtenerTema } from './temas'
import type { Tema } from './temas'
import { obtenerTextos } from './textos'
import type { Textos } from './textos'

export const CAMPOS_DEFAULT = ['estado', 'acciones', 'uso', 'sesion', 'reinicio', 'contadores']
export const CAMPOS_TODOS = ['estado', 'acciones', 'uso', 'git', 'sesion', 'reinicio', 'contadores']
export const CAMPOS_IZQ = ['estado', 'acciones', 'uso', 'git']
export const CAMPOS_DER = ['sesion', 'reinicio', 'contadores']

export function parsearCampos(raw: unknown): string[] {
  if (typeof raw !== 'string') return CAMPOS_DEFAULT
  const parseados = raw
    .split(',')
    .map(s => s.trim())
    .filter(s => CAMPOS_TODOS.includes(s))
  return parseados.length > 0 ? parseados : CAMPOS_DEFAULT
}

export function parsearNumero(val: unknown, def: number): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 100) {
    return val
  }
  return def
}

export type Estilo = 'completo' | 'compacto' | 'minimo'
export const ESTILOS: readonly Estilo[] = ['completo', 'compacto', 'minimo']
// Valores válidos que comparten /roco (comando.ts) y la herramienta `ajustar` (crear.ts).
export const TEMAS_VALIDOS = ['magma', 'oceano', 'bosque', 'lavanda', 'mono', 'auto']
export const IDIOMAS = ['auto', 'es', 'en']
// Un color termina dentro de un SVG: solo #rrggbb.
export const COLOR = /^#[0-9a-fA-F]{6}$/

// Todo lo que register.tsx leía de `options`, ya validado.
export type Opciones = {
  tx: Textos
  camposIzq: string[]
  camposDer: string[]
  nombre: string
  nombrePuesto: boolean // `nombre` venía escrito; si no, manda el del personaje propio
  tema: Tema
  temaId: string // el nombre del tema guardado (magma, oceano…), para marcarlo en el menú
  acento: string // color propio '#rrggbb' o '' (el del tema)
  campos: string[] // todos los campos elegidos, en su orden
  temaAuto: boolean // con `auto`, el acento sale del personaje propio
  personaje: string // id pedido; 'roco' = el golem de serie
  estilo: Estilo
  avisos: { turnos: number; contexto: number; cuota: number }
}

export function leerOpciones(options: PluginOptions): Opciones {
  const campos = parsearCampos(options.campos)
  const nombre = typeof options.nombre === 'string' ? options.nombre.trim().slice(0, 16) : ''
  const personaje = typeof options.personaje === 'string' ? options.personaje.trim().toLowerCase() : ''
  // Color propio: si es #rrggbb, gana sobre el tema (también sobre `auto`).
  const acento = typeof options.acento === 'string' && COLOR.test(options.acento.trim()) ? options.acento.trim().toLowerCase() : ''
  const tema = obtenerTema(typeof options.tema === 'string' ? options.tema : undefined)
  return {
    tx: obtenerTextos(typeof options.idioma === 'string' ? options.idioma : undefined),
    camposIzq: campos.filter(c => CAMPOS_IZQ.includes(c)),
    camposDer: campos.filter(c => CAMPOS_DER.includes(c)),
    nombre: nombre || NOMBRE,
    nombrePuesto: nombre !== '',
    tema: acento ? { ...tema, acento } : tema,
    temaId: typeof options.tema === 'string' && TEMAS_VALIDOS.includes(options.tema) ? options.tema : 'magma',
    acento,
    campos,
    temaAuto: options.tema === 'auto' && !acento,
    personaje: personaje || 'roco',
    estilo: ESTILOS.find(s => s === options.estilo) ?? 'completo',
    avisos: {
      turnos: parsearNumero(options.avisoTurnos, 20),
      contexto: parsearNumero(options.avisoContexto, 70),
      cuota: parsearNumero(options.avisoCuota, 80),
    },
  }
}

// Con un personaje propio cargado: su nombre si `nombre` no venía escrito y, con el tema `auto`,
// su acento. Devuelve una copia: no toca `o` ni TEMAS.
export function conPersonaje(o: Opciones, p: Personaje): Opciones {
  return {
    ...o,
    nombre: o.nombrePuesto ? o.nombre : p.nombre,
    tema: o.temaAuto ? { ...o.tema, acento: p.acento } : o.tema,
  }
}
