import type { BoxProps, ElementConstructor, RasterProps, SvgProps, TextProps } from 'claude-code'

import type { Cuenta, Estado, GitEstado, Uso } from '../types'
import { ascii, svg } from './arte'
import { avisoDe, duracion, lineaGit, lineaUso, pct } from './formato'
import type { Estilo, Opciones } from './opciones'
import { medidaSvg } from './pixel'
import type { Dibujo } from './pixel'

// Elementos de ui.resolve(e): la terminal no tiene Svg, pero es la única con Raster.
export type Piezas = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Raster?: ElementConstructor<RasterProps>
}
export type PiezasSvg = Piezas & { Svg: ElementConstructor<SvgProps> }

// Lo que la franja lee del estado en cada dibujo; las lecturas (y suscripciones) las hace register.tsx.
export type Lectura = {
  ahora: Estado
  hechas: string[]
  medido: Uso
  c: Cuenta
  g: GitEstado | null
  ahoraMs: number
}

// Con menos de 60 columnas, "completo" pasa a "compacto".
export const estiloEfectivo = (estilo: Estilo, bodyColumns: unknown): Estilo =>
  typeof bodyColumns === 'number' && bodyColumns < 60 && estilo === 'completo' ? 'compacto' : estilo

function columnaIzquierda(ui: Piezas, o: Opciones, l: Lectura) {
  const { Box, Text } = ui
  const { tx, tema, camposIzq } = o
  const nombreDisplay = o.nombre
  const { ahora, hechas, medido, c, g } = l
  const aviso = avisoDe(medido, c, o.avisos, tx)

  const elementosIzquierda = camposIzq
    .map(campo => {
      switch (campo) {
        case 'estado':
          return (
            <Box key="estado" flexDirection="row" minWidth={0}>
              <Text bold>
                {nombreDisplay} <Text color={tema.acento}>·</Text> {tx.animo[ahora.animo]}
              </Text>
              <Text dimColor wrap="truncate-end">
                {' — '}
                {ahora.detalle}
              </Text>
            </Box>
          )
        case 'acciones':
          return (
            <Text key="acciones" dimColor wrap="truncate-end">
              {hechas.length > 0 ? hechas.join(' · ') : tx.acciones.sinAcciones}
            </Text>
          )
        case 'uso':
          return aviso ? (
            <Text key="uso" color={tema.aviso} wrap="truncate-end">
              {lineaUso(medido, tx)} · ⚠ {aviso}
            </Text>
          ) : (
            <Text key="uso" dimColor wrap="truncate-end">
              {lineaUso(medido, tx)}
            </Text>
          )
        case 'git': {
          const lg = lineaGit(g, tx)
          return lg ? (
            <Text key="git" dimColor wrap="truncate-end">
              {lg}
            </Text>
          ) : null
        }
        default:
          return null
      }
    })
    .filter(Boolean)

  const lineas = (
    <Box flexDirection="column" justifyContent="center" minWidth={0}>
      {elementosIzquierda}
    </Box>
  )

  return lineas
}

export function franjaTerminal(ui: Piezas, o: Opciones, l: Lectura, estilo: Estilo, cuadro: number, d: Dibujo | null = null) {
  const { Box, Text } = ui
  const { tx, tema } = o
  const nombreDisplay = o.nombre
  const { ahora } = l
  const lineas = columnaIzquierda(ui, o, l)

  if (estilo === 'minimo') {
    return (
      <Text bold>
        {nombreDisplay} <Text color={tema.acento}>·</Text> {tx.animo[ahora.animo]}
        <Text dimColor> — {ahora.detalle}</Text>
      </Text>
    )
  }

  // Personaje propio: medios bloques en un Raster (fijo). Sin Raster, el ASCII de Roco con su nombre.
  const { Raster } = ui
  if (d && Raster) {
    const celdas = d.terminal[estilo === 'compacto' ? 'compacto' : 'completo'][ahora.animo]
    return (
      <Box flexDirection="row" alignItems="center" gap={2}>
        <Raster key="personaje" columns={celdas.columns} rows={celdas.rows} cells={celdas.cells} />
        {lineas}
      </Box>
    )
  }

  const [l1, l2, l3] = ascii(ahora.animo, cuadro)
  const tinta = ahora.animo === 'error' ? 'gray' : tema.acento

  return (
    <Box flexDirection="row" gap={2}>
      <Box flexDirection="column">
        <Text color={tinta}>{l1}</Text>
        <Text color={tinta}>{l2}</Text>
        <Text color={tinta}>{l3}</Text>
      </Box>
      {lineas}
    </Box>
  )
}

export function franjaGrafica(ui: PiezasSvg, o: Opciones, l: Lectura, estilo: Estilo, d: Dibujo | null = null) {
  const { Box, Text, Svg } = ui
  const { tx, tema, camposDer } = o
  const nombreDisplay = o.nombre
  const { ahora, medido, c, ahoraMs } = l
  const aviso = avisoDe(medido, c, o.avisos, tx)
  const lineas = columnaIzquierda(ui, o, l)
  // Roco o el personaje propio, al alto pedido. El nombre va solo en `alt`, nunca dentro del SVG.
  const dibujar = (alto: number) => {
    const m = medidaSvg(d ? d.caja : null, alto)
    return (
      <Svg
        source={d ? d.svg[ahora.animo] : svg(ahora.animo)}
        alt={`${nombreDisplay} · ${tx.animo[ahora.animo]}: ${ahora.detalle}`}
        width={m.width}
        height={m.height}
      />
    )
  }

  if (estilo === 'minimo') {
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        {dibujar(37)}
        <Text bold>
          {nombreDisplay} <Text color={tema.acento}>·</Text> {tx.animo[ahora.animo]}
        </Text>
        <Text dimColor wrap="truncate-end">
          {' — '}
          {ahora.detalle}
        </Text>
      </Box>
    )
  }

  if (estilo === 'compacto') {
    const detalleCompacto = `${ahora.detalle} · 5 h ${pct(medido.cinco)} · ${tx.uso.semana} ${pct(medido.semana)}${aviso ? ` · ⚠ ${aviso}` : ''}`
    return (
      <Box flexDirection="row" alignItems="center" gap={1} width="100%">
        {dibujar(44)}
        <Box flexDirection="row" flexGrow={1} flexShrink={1} minWidth={0}>
          <Text bold>
            {nombreDisplay} <Text color={tema.acento}>·</Text> {tx.animo[ahora.animo]}
          </Text>
          <Text dimColor wrap="truncate-end">
            {' — '}
            {detalleCompacto}
          </Text>
        </Box>
      </Box>
    )
  }

  const elementosDerecha = camposDer
    .map(campo => {
      switch (campo) {
        case 'sesion':
          return (
            <Text key="sesion" dimColor wrap="truncate-end">
              {tx.derecha.sesion(medido.inicio !== undefined && ahoraMs > 0 ? duracion(ahoraMs - medido.inicio, tx) : '–')}
            </Text>
          )
        case 'reinicio':
          return (
            <Text key="reinicio" dimColor wrap="truncate-end">
              {tx.derecha.cuotaCinco(medido.reinicioCinco !== undefined && ahoraMs > 0 ? duracion(medido.reinicioCinco - ahoraMs, tx) : '–')}
            </Text>
          )
        case 'contadores':
          return (
            <Text key="contadores" dimColor wrap="truncate-end">
              💬 {c.turnos} {tx.derecha.turnos} · ✏️ {c.ediciones} · ▶ {c.comandos} · ⚠ {c.errores}
            </Text>
          )
        default:
          return null
      }
    })
    .filter(Boolean)

  // Ancho fijo (peor caso de duraciones y contadores): si cambiara cada minuto, empujaría el texto de la izquierda.
  const anchoDer =
    Math.max(
      tx.derecha.sesion('23 h 59 m').length,
      tx.derecha.cuotaCinco('23 h 59 m').length,
      `💬 999 ${tx.derecha.turnos} · ✏️ 999 · ▶ 999 · ⚠ 999`.length,
    ) + 2
  const derecha =
    elementosDerecha.length > 0 ? (
      <Box flexDirection="column" alignItems="flex-start" justifyContent="center" flexShrink={0} width={anchoDer}>
        {elementosDerecha}
      </Box>
    ) : null

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap={1}
      width="100%"
      borderStyle="round"
      borderColor={tema.acento}
    >
      {/* Como imagen (sin isInteractive): fondo transparente; el marco interactivo pinta blanco en modo oscuro. */}
      {dibujar(72)}
      <Box flexGrow={1} flexShrink={1} minWidth={0}>
        {lineas}
      </Box>
      {derecha}
    </Box>
  )
}
