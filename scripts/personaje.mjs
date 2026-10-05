// Conversor de imagen a personaje de Roco: cd scripts && npm run personaje -- <imagen> [opciones]
// Lee con jimp (JS puro), convierte con pixelar.mjs y, antes de escribir, valida con el MISMO
// contrato del mod (hooks/personaje.ts, que Node ≥ 22.18 importa sin compilar).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Jimp } from 'jimp'
import { ANIMOS, ID_VALIDO, NOMBRE_VALIDO, validarPersonaje } from '../hooks/personaje.ts'
import { convertir, idDesdeNombre, nombreDesdeArchivo, vistaPrevia } from './pixelar.mjs'

const AYUDA = `Uso: npm run personaje -- <imagen> [opciones]

  --nombre <texto>    Nombre visible (máx. 16: letras, números, espacio, _ y -). Por defecto, el del archivo.
  --tamano <8-32>     Lado mayor en píxeles (por defecto 24). Nunca agranda.
  --colores <1-16>    Máximo de colores (por defecto 12).
  --fondo <modo>      auto (por defecto): quita el fondo si las 4 esquinas son del mismo color.
                      no: lo deja. #rrggbb: quita ese color desde los bordes.
  --poses <carpeta>   reposo, pensando, trabajando, listo y error (.png, .jpg o .jpeg),
                      del mismo tamaño que la imagen.
  --salida <carpeta>  Dónde guardar <id>.json (por defecto ~/.claude/roco/personajes).
  --forzar            Reemplaza el archivo si ya existe.
  --ayuda, -h         Muestra esta ayuda.

Formatos: PNG, JPEG, BMP, GIF y TIFF.`

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`)
  process.exit(1)
}

function entero(texto, min, max, opcion) {
  const n = Number(texto)
  if (!Number.isInteger(n) || n < min || n > max) fallar(`--${opcion} debe ser un entero entre ${min} y ${max}.`)
  return n
}

// Rutas relativas a donde la persona corrió npm (INIT_CWD), no a scripts/.
const expandir = ruta => resolve(process.env.INIT_CWD ?? process.cwd(), ruta.replace(/^~(?=$|[\\/])/, homedir()))

async function leer(ruta) {
  const img = await Jimp.read(ruta)
  return { ancho: img.bitmap.width, alto: img.bitmap.height, datos: img.bitmap.data }
}

async function main() {
  let args
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        nombre: { type: 'string' },
        tamano: { type: 'string', default: '24' },
        colores: { type: 'string', default: '12' },
        fondo: { type: 'string', default: 'auto' },
        poses: { type: 'string' },
        salida: { type: 'string', default: join(homedir(), '.claude', 'roco', 'personajes') },
        forzar: { type: 'boolean', default: false },
        ayuda: { type: 'boolean', short: 'h', default: false },
      },
    })
  } catch (e) {
    fallar(`${e.message}\n\n${AYUDA}`)
  }
  const { values: o, positionals } = args
  if (o.ayuda) {
    console.log(AYUDA)
    return
  }
  if (positionals.length !== 1) fallar(`Indica una sola imagen.\n\n${AYUDA}`)
  const ruta = expandir(positionals[0])
  if (!existsSync(ruta)) fallar(`No existe ${ruta}.`)

  const tamano = entero(o.tamano, 8, 32, 'tamano')
  const colores = entero(o.colores, 1, 16, 'colores')
  if (o.fondo !== 'auto' && o.fondo !== 'no' && !/^#[0-9a-fA-F]{6}$/.test(o.fondo))
    fallar('--fondo debe ser auto, no o un color #rrggbb.')

  const nombre = o.nombre === undefined ? nombreDesdeArchivo(basename(ruta, extname(ruta))) : o.nombre.trim()
  if (!NOMBRE_VALIDO.test(nombre)) fallar('--nombre: máx. 16 caracteres; solo letras, números, espacio, _ y -.')
  const id = idDesdeNombre(nombre)
  if (!ID_VALIDO.test(id)) fallar(`El nombre "${nombre}" no deja un id de archivo válido; usa letras o números.`)
  if (id === 'roco') fallar('"roco" está reservado para el golem de serie; usa otro --nombre.')

  const poses = {}
  if (o.poses !== undefined) {
    const carpeta = expandir(o.poses)
    for (const animo of ANIMOS) {
      const archivo = ['.png', '.jpg', '.jpeg'].map(ext => join(carpeta, animo + ext)).find(a => existsSync(a))
      if (archivo) poses[animo] = await leer(archivo)
    }
    if (!Object.keys(poses).length) fallar(`En ${carpeta} no hay ninguna pose (${ANIMOS.join(', ')}).`)
  }

  let personaje
  try {
    personaje = convertir(await leer(ruta), poses, { nombre, tamano, colores, fondo: o.fondo })
  } catch (e) {
    fallar(e.message)
  }

  const texto = JSON.stringify(personaje, null, 2)
  const r = validarPersonaje(texto, id)
  if (!r.ok) fallar(`El resultado no cumple el contrato (motivo: ${r.motivo}). Es un error del conversor: avísalo.`)

  const salida = expandir(o.salida)
  const destino = join(salida, `${id}.json`)
  if (existsSync(destino) && !o.forzar) fallar(`Ya existe ${destino}. Usa --forzar para reemplazarlo.`)
  mkdirSync(salida, { recursive: true })
  writeFileSync(destino, texto + '\n', 'utf8')

  console.log(vistaPrevia(personaje))
  const extra = personaje.poses ? `, poses: ${Object.keys(personaje.poses).join(', ')}` : ''
  console.log(`\n✓ ${destino}`)
  console.log(`  ${personaje.ancho}×${personaje.alto} px, ${personaje.paleta.length} colores, acento ${personaje.acento}${extra}`)
  console.log(`  Elígelo con: /roco personaje ${id}`)
}

main().catch(e => fallar(e?.message ?? String(e)))
