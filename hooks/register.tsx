import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Animo, Cuenta, Estado, GitEstado, Uso, Vuelta } from '../types'
import { medirGit } from './campos/git'
import { ejecutarRoco } from './comando'
import { HERRAMIENTAS, MOTIVO_ID, guiaCrear, prepararPersonaje, validarAjustes } from './crear'
import { accionDe, detalleDe } from './formato'
import { conPersonaje, leerOpciones } from './opciones'
import { cargarPersonaje, listarPersonajes } from './personaje'
import type { Disco } from './personaje'
import { prepararDibujo } from './pixel'
import type { Dibujo } from './pixel'
import { estiloEfectivo, franjaGrafica, franjaTerminal } from './vista'
import type { Lectura } from './vista'
import { NOMBRE } from './arte'
import { MENU, panelMenu } from './menu'
import type { Tarjeta } from './menu'

const INICIAL: Estado = { animo: 'reposo', detalle: '', desde: 0, vuelve: null }

const estado = atom({ plugin: 'roco', key: 'estado' } as const, INICIAL)
const cuadro = atom({ plugin: 'roco', key: 'cuadro' } as const, 0)
const oculto = atom({ plugin: 'roco', key: 'oculto' } as const, false)
const acciones = atom({ plugin: 'roco', key: 'acciones' } as const, [] as string[])
const uso = atom({ plugin: 'roco', key: 'uso' } as const, {} as Uso)
const cuenta = atom({ plugin: 'roco', key: 'cuenta' } as const, { turnos: 0, ediciones: 0, comandos: 0, errores: 0 } as Cuenta)
// Reloj de la columna derecha: se actualiza cada 30 s (local, sin tokens).
const minuto = atom({ plugin: 'roco', key: 'minuto' } as const, 0)
const git = atom({ plugin: 'roco', key: 'git' } as const, null as GitEstado | null)
const animoMenu = atom({ plugin: 'roco', key: 'animoMenu' } as const, 'reposo' as Animo)
const pendientes = atom({ plugin: 'roco', key: 'pendientes' } as const, [] as [string, string][])

// Últimas 3 acciones, la más reciente primero; no repite la misma seguida.
async function anotar($: EngineInterface, accion: string) {
  await update($, acciones, lista => (lista[0] === accion ? lista : [accion, ...lista].slice(0, 3)))
}

// Lectura local de la app (la llamada simple no gasta tokens): contexto de la conversación y límites de Claude Pro.
async function medir($: EngineInterface) {
  const u = await $.session.usage().catch(() => undefined)
  if (!u) {
    return
  }

  const limite = (kind: string) => u.rateLimits.find(r => r.kind === kind)
  const reinicio = Date.parse(limite('five_hour')?.resetsAt ?? '')

  await update($, uso, () => ({
    contexto: u.context.percent,
    tokens: u.context.tokens,
    cinco: limite('five_hour')?.percentUsed,
    semana: limite('seven_day')?.percentUsed,
    inicio: u.startedAt,
    reinicioCinco: Number.isFinite(reinicio) ? reinicio : undefined,
  }))
}

async function contar($: EngineInterface, campo: keyof Cuenta) {
  await update($, cuenta, c => ({ ...c, [campo]: c[campo] + 1 }))
}

async function fijar($: EngineInterface, animo: Animo, detalle: string, vuelve: Vuelta | null = null) {
  const nuevo: Estado = { animo, detalle, desde: await $.clock.now(), vuelve }
  await update($, estado, () => nuevo)
}

async function actualizarRepos($: EngineInterface) {
  try {
    const fakeEngine = {
      process: {
        run: (argv: readonly string[]) => $.process.run(argv),
      },
    } as unknown as EngineInterface

    const g = await medirGit(fakeEngine)
    await update($, git, () => g)
  } catch {
    await update($, git, () => null)
  }
}

// Personajes: el disco del engine y las carpetas donde buscar, en orden.
// Gana la carpeta del usuario; después, los personajes incluidos con el plugin.
const discoDe = ($: EngineInterface): Disco => ({ listar: p => $.fs.list(p), leer: p => $.fs.read(p) })

async function carpetaUsuario($: EngineInterface): Promise<string | undefined> {
  // Sin $.env (p. ej. en el kit de tests) no hay carpeta del usuario: quedan los personajes incluidos.
  const home = (await $.env.get('USERPROFILE').catch(() => undefined)) ?? (await $.env.get('HOME').catch(() => undefined))
  return home ? `${home}/.claude/roco/personajes` : undefined
}

async function carpetasPersonajes($: EngineInterface): Promise<string[]> {
  const propia = await carpetaUsuario($)
  return [...(propia ? [propia] : []), `${$.plugin.root}/personajes`]
}

// Galería del menú: Roco y cada personaje que pasa el contrato (los JSON inválidos no se muestran).
// Se arma una vez por apertura; una recarga del módulo la vuelve a armar.
let galeria: Promise<Tarjeta[]> | null = null

function cargarGaleria($: EngineInterface): Promise<Tarjeta[]> {
  galeria ??= (async () => {
    const disco = discoDe($)
    const carpetas = await carpetasPersonajes($)
    const tarjetas: Tarjeta[] = []
    for (const id of await listarPersonajes(disco, carpetas)) {
      if (id === 'roco') {
        tarjetas.push({ id, nombre: NOMBRE, dibujo: null })
        continue
      }
      const r = await cargarPersonaje(id, disco, carpetas)
      const d = r.ok ? prepararDibujo(r.personaje) : null
      if (d) tarjetas.push({ id, nombre: d.personaje.nombre, dibujo: d })
    }
    return tarjetas
  })().catch(() => [{ id: 'roco', nombre: NOMBRE, dibujo: null }])
  return galeria
}

// Abre el menú. `pedido`: lo pidió la persona (toma el teclado y cuenta como visto); si no, solo
// se acomoda desde 144 columnas. Devuelve si quedó dibujado.
async function abrirMenu($: EngineInterface, titulo: string, pedido: boolean): Promise<boolean> {
  galeria = null
  const r = await $.ui
    .open({ id: MENU, title: titulo, closeOnEscape: true, rows: 30, ...(pedido ? { focus: true as const } : {}) })
    .catch(() => ({ isPlaced: false }))
  if (pedido && r.isPlaced) await $.store.set('menuVisto', true).catch(() => undefined)
  return r.isPlaced
}

// Guarda una opción como el menú /config. Con `--plugin-dir` la fila puede llamarse
// `roco@inline.<campo>`: si la clave corta no existe, se usa la fila del plugin que termina igual.
async function guardarOpcion($: EngineInterface, clave: string, valor: string): Promise<boolean> {
  const intentar = async (key: string) => {
    try {
      const r = await $.config.set({ key, value: valor })
      return !(r && 'deny' in r && r.deny)
    } catch {
      return false
    }
  }
  if (await intentar(clave)) return true
  const campo = clave.slice(clave.indexOf('.') + 1)
  const filas = await $.config.list().catch(() => [])
  const fila = filas.find(x => x.key !== clave && x.key.startsWith('roco') && x.key.endsWith(`.${campo}`))
  return fila ? intentar(fila.key) : false
}

// Varios cambios seguidos (el botón de tema quita además el color propio). Cada $.config.set puede
// recargar el módulo y cortar el bucle: lo que falta queda en `pendientes` y session.start lo retoma.
async function guardarEnOrden($: EngineInterface, cambios: [string, string][]): Promise<boolean> {
  for (let i = 0; i < cambios.length; i++) {
    await update($, pendientes, () => cambios.slice(i + 1))
    const [clave, valor] = cambios[i]
    if (!(await guardarOpcion($, clave, valor))) {
      await update($, pendientes, () => [])
      return false
    }
  }
  return true
}

export const register: Register = (on, options = {}) => {
  // Herramientas en curso; pueden correr en paralelo.
  let activas = 0

  const o = leerOpciones(options)
  const { tx } = o
  // Personaje propio: se carga en session.start; sin él, o si falla, queda Roco.
  let dibujo: Dibujo | null = null
  let ov = o // opciones de la vista: con el nombre y el acento del personaje propio, si lo hay

  on('session.start', async ($, e, next) => {
    activas = 0

    dibujo = null
    ov = o
    if (o.personaje !== 'roco') {
      const r = await cargarPersonaje(o.personaje, discoDe($), await carpetasPersonajes($))
      const d = r.ok ? prepararDibujo(r.personaje) : null
      if (!r.ok) {
        $.ui.toast(tx.personaje.fallo(o.personaje, tx.personaje.motivo[r.motivo]))
      } else if (!d) {
        $.ui.toast(tx.personaje.fallo(o.personaje, tx.personaje.svgGrande))
      } else {
        dibujo = d
        ov = conPersonaje(o, r.personaje)
      }
    }

    await $.command.register({ name: 'roco', description: tx.comando.descripcion(ov.nombre), argumentHint: tx.comando.pista })
    // Herramientas del asistente /roco crear (crear.ts).
    for (const h of HERRAMIENTAS) await $.tool.register(h).catch(() => undefined)
    // Primera sesión con el plugin: invita a elegir la mascota (una sola vez).
    if (!(await $.store.get('bienvenida').catch(() => true))) {
      $.ui.toast(tx.comando.bienvenida(ov.nombre))
      await $.store.set('bienvenida', true).catch(() => undefined)
    }
    // Hasta que la persona abra o cierre el menú, se ofrece solo (si la ventana es ancha).
    if (!(await $.store.get('menuVisto').catch(() => true))) void abrirMenu($, tx.menu.titulo(ov.nombre), false)
    // Cambios que una recarga dejó a medias.
    const resto = await read($, pendientes)
    if (resto.length > 0) void guardarEnOrden($, resto)
    await fijar($, 'reposo', tx.estado.esperando)
    await medir($)
    const ya = await $.clock.now()
    await update($, minuto, () => ya)

    void actualizarRepos($)
    $.clock.every(120000, () => void actualizarRepos($))

    $.clock.every(30000, () => {
      void (async () => {
        const t = await $.clock.now()
        await update($, minuto, () => t)
      })()
    })

    // Reloj local (no gasta tokens): anima la terminal y vence los estados pasajeros.
    $.clock.every(600, () => {
      void (async () => {
        await update($, cuadro, n => (n + 1) % 1000)
        const actual = await read($, estado)

        if (actual.vuelve && (await $.clock.now()) >= actual.vuelve.en) {
          await fijar($, actual.vuelve.animo, actual.vuelve.detalle)
        }
      })()
    })

    return next(e)
  })

  on('command.run', { command: 'roco' }, async ($, e) => {
    const rawArgs = typeof e.args === 'string' ? e.args.trim() : ''
    return ejecutarRoco(rawArgs, ov.nombre, tx, {
      alternarOculto: async () => {
        await update($, oculto, v => !v)
        return read($, oculto)
      },
      guardar: (clave, valor) => guardarOpcion($, clave, valor),
      personajes: async () => listarPersonajes(discoDe($), await carpetasPersonajes($)),
      // Sin $.prompt.submit: en la app de escritorio no arrancó ningún turno (2026-10-04). La guía es
      // la skill roco:crear; esto solo deja a Claude el contexto por si la persona responde aquí.
      crear: async descripcion => [guiaCrear(descripcion)],
      menu: async soloPrimeraVez => {
        if (soloPrimeraVez && (await $.store.get('menuVisto').catch(() => true))) return false
        return abrirMenu($, tx.menu.titulo(ov.nombre), true)
      },
    })
  })

  // Cerrado por la persona o por el botón: ya no se vuelve a ofrecer solo.
  on('ui.close', { id: MENU }, async ($, e, next) => {
    await $.store.set('menuVisto', true).catch(() => undefined)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: MENU }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const animo = await read($, animoMenu)
    const tarjetas = await cargarGaleria($)
    const actual = { personaje: o.personaje, tema: o.temaId, acento: o.acento, campos: o.campos, estilo: o.estilo, animo }
    return panelMenu(ui, ov, actual, tarjetas, {
      animo: a => void update($, animoMenu, () => a),
      // El panel sigue abierto tras la recarga y se redibuja con lo nuevo.
      guardar: cambios =>
        void (async () => {
          if (!(await guardarEnOrden($, cambios))) $.ui.toast(tx.comando.noGuardado)
        })(),
      // Con el panel abierto (un diálogo) el cuadro no acepta texto: primero se cierra.
      crear: () =>
        void (async () => {
          await $.store.set('menuVisto', true).catch(() => undefined)
          await $.ui.close({ id: MENU }).catch(() => undefined)
          const r = await $.prompt.fill({ text: '/roco:crear ' }).catch(() => ({ isFilled: false }))
          $.ui.toast(r.isFilled ? tx.menu.escribeIdea : tx.menu.escribeComando)
        })(),
      cerrar: () =>
        void (async () => {
          await $.store.set('menuVisto', true).catch(() => undefined)
          await $.ui.close({ id: MENU }).catch(() => undefined)
        })(),
    })
  })

  // Herramientas del asistente: lo que manda Claude se valida igual que un archivo de personaje.
  on('tool.call', { tool: 'mcp__roco__guardar_personaje' }, async ($, e) => {
    const r = prepararPersonaje(e as unknown as Record<string, unknown>)
    if (!r.ok) return { deny: r.motivo === 'id' ? MOTIVO_ID : tx.personaje.motivo[r.motivo] }
    const d = prepararDibujo(r.personaje)
    if (!d) return { deny: tx.personaje.svgGrande }
    const carpeta = await carpetaUsuario($)
    if (!carpeta) return { deny: 'there is no home folder (USERPROFILE or HOME) to save the character' }
    const ruta = `${carpeta}/${r.id}.json`
    await $.fs.write(ruta, r.archivo)
    // Se ve desde ya; la opción lo deja para las próximas sesiones (al recargar, session.start lo carga del archivo).
    dibujo = d
    ov = conPersonaje(o, r.personaje)
    galeria = null // el menú, si está abierto, la muestra al redibujarse
    const fijo = await guardarOpcion($, 'roco.personaje', r.id)
    return {
      result: fijo
        ? `Saved ${ruta} and activated "${r.id}".`
        : `Saved ${ruta}. It shows now, but the option could not be saved: ask the person to run /roco personaje ${r.id}.`,
    }
  })

  on('tool.call', { tool: 'mcp__roco__ajustar' }, async ($, e) => {
    const { cambios, rechazados } = validarAjustes(e as unknown as Record<string, unknown>)
    const hechos: string[] = []
    for (const [clave, valor] of cambios) {
      if (await guardarOpcion($, clave, valor)) hechos.push(`${clave.slice(5)}=${valor || '(default)'}`)
    }
    const malos = rechazados.length ? ` Invalid, not saved: ${rechazados.join(', ')}.` : ''
    if (!hechos.length) return { deny: `Nothing was saved.${malos}` }
    return { result: `Saved: ${hechos.join(', ')}. The strip reloads with the new options.${malos}` }
  })

  on('turn.start', async ($, e, next) => {
    activas = 0
    await contar($, 'turnos')
    await fijar($, 'pensando', tx.estado.leyendo)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    activas += 1
    const campos = e as unknown as Record<string, unknown>
    await fijar($, 'trabajando', detalleDe(e.tool, campos, tx))
    await anotar($, accionDe(e.tool, campos, tx))
    if (['Edit', 'Write', 'NotebookEdit'].includes(e.tool)) {
      await contar($, 'ediciones')
    } else if (e.tool === 'Bash' || e.tool === 'PowerShell') {
      await contar($, 'comandos')
    }

    let hecho
    try {
      hecho = await next(e)
    } finally {
      activas = Math.max(0, activas - 1)
    }

    if (hecho.deny !== undefined || hecho.isError === true) {
      await contar($, 'errores')
      const vuelta: Vuelta = { en: (await $.clock.now()) + 3000, animo: 'pensando', detalle: tx.estado.buscandoForma }
      await fijar($, 'error', hecho.deny !== undefined ? tx.estado.sinPermiso(e.tool) : tx.estado.falloTool(e.tool), vuelta)
    } else if (activas === 0) {
      await fijar($, 'pensando', tx.estado.pensandoPaso)
    }
    await medir($)

    return hecho
  })

  on('turn.complete', async ($, e, next) => {
    activas = 0
    const vuelta: Vuelta = { en: (await $.clock.now()) + 12000, animo: 'reposo', detalle: tx.estado.esperando }

    if (e.reason === 'answer') {
      await fijar($, 'listo', tx.estado.termine, vuelta)
    } else if (e.reason === 'aborted') {
      await fijar($, 'reposo', tx.estado.detuve)
    } else {
      await fijar($, 'error', e.reason === 'refusal' ? tx.estado.refusal : tx.estado.error, vuelta)
    }

    const resultado = await next(e)
    await medir($)
    void actualizarRepos($)

    return resultado
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, oculto))) {
      return next(e)
    }

    const l: Lectura = {
      ahora: await read($, estado),
      hechas: await read($, acciones),
      medido: await read($, uso),
      c: await read($, cuenta),
      g: await read($, git),
      ahoraMs: await read($, minuto),
    }
    const estilo = estiloEfectivo(o.estilo, (e.props as unknown as Record<string, unknown>).bodyColumns)

    if (e.surface === 'terminal') {
      // `cuadro` cambia cada 600 ms: solo se lee (y suscribe) donde se dibuja el ASCII; el personaje propio va fijo.
      const n = estilo === 'minimo' || dibujo ? 0 : await read($, cuadro)
      return franjaTerminal($.ui.resolve(e), ov, l, estilo, n, dibujo)
    }
    return franjaGrafica($.ui.resolve(e), ov, l, estilo, dibujo)
  })
}
