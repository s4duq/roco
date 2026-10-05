import type { Cuenta, GitEstado, Uso } from '../types'
import { TEXTOS } from './textos'
import type { Textos } from './textos'

export const lineaGit = (g: GitEstado | null, tx: Textos = TEXTOS.es): string | null => {
  if (!g) return null
  return `${g.rama} · ${tx.git.sinCommit(g.sinCommit)}`
}

export const nombreDe = (ruta: unknown): string =>
  typeof ruta === 'string' ? (ruta.split(/[\\/]/).pop() ?? ruta) : ''

// Traduce cada herramienta a lo que la mascota "está haciendo".
export const detalleDe = (tool: string, campos: Record<string, unknown>, tx: Textos = TEXTOS.es): string => {
  const archivo = nombreDe(campos.file_path ?? campos.notebook_path) || tx.detalle.archivoDefault

  switch (tool) {
    case 'Read':
      return tx.detalle.leyendo(archivo)
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return tx.detalle.escribiendo(archivo)
    case 'Bash':
    case 'PowerShell':
      return tx.detalle.ejecutandoComando
    case 'Grep':
    case 'Glob':
      return tx.detalle.buscandoCodigo
    case 'WebSearch':
    case 'WebFetch':
      return tx.detalle.investigandoWeb
    case 'Agent':
      return tx.detalle.coordinandoSubagente
    case 'Skill':
      return tx.detalle.cargandoSkill
    default:
      return tx.detalle.usandoTool(tool.startsWith('mcp__') ? (tool.split('__').pop() ?? tool) : tool)
  }
}

export const corto = (texto: string, max = 22): string => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto)

// Resumen de una acción para la franja: icono + archivo o comando, nunca el texto completo.
export const accionDe = (tool: string, campos: Record<string, unknown>, tx: Textos = TEXTOS.es): string => {
  const archivo = nombreDe(campos.file_path ?? campos.notebook_path) || tx.acciones.archivoDefault

  switch (tool) {
    case 'Read':
      return `📖 ${archivo}`
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return `✏️ ${archivo}`
    case 'Bash':
    case 'PowerShell': {
      // Sin el "cd <ruta> &&" inicial y solo dos palabras: evita rutas largas o valores sensibles.
      const comando = typeof campos.command === 'string' ? campos.command.trim().replace(/^cd\s+\S+\s*&&\s*/, '') : ''
      return `▶ ${corto(comando.split(/\s+/).slice(0, 2).join(' ') || tx.acciones.comandoDefault)}`
    }
    case 'Grep':
    case 'Glob':
      return `🔍 ${corto(String(campos.pattern ?? tx.acciones.buscarDefault))}`
    case 'WebSearch':
    case 'WebFetch':
      return `🌐 ${tx.acciones.web}`
    case 'Agent':
      return `🤖 ${tx.acciones.subagente}`
    case 'Skill':
      return `🧩 ${corto(String(campos.skill ?? tx.acciones.skill))}`
    default:
      return `🔌 ${corto(tool.startsWith('mcp__') ? (tool.split('__').pop() ?? tool) : tool)}`
  }
}

export const pct = (n?: number): string => (n === undefined ? '–' : `${Math.round(n)}%`)

export const miles = (n?: number): string => (n === undefined ? '' : ` (${Math.round(n / 1000)}k)`)

export const lineaUso = (u: Uso, tx: Textos = TEXTOS.es): string =>
  `${tx.uso.conversacion} ${pct(u.contexto)}${miles(u.tokens)} · ${tx.uso.cincoHoras} ${pct(u.cinco)} · ${tx.uso.semana} ${pct(u.semana)}`

// "1 h 05 min" o "12 min"; nunca negativo.
export const duracion = (ms: number, tx: Textos = TEXTOS.es): string => {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? tx.tiempo.duracionHoras(h, String(m).padStart(2, '0')) : tx.tiempo.duracionMin(m)
}

export const avisoDe = (u: Uso, c: Cuenta, avisos: { turnos: number; contexto: number; cuota: number }, tx: Textos = TEXTOS.es): string | undefined => {
  if ((avisos.turnos > 0 && c.turnos >= avisos.turnos) || (avisos.contexto > 0 && (u.contexto ?? 0) >= avisos.contexto)) {
    return tx.uso.avisoConversacion
  }
  if (avisos.cuota > 0 && (u.cinco ?? 0) >= avisos.cuota) {
    return tx.uso.avisoCuota
  }
  return undefined
}

// "12 min", "3 h", "2 d": para entregas que pueden tener días.
export const hace = (ms: number, tx: Textos = TEXTOS.es): string => {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return tx.tiempo.haceMin(min)
  if (min < 1440) return tx.tiempo.haceHoras(Math.round(min / 60))
  return tx.tiempo.haceDias(Math.round(min / 1440))
}
