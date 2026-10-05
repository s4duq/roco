import { describe, expect, test } from 'claude-code/testing'
import { CAMPOS_MENU, MENU, alternarCampo } from './menu'
import { ANIMOS } from './personaje'
import { obtenerTextos } from './textos'

const SURFACES = ['terminal', 'desktop'] as const
const tx = obtenerTextos('es')

const montar = ($: any, surface: (typeof SURFACES)[number]) =>
  $.ui.mount({
    plugin: 'roco',
    surface,
    component: 'Pane',
    requestId: MENU,
    props: { title: 'Roco · menú', isFocused: true, bodyColumns: 100, placement: 'inline' },
  })

// El kit no trae disco ni $.store: los hooks del test hacen de engine. En la carpeta del plugin hay
// un personaje válido (michi) y un JSON roto, que el menú no debe mostrar.
const MICHI = JSON.stringify({
  formato: 1,
  nombre: 'Michi',
  ancho: 8,
  alto: 8,
  paleta: ['#2b2321', '#ff8a3d'],
  pixeles: ['........', '..0110..', '.011110.', '.011110.', '.011110.', '.011110.', '..0110..', '........'],
  acento: '#ff8a3d',
})
const ARCHIVOS: Record<string, string> = { 'michi.json': MICHI, 'roto.json': '{ no es json' }

const disco = (on: any) => {
  const guardado: Record<string, unknown> = {}
  on('fs.list', async ($: any, e: any) => ({
    value: String(e.path).endsWith('personajes')
      ? Object.entries(ARCHIVOS).map(([name, texto]) => ({ name, kind: 'file', size: texto.length, mtimeMs: 0 }))
      : [],
  }))
  on('fs.read', async ($: any, e: any) => ({ value: ARCHIVOS[String(e.path).split(/[\\/]/).pop() ?? ''] ?? '' }))
  on('store.get', async ($: any, e: any) => ({ value: guardado[e.key] }))
  on('store.set', async ($: any, e: any) => {
    guardado[e.key] = e.value
    return { value: undefined }
  })
  return guardado
}

// Lo que el plugin manda a guardar: [campo, valor], sin el prefijo de la fila (roco. o roco@inline.).
// Se responde como la config que acepta el valor (en el kit no hay nada debajo ni recarga).
const anotarGuardados = (on: any) => {
  const guardados: [string, unknown][] = []
  on('config.set', async ($: any, e: any) => {
    guardados.push([String(e.key).slice(String(e.key).indexOf('.') + 1), e.value])
    return { value: e.value }
  })
  return guardados
}

test('alternarCampo prende y apaga en el orden de siempre y nunca deja la lista vacía', () => {
  expect(alternarCampo(['uso', 'estado'], 'acciones')).toEqual(['estado', 'acciones', 'uso'])
  expect(alternarCampo(['estado', 'uso'], 'uso')).toEqual(['estado'])
  expect(alternarCampo(['estado'], 'estado')).toEqual(['estado'])
  expect(CAMPOS_MENU).toContain('git')
})

for (const surface of SURFACES) {
  describe(`Menú en ${surface}`, () => {
    test('muestra los 5 ánimos, la galería con Roco marcado y todas las secciones', { options: { idioma: 'es' } }, async ($, on) => {
      disco(on)
      const ui = await montar($, surface)
      const botones = (await ui.findAll({ type: 'Button' })).map((b: any) => b.key)
      for (const a of ANIMOS) {
        expect((await ui.find({ type: 'Button', key: `animo-${a}` }))?.props.label).toBe(tx.animo[a])
      }
      expect(botones).toContain('elegir-michi')
      expect(botones).not.toContain('elegir-roto')
      expect(botones).not.toContain('elegir-roco')
      for (const nombre of ['Roco', 'Michi', `✓ ${tx.menu.actual}`]) {
        expect(await ui.find({ text: nombre })).toBeDefined()
      }
      for (const key of ['tema-oceano', 'boton-morado', 'color-tema', 'campo-git', 'estilo-minimo', 'crear', 'cerrar']) {
        expect(botones).toContain(key)
      }
    })

    test('con otro personaje guardado, ese es el actual y Roco se puede elegir', { options: { personaje: 'michi' } }, async ($, on) => {
      disco(on)
      const ui = await montar($, surface)
      const botones = (await ui.findAll({ type: 'Button' })).map((b: any) => b.key)
      expect(botones).toContain('elegir-roco')
      expect(botones).not.toContain('elegir-michi')
    })

    test('el botón de ánimo cambia el que está marcado', async $ => {
      const ui = await montar($, surface)
      expect((await ui.find({ key: 'animo-reposo' }))?.props.variant).toBe('primary')
      await ui.press({ key: 'animo-error' })
      expect((await ui.find({ key: 'animo-error' }))?.props.variant).toBe('primary')
      expect((await ui.find({ key: 'animo-reposo' }))?.props.variant).toBeUndefined()
    })

    test('Elegir guarda el personaje', async ($, on) => {
      disco(on)
      const guardados = anotarGuardados(on)
      const ui = await montar($, surface)
      await ui.press({ key: 'elegir-michi' })
      expect(guardados).toEqual([['personaje', 'michi']])
    })

    test('un color con nombre guarda su #rrggbb', async ($, on) => {
      const guardados = anotarGuardados(on)
      const ui = await montar($, surface)
      await ui.press({ key: 'boton-morado' })
      expect(guardados).toEqual([['acento', '#a66cff']])
    })

    test('un tema guarda el tema y quita el color propio', { options: { acento: '#ff0080' } }, async ($, on) => {
      const guardados = anotarGuardados(on)
      const ui = await montar($, surface)
      await ui.press({ key: 'tema-oceano' })
      expect(guardados).toEqual([
        ['tema', 'oceano'],
        ['acento', ''],
      ])
    })

    test('un campo apagado se prende en su lugar', async ($, on) => {
      const guardados = anotarGuardados(on)
      const ui = await montar($, surface)
      await ui.press({ key: 'campo-git' })
      expect(guardados).toEqual([['campos', 'estado,acciones,uso,git,sesion,reinicio,contadores']])
    })

    test('el tamaño guarda el estilo', async ($, on) => {
      const guardados = anotarGuardados(on)
      const ui = await montar($, surface)
      await ui.press({ key: 'estilo-minimo' })
      expect(guardados).toEqual([['estilo', 'minimo']])
    })

    test('con idioma en, el menú habla inglés', { options: { idioma: 'en' } }, async ($, on) => {
      disco(on)
      const ui = await montar($, surface)
      expect((await ui.find({ key: 'animo-reposo' }))?.props.label).toBe('resting')
      expect((await ui.find({ key: 'elegir-michi' }))?.props.label).toBe('Pick')
      expect(await ui.find({ text: 'Ánimo' })).toBeUndefined()
    })
  })
}

test('/roco menu abre el panel con foco y Esc lo cierra', async ($, on) => {
  const abiertos: any[] = []
  disco(on)
  on('ui.open', async ($, e) => {
    abiertos.push(e)
    return { value: { isPlaced: true } }
  })
  const r = await $.command.run({ command: 'roco', args: 'menu' })
  expect(r.text).toBe(tx.comando.menuAbierto)
  expect(abiertos.length).toBe(1)
  expect(abiertos[0].id).toBe(MENU)
  expect(abiertos[0].focus).toBe(true)
  expect(abiertos[0].closeOnEscape).toBe(true)
})

test('el primer /roco abre el menú; los siguientes muestran u ocultan la franja', async ($, on) => {
  const guardado = disco(on)
  on('ui.open', async () => ({ value: { isPlaced: true as const } }))
  expect((await $.command.run({ command: 'roco', args: '' })).text).toBe(tx.comando.menuAbierto)
  expect((await $.command.run({ command: 'roco', args: '' })).text).toBe(tx.comando.escondido('Roco'))
  expect((await $.command.run({ command: 'roco', args: '' })).text).toBe(tx.comando.volvio('Roco'))
  expect(guardado.menuVisto).toBe(true)
})

test('cerrar el menú lo marca como visto', async ($, on) => {
  const guardado = disco(on)
  const cerrados: string[] = []
  on('ui.close', async ($, e) => {
    cerrados.push(e.id)
    return { value: undefined }
  })
  const ui = await montar($, 'terminal')
  await ui.press({ key: 'cerrar' })
  expect(cerrados).toEqual([MENU])
  expect(guardado.menuVisto).toBe(true)
})
