import { expect, test } from 'claude-code/testing'

function recolectarTexto(el: any): string {
  if (!el) return ''
  if (typeof el === 'string') return ' ' + el
  let t = typeof el.text === 'string' ? ' ' + el.text : ''
  if (Array.isArray(el.children)) for (const h of el.children) t += recolectarTexto(h)
  return t
}

test('options.nombre llega a register', { options: { nombre: 'ZZTEST' } }, async $ => {
  const ui = await $.ui.mount({
    plugin: 'roco',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, bodyColumns: 80 },
  })
  const texto = recolectarTexto(await ui.drawn())
  if (!texto.includes('ZZTEST')) throw new Error('SIN_NOMBRE: ' + texto.slice(0, 300))
})
