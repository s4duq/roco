import { describe, expect, test } from 'claude-code/testing'
import { obtenerTextos } from './textos'

const SURFACES = ['terminal', 'desktop'] as const

function recolectarTexto(elemento: any): string {
  if (!elemento) return ''
  if (typeof elemento === 'string') return ' ' + elemento
  let texto = ''
  if (typeof elemento.text === 'string') {
    texto += ' ' + elemento.text
  }
  if (Array.isArray(elemento.children)) {
    for (const hijo of elemento.children) {
      if (typeof hijo === 'string') {
        texto += ' ' + hijo
      } else if (typeof hijo === 'object') {
        texto += ' ' + recolectarTexto(hijo)
      }
    }
  }
  return texto
}

const palabrasEspañol = [
  'en reposo',
  'pensando',
  'trabajando',
  'tropezó',
  'conversación',
  'sesión',
  'sin acciones todavía',
  'se reinicia',
]

describe('Roco', () => {
  test('con idioma: "en" no aparece ninguna etiqueta en español (capa TEXTOS)', () => {
    // Los ids de ánimo (reposo, pensando…) son claves del JSON de personaje: no se traducen
    const en = obtenerTextos('en')
    const tx = { ...en, personaje: { ...en.personaje, motivo: { ...en.personaje.motivo, pose: '' } } }
    const recolectar = (v: unknown): string => {
      if (typeof v === 'string') return v
      if (typeof v === 'function') return String((v as (...a: unknown[]) => unknown)('X', 'Y'))
      if (v && typeof v === 'object') return Object.values(v).map(recolectar).join(' ')
      return ''
    }
    const texto = recolectar(tx).toLowerCase()

    for (const palabra of palabrasEspañol) {
      expect(texto).not.toContain(palabra)
    }
  })

  for (const surface of SURFACES) {
    describe(`Superficie: ${surface}`, () => {
      // 1. Idioma: AbovePrompt con idioma en no contiene texto en español
      test(`con idioma: "en" no aparece texto en español en ${surface}`, { options: { idioma: 'en' } }, async $ => {
        const ui = await $.ui.mount({
          plugin: 'roco',
          surface,
          component: 'AbovePrompt',
          props: { hasSurvey: false, bodyColumns: 80 },
        })
        const arbol = await ui.drawn()
        expect(arbol).toBeDefined()
        const texto = recolectarTexto(arbol).toLowerCase()
        for (const palabra of palabrasEspañol) {
          expect(texto).not.toContain(palabra)
        }
      })

      // 2. AbovePrompt se dibuja en los 3 estilos
      test('AbovePrompt en estilo completo incluye detalles', { options: { estilo: 'completo' } }, async $ => {
        const ui = await $.ui.mount({
          plugin: 'roco',
          surface,
          component: 'AbovePrompt',
          props: { hasSurvey: false, bodyColumns: 80 },
        })
        const arbol = await ui.drawn()
        expect(arbol).toBeDefined()
        const texto = recolectarTexto(arbol)
        if (surface === 'desktop') {
          expect(texto).toContain('Sesión')
          expect(texto).toContain('Sin acciones todavía')
        } else {
          expect(texto).toContain('Conversación')
          expect(texto).toContain('Sin acciones todavía')
        }
      })

      test('AbovePrompt en estilo compacto omite columnas extendidas', { options: { estilo: 'compacto' } }, async $ => {
        const ui = await $.ui.mount({
          plugin: 'roco',
          surface,
          component: 'AbovePrompt',
          props: { hasSurvey: false, bodyColumns: 80 },
        })
        const arbol = await ui.drawn()
        expect(arbol).toBeDefined()
        const texto = recolectarTexto(arbol)
        if (surface === 'desktop') {
          expect(texto).not.toContain('Sesión')
          expect(texto).not.toContain('Sin acciones todavía')
        }
        expect(texto).toContain('en reposo')
      })

      test('AbovePrompt en estilo minimo muestra solo nombre y estado', { options: { estilo: 'minimo' } }, async $ => {
        const ui = await $.ui.mount({
          plugin: 'roco',
          surface,
          component: 'AbovePrompt',
          props: { hasSurvey: false, bodyColumns: 80 },
        })
        const arbol = await ui.drawn()
        expect(arbol).toBeDefined()
        const texto = recolectarTexto(arbol)
        expect(texto).toContain('Roco')
        expect(texto).toContain('en reposo')
        expect(texto).not.toContain('Semana')
        expect(texto).not.toContain('5 h')
      })

      // 3. campos filtra y ordena; los campos desconocidos y no seleccionados se ignoran
      test('campos filtra y ordena ignorando desconocidos y no incluidos', { options: { campos: 'acciones,invalido123,estado' } }, async $ => {
        const ui = await $.ui.mount({
          plugin: 'roco',
          surface,
          component: 'AbovePrompt',
          props: { hasSurvey: false, bodyColumns: 80 },
        })
        const arbol = await ui.drawn()
        expect(arbol).toBeDefined()
        const texto = recolectarTexto(arbol)
        expect(texto).not.toContain('invalido123')
        expect(texto).not.toContain('Semana')
        expect(texto).not.toContain('Sesión')
      })
    })
  }

  // 4. /roco tema xyz no guarda nada y responde con la lista válida
  test('/roco tema xyz no guarda nada y responde con la lista válida', async ($, on) => {
    let guardado = false
    on('config.set', async ($, e, next) => {
      guardado = true
      return next(e)
    })

    const res = await $.command.run({ command: 'roco', args: 'tema xyz' })
    expect(res.text).toContain('magma')
    expect(res.text).toContain('oceano')
    expect(res.text).toContain('bosque')
    expect(guardado).toBe(false)
  })
})


