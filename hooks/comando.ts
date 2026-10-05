import { CAMPOS_TODOS, COLOR, ESTILOS, IDIOMAS, TEMAS_VALIDOS } from './opciones'
import type { Textos } from './textos'

// Lo único que /roco necesita del engine. register.tsx lo arma con `$`; este módulo nunca recibe `$`.
export type Hacer = {
  // Alterna la franja y devuelve si quedó oculta.
  alternarOculto: () => Promise<boolean>
  // Clave completa, p. ej. 'roco.tema'. Devuelve false si la configuración no lo aceptó.
  guardar: (clave: string, valor: string) => Promise<boolean>
  // Varios cambios en orden; se salta los que ya tienen ese valor (cada guardado recarga el módulo).
  guardarVarios: (cambios: Cambio[]) => Promise<boolean>
  // Ids de personaje disponibles, 'roco' primero (listarPersonajes con las carpetas reales).
  personajes: () => Promise<string[]>
  // Asistente de creación: devuelve el contexto que lee Claude (la skill roco:crear hace la guía).
  crear: (descripcion: string) => Promise<readonly string[]>
  // Abre el panel /roco menu y dice si quedó abierto. Con `soloPrimeraVez`, solo si nunca se vio.
  menu: (soloPrimeraVez: boolean) => Promise<boolean>
}

// Colores con nombre (es/en, también en femenino): `/roco color morado`, `/roco morado` y el menú.
export const COLORES: readonly { id: string; hex: string; alias: readonly string[] }[] = [
  { id: 'morado', hex: '#a66cff', alias: ['morada', 'violeta', 'purple', 'violet'] },
  { id: 'azul', hex: '#4c8dff', alias: ['blue'] },
  { id: 'rojo', hex: '#ff5c5c', alias: ['roja', 'red'] },
  { id: 'verde', hex: '#3fbf6f', alias: ['green'] },
  { id: 'rosa', hex: '#ff6fae', alias: ['rosado', 'rosada', 'pink'] },
  { id: 'naranja', hex: '#ff8a3d', alias: ['anaranjado', 'anaranjada', 'orange'] },
  { id: 'amarillo', hex: '#f2c230', alias: ['amarilla', 'yellow'] },
  { id: 'cian', hex: '#2ec4d6', alias: ['celeste', 'turquesa', 'cyan'] },
  { id: 'gris', hex: '#9a9a9a', alias: ['gray', 'grey'] },
  { id: 'blanco', hex: '#f2f2f2', alias: ['blanca', 'white'] },
]

// '#rrggbb' en minúsculas, a partir de un hex o de un nombre; undefined si no es un color.
export function colorDe(palabra: string): string | undefined {
  const p = palabra.trim().toLowerCase()
  if (COLOR.test(p)) return p
  return COLORES.find(c => c.id === p || c.alias.includes(p))?.hex
}

// Temas y estilos también por su nombre en inglés o con tilde.
const TEMA_DE: Record<string, string> = { ...Object.fromEntries(TEMAS_VALIDOS.map(t => [t, t])), océano: 'oceano', ocean: 'oceano', forest: 'bosque', lavender: 'lavanda' }
const ESTILO_DE: Record<string, string> = { completo: 'completo', full: 'completo', compacto: 'compacto', compact: 'compacto', minimo: 'minimo', mínimo: 'minimo', minimal: 'minimo' }

// Relleno de una frase (es/en): "cambia el color a morado" → "morado".
const RELLENO = new Set(
  (
    'cambia cambiale cámbiale cambiar pon ponle ponte poner usa usar quiero dame haz hazlo que sea ser el la los las lo un una ' +
    'a al en de del con y mi tu su por favor modo mascota personaje color tema estilo tamaño tamano ' +
    'change set make use put switch i want to the an in into of with and my your it its please be mode pet mascot character theme style size colour'
  ).split(' '),
)

export type Cambio = [clave: string, valor: string]

// Con estas palabras la frase pide quitar algo, no ponerlo: mejor no adivinar.
const NIEGA = new Set(['quita', 'quitar', 'quítale', 'quitale', 'sin', 'no', 'nunca', 'remove', 'without', 'not', "don't", 'dont'])

// Lo que pide una frase: los colores, temas, estilos y personajes que nombra. Las demás palabras
// ("barra", "letras", "cuerpo"…) se ignoran. null si no nombra ninguno o si niega algo.
// Si se repite un tipo, gana el último. Un tema sin color propio vuelve al color del tema.
export function interpretar(frase: string, personajes: readonly string[]): Cambio[] | null {
  const palabras = frase
    .toLowerCase()
    .replace(/[.,;:!?¡¿"«»()]/g, ' ')
    .split(/\s+/)
    .filter(p => p && !RELLENO.has(p))
  if (palabras.some(p => NIEGA.has(p))) return null
  const cambios = new Map<string, string>()
  for (const p of palabras) {
    const color = colorDe(p)
    if (color) cambios.set('roco.acento', color)
    else if (TEMA_DE[p]) cambios.set('roco.tema', TEMA_DE[p])
    else if (ESTILO_DE[p]) cambios.set('roco.estilo', ESTILO_DE[p])
    else if (personajes.includes(p)) cambios.set('roco.personaje', p)
  }
  if (cambios.has('roco.tema') && !cambios.has('roco.acento')) cambios.set('roco.acento', '')
  return cambios.size > 0 ? [...cambios] : null
}

// Los subcomandos también se aceptan en inglés.
const ALIAS: Record<string, string> = {
  menú: 'menu',
  ajustes: 'menu',
  opciones: 'menu',
  settings: 'menu',
  options: 'menu',
  help: 'ayuda',
  create: 'crear',
  character: 'personaje',
  theme: 'tema',
  style: 'estilo',
  fields: 'campos',
  name: 'nombre',
  language: 'idioma',
  colour: 'color',
}

export async function ejecutarRoco(rawArgs: string, nombre: string, tx: Textos, hacer: Hacer): Promise<{ text: string; context?: readonly string[] }> {
  if (!rawArgs) {
    // La primera vez, /roco abre el menú; después solo muestra u oculta la franja.
    if (await hacer.menu(true)) return { text: tx.comando.menuAbierto }
    return { text: (await hacer.alternarOculto()) ? tx.comando.escondido(nombre) : tx.comando.volvio(nombre) }
  }

  const [sub = '', ...resto] = rawArgs.split(/\s+/)
  const valor = resto.join(' ').trim()
  const cmd = ALIAS[sub.toLowerCase()] ?? sub.toLowerCase()

  // Guarda y responde `ok`; si la configuración no lo acepta, lo dice.
  const guardar = async (clave: string, v: string, ok: string) => ({
    text: (await hacer.guardar(clave, v)) ? ok : tx.comando.noGuardado,
  })

  // Mensaje de cada cambio guardado por una frase o un color con nombre.
  const listo: Record<string, (v: string) => string> = {
    'roco.acento': v => (v ? tx.comando.colorCambiado(v) : tx.comando.colorRestablecido),
    'roco.tema': v => tx.comando.temaCambiado(v),
    'roco.estilo': v => tx.comando.estiloCambiado(v),
    'roco.personaje': v => tx.comando.personajeCambiado(v),
  }
  const aplicar = async (cambios: Cambio[]) => {
    if (!(await hacer.guardarVarios(cambios))) return { text: tx.comando.noGuardado }
    return { text: cambios.map(([clave, v]) => listo[clave](v)).join(' ') }
  }

  switch (cmd) {
    case 'ayuda':
      return { text: tx.comando.ayuda(nombre) }

    case 'menu':
      return { text: (await hacer.menu(false)) ? tx.comando.menuAbierto : tx.comando.menuNoAbierto }

    case 'crear':
      return { text: tx.comando.creando, context: await hacer.crear(valor) }

    case 'tema':
      // Elegir un tema trae también su color (quita el color propio, si había).
      if (TEMAS_VALIDOS.includes(valor)) return aplicar([['roco.tema', valor], ['roco.acento', '']])
      return { text: tx.comando.temaInvalido(valor, TEMAS_VALIDOS.join(', ')) }

    case 'estilo':
      if ((ESTILOS as readonly string[]).includes(valor)) return guardar('roco.estilo', valor, tx.comando.estiloCambiado(valor))
      return { text: tx.comando.estiloInvalido(valor, ESTILOS.join(', ')) }

    case 'campos': {
      const lista = valor.split(',').map(s => s.trim()).filter(Boolean)
      if (lista.length > 0 && lista.every(s => CAMPOS_TODOS.includes(s))) {
        return guardar('roco.campos', valor, tx.comando.camposCambiados(valor))
      }
      return { text: tx.comando.camposInvalidos(CAMPOS_TODOS.join(', ')) }
    }

    case 'personaje': {
      const validos = await hacer.personajes()
      if (!valor) return { text: tx.comando.personajesLista(validos.join(', ')) }
      // Mismo criterio que leerOpciones: el id va en minúsculas.
      const id = valor.toLowerCase()
      if (validos.includes(id)) return guardar('roco.personaje', id, tx.comando.personajeCambiado(id))
      return { text: tx.comando.personajeInvalido(valor.slice(0, 32), validos.join(', ')) }
    }

    case 'nombre':
      if (valor.length <= 16) {
        return guardar('roco.nombre', valor, valor ? tx.comando.nombreCambiado(valor) : tx.comando.nombreRestablecido)
      }
      return { text: tx.comando.nombreLargo }

    case 'color': {
      if (!valor) return guardar('roco.acento', '', tx.comando.colorRestablecido)
      const color = colorDe(valor)
      if (color) return guardar('roco.acento', color, tx.comando.colorCambiado(color))
      // "/roco color a morado": la frase entera, siempre que pida solo un color.
      const frase = interpretar(valor, [])
      if (frase && frase.every(([clave]) => clave === 'roco.acento')) return aplicar(frase)
      return { text: tx.comando.colorInvalido }
    }

    case 'idioma':
      if (IDIOMAS.includes(valor)) return guardar('roco.idioma', valor, tx.comando.idiomaCambiado(valor))
      return { text: tx.comando.idiomaInvalido(valor, IDIOMAS.join(', ')) }

    default: {
      // "/roco morado", "/roco gato", "cambia el color a morado": frases simples.
      const cambios = interpretar(rawArgs, await hacer.personajes())
      return cambios ? aplicar(cambios) : { text: tx.comando.noEntendi }
    }
  }
}
