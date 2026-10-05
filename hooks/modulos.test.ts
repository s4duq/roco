import { expect, test } from 'claude-code/testing'
import { NOMBRE } from './arte'
import { ejecutarRoco } from './comando'
import { accionDe } from './formato'
import { conPersonaje, leerOpciones } from './opciones'
import { obtenerTextos } from './textos'
import { estiloEfectivo } from './vista'

const tx = obtenerTextos('es')

// Adaptador falso: anota lo que /roco guardaría en la config. `visto`: el menú ya se abrió alguna vez.
const falso = (acepta = true, visto = true) => {
  const guardados: [string, string][] = []
  const creados: string[] = []
  const menus: boolean[] = []
  let oculto = false
  return {
    guardados,
    creados,
    menus,
    hacer: {
      menu: async (soloPrimeraVez: boolean) => {
        if (soloPrimeraVez && visto) return false
        visto = true
        menus.push(soloPrimeraVez)
        return true
      },
      alternarOculto: async () => (oculto = !oculto),
      guardar: async (clave: string, valor: string) => {
        if (acepta) guardados.push([clave, valor])
        return acepta
      },
      guardarVarios: async (cambios: [string, string][]) => {
        if (acepta) guardados.push(...cambios)
        return acepta
      },
      personajes: async () => ['roco', 'fantasma', 'gato', 'robot'],
      crear: async (descripcion: string) => {
        creados.push(descripcion)
        return [`guía: ${descripcion}`]
      },
    },
  }
}

test('/roco tema válido guarda roco.tema', async () => {
  const f = falso()
  const r = await ejecutarRoco('tema oceano', 'Roco', tx, f.hacer)
  // Elegir un tema también devuelve su color (register.tsx no escribe el acento si ya estaba vacío).
  expect(f.guardados).toEqual([
    ['roco.tema', 'oceano'],
    ['roco.acento', ''],
  ])
  expect(r.text).toBe(`${tx.comando.temaCambiado('oceano')} ${tx.comando.colorRestablecido}`)
})

test('/roco tema inválido no guarda nada', async () => {
  const f = falso()
  await ejecutarRoco('tema xyz', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([])
})

test('/roco sin argumentos alterna la franja', async () => {
  const f = falso()
  expect((await ejecutarRoco('', 'Roco', tx, f.hacer)).text).toBe(tx.comando.escondido('Roco'))
  expect((await ejecutarRoco('', 'Roco', tx, f.hacer)).text).toBe(tx.comando.volvio('Roco'))
})

test('leerOpciones: valores fuera de rango vuelven al defecto', () => {
  const o = leerOpciones({ estilo: 'raro', avisoTurnos: 500, nombre: '  ' })
  expect(o.estilo).toBe('completo')
  expect(o.avisos.turnos).toBe(20)
  expect(o.nombre).toBe(NOMBRE)
})

test('estiloEfectivo: completo pasa a compacto con menos de 60 columnas', () => {
  expect(estiloEfectivo('completo', 59)).toBe('compacto')
  expect(estiloEfectivo('completo', 60)).toBe('completo')
  expect(estiloEfectivo('minimo', 40)).toBe('minimo')
})

test('accionDe oculta los argumentos del comando', () => {
  expect(accionDe('Bash', { command: 'cd C:/x && git push --force origin' }, tx)).toBe('▶ git push')
})

test('/roco personaje sin id lista los disponibles y no guarda nada', async () => {
  const f = falso()
  const r = await ejecutarRoco('personaje', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([])
  expect(r.text).toBe(tx.comando.personajesLista('roco, fantasma, gato, robot'))
})

test('/roco personaje acepta un id de la lista, sin importar mayúsculas', async () => {
  const f = falso()
  const r = await ejecutarRoco('personaje Gato', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([['roco.personaje', 'gato']])
  expect(r.text).toBe(tx.comando.personajeCambiado('gato'))
})

test('/roco personaje con un id fuera de la lista no guarda nada', async () => {
  const f = falso()
  const r = await ejecutarRoco('personaje ../gato', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([])
  expect(r.text).toBe(tx.comando.personajeInvalido('../gato', 'roco, fantasma, gato, robot'))
})

test('/roco crear manda la descripción al asistente', async () => {
  const f = falso()
  const r = await ejecutarRoco('crear un gato con sombrero', 'Roco', tx, f.hacer)
  expect(f.creados).toEqual(['un gato con sombrero'])
  expect(r.text).toBe(tx.comando.creando)
  expect(r.context).toEqual(['guía: un gato con sombrero'])
})

test('/roco color: #rrggbb se guarda en minúsculas, sin valor vuelve el del tema y lo demás no se guarda', async () => {
  const f = falso()
  expect((await ejecutarRoco('color #FF0080', 'Roco', tx, f.hacer)).text).toBe(tx.comando.colorCambiado('#ff0080'))
  expect((await ejecutarRoco('color', 'Roco', tx, f.hacer)).text).toBe(tx.comando.colorRestablecido)
  expect((await ejecutarRoco('color xyz', 'Roco', tx, f.hacer)).text).toBe(tx.comando.colorInvalido)
  expect(f.guardados).toEqual([
    ['roco.acento', '#ff0080'],
    ['roco.acento', ''],
  ])
})

test('/roco sin argumentos abre el menú la primera vez y después alterna la franja', async () => {
  const f = falso(true, false)
  expect((await ejecutarRoco('', 'Roco', tx, f.hacer)).text).toBe(tx.comando.menuAbierto)
  expect((await ejecutarRoco('', 'Roco', tx, f.hacer)).text).toBe(tx.comando.escondido('Roco'))
  expect(f.menus).toEqual([true])
})

test('/roco menu (y menú, settings) abre el menú aunque ya se haya visto', async () => {
  const f = falso()
  for (const sub of ['menu', 'menú', 'settings']) {
    expect((await ejecutarRoco(sub, 'Roco', tx, f.hacer)).text).toBe(tx.comando.menuAbierto)
  }
  expect(f.menus).toEqual([false, false, false])
  expect(f.guardados).toEqual([])
})

test('/roco color y /roco a secas aceptan colores con nombre en español e inglés', async () => {
  const f = falso()
  expect((await ejecutarRoco('color morado', 'Roco', tx, f.hacer)).text).toBe(tx.comando.colorCambiado('#a66cff'))
  await ejecutarRoco('color Rojo', 'Roco', tx, f.hacer)
  await ejecutarRoco('color a azul', 'Roco', tx, f.hacer)
  expect((await ejecutarRoco('morada', 'Roco', tx, f.hacer)).text).toBe(tx.comando.colorCambiado('#a66cff'))
  await ejecutarRoco('purple', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([
    ['roco.acento', '#a66cff'],
    ['roco.acento', '#ff5c5c'],
    ['roco.acento', '#4c8dff'],
    ['roco.acento', '#a66cff'],
    ['roco.acento', '#a66cff'],
  ])
})

test('/roco entiende frases simples: color, tema, estilo y personaje', async () => {
  const f = falso()
  expect((await ejecutarRoco('cambia el color a morado', 'Roco', tx, f.hacer)).text).toBe(tx.comando.colorCambiado('#a66cff'))
  await ejecutarRoco('pon el tema océano', 'Roco', tx, f.hacer)
  await ejecutarRoco('usa el gato', 'Roco', tx, f.hacer)
  await ejecutarRoco('modo compacto', 'Roco', tx, f.hacer)
  await ejecutarRoco('make it pink and minimal', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([
    ['roco.acento', '#a66cff'],
    ['roco.tema', 'oceano'],
    ['roco.acento', ''],
    ['roco.personaje', 'gato'],
    ['roco.estilo', 'compacto'],
    ['roco.acento', '#ff6fae'],
    ['roco.estilo', 'minimo'],
  ])
})

test('/roco con algo que no entiende no guarda nada y remite al menú y a /roco:crear', async () => {
  const f = falso()
  for (const frase of ['hazme un dragón', 'cambia el color a fucsia', 'quita el gato', 'no quiero el color azul']) {
    const r = await ejecutarRoco(frase, 'Roco', tx, f.hacer)
    expect(r.text).toBe(tx.comando.noEntendi)
  }
  expect(tx.comando.noEntendi).toContain('/roco menu')
  expect(tx.comando.noEntendi).toContain('/roco:crear')
  expect(f.guardados).toEqual([])
})

test('/roco acepta los subcomandos en inglés', async () => {
  const f = falso()
  await ejecutarRoco('theme oceano', 'Roco', tx, f.hacer)
  await ejecutarRoco('character gato', 'Roco', tx, f.hacer)
  await ejecutarRoco('language auto', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([
    ['roco.tema', 'oceano'],
    ['roco.acento', ''],
    ['roco.personaje', 'gato'],
    ['roco.idioma', 'auto'],
  ])
})

test('/roco avisa si la configuración no aceptó el cambio', async () => {
  const f = falso(false)
  expect((await ejecutarRoco('tema oceano', 'Roco', tx, f.hacer)).text).toBe(tx.comando.noGuardado)
})

test('/roco ayuda usa el nombre elegido', async () => {
  const r = await ejecutarRoco('ayuda', 'Michi', tx, falso().hacer)
  expect(r.text.includes('Michi')).toBe(true)
  expect(r.text.includes('/roco:crear')).toBe(true)
})

test('/roco entiende frases largas e ignora las palabras que no son color, tema, estilo ni mascota', async () => {
  const f = falso()
  await ejecutarRoco('haz la barra del color de roco como magma igual las letras de su nombre', 'Roco', tx, f.hacer)
  await ejecutarRoco('color del naranja que tiene roco en su cuerpo', 'Roco', tx, f.hacer)
  expect(f.guardados).toEqual([
    ['roco.personaje', 'roco'],
    ['roco.tema', 'magma'],
    ['roco.acento', ''],
    ['roco.acento', '#ff8a3d'],
  ])
  // El molde literal no es un color: el mensaje da ejemplos reales.
  const r = await ejecutarRoco('color #rrggbb,', 'Roco', tx, f.hacer)
  expect(r.text).toBe(tx.comando.colorInvalido)
  expect(tx.comando.colorInvalido).toContain('/roco color naranja')
})

test('leerOpciones: el color propio gana sobre el tema y sobre auto; uno inválido se ignora', () => {
  const o = leerOpciones({ tema: 'auto', acento: '#00FF00' })
  expect(o.tema.acento).toBe('#00ff00')
  expect(o.temaAuto).toBe(false)
  const p = { id: 'x', nombre: 'X', ancho: 8, alto: 8, paleta: ['#000000'], pixeles: [], acento: '#123456', poses: {} }
  expect(conPersonaje(o, p).tema.acento).toBe('#00ff00')
  expect(leerOpciones({ tema: 'oceano', acento: 'rojo' }).tema.acento).toBe('#38BDF8')
})
