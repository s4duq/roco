import type { BoxProps, ButtonProps, ElementConstructor, RasterProps, SvgProps, TextProps } from 'claude-code'

import type { Animo } from '../types'
import { COLOR, ascii, svg } from './arte'
import { COLORES } from './comando'
import type { Cambio } from './comando'
import { CAMPOS_TODOS, ESTILOS, TEMAS_VALIDOS } from './opciones'
import type { Estilo, Opciones } from './opciones'
import { ANIMOS } from './personaje'
import { medidaSvg } from './pixel'
import type { Dibujo } from './pixel'

// Panel /roco menu: un Pane propio del plugin (no gasta cuota). register.tsx lo abre y le pasa `$`
// solo a través de AccionesMenu; este módulo nunca recibe `$`.
export const MENU = 'roco-menu'

// Elementos de ui.resolve(e): la terminal trae Raster; el escritorio, Svg.
export type PiezasMenu = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
  Svg?: ElementConstructor<SvgProps>
  Raster?: ElementConstructor<RasterProps>
}

// Una mascota de la galería; `dibujo` null = Roco, el de serie.
export type Tarjeta = { id: string; nombre: string; dibujo: Dibujo | null }

// Lo guardado hoy en las opciones y el ánimo con que se muestra la galería.
export type Actual = { personaje: string; tema: string; acento: string; campos: readonly string[]; estilo: Estilo; animo: Animo }

export type AccionesMenu = {
  animo: (a: Animo) => void
  // Guarda en orden; cada cambio puede recargar el módulo (el panel sigue abierto).
  guardar: (cambios: Cambio[]) => void
  crear: () => void
  cerrar: () => void
}

export const CAMPOS_MENU = CAMPOS_TODOS

// Prende o apaga un campo, en el orden de CAMPOS_TODOS. Nunca deja la lista vacía.
export function alternarCampo(campos: readonly string[], campo: string): string[] {
  const nuevos = campos.includes(campo) ? campos.filter(c => c !== campo) : [...campos, campo]
  return nuevos.length > 0 ? CAMPOS_TODOS.filter(c => nuevos.includes(c)) : [...campos]
}

// Lo elegido se marca como el botón principal; sin la prop, el botón normal.
const marca = (si: boolean) => (si ? { variant: 'primary' as const } : {})

function figura(ui: PiezasMenu, t: Tarjeta, animo: Animo, alt: string) {
  const { Box, Text, Svg, Raster } = ui
  if (Svg) {
    const m = medidaSvg(t.dibujo ? t.dibujo.caja : null, 48)
    return <Svg source={t.dibujo ? t.dibujo.svg[animo] : svg(animo)} alt={alt} width={m.width} height={m.height} />
  }
  if (t.dibujo && Raster) {
    const c = t.dibujo.terminal.compacto[animo]
    return <Raster columns={c.columns} rows={c.rows} cells={c.cells} />
  }
  if (!t.dibujo) {
    return (
      <Box flexDirection="column">
        {ascii(animo, 0).map((linea, i) => (
          <Text key={`l${i}`} color={COLOR}>
            {linea}
          </Text>
        ))}
      </Box>
    )
  }
  return <Text dimColor>{t.nombre}</Text>
}

export function panelMenu(ui: PiezasMenu, o: Opciones, a: Actual, tarjetas: readonly Tarjeta[], hacer: AccionesMenu) {
  const { Box, Text, Button } = ui
  const { tx, tema } = o
  const m = tx.menu

  const seccion = (key: string, titulo: string, hijos: unknown[]) => (
    <Box key={key} flexDirection="column">
      <Text bold>{titulo}</Text>
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {hijos}
      </Box>
    </Box>
  )

  const animos = ANIMOS.map((an, i) => (
    <Button key={`animo-${an}`} label={tx.animo[an]} hotkey={String(i + 1)} {...marca(an === a.animo)} onPress={() => hacer.animo(an)} />
  ))

  const galeria = tarjetas.map(t => (
    <Box key={`tarjeta-${t.id}`} flexDirection="column" alignItems="center" width={18}>
      {figura(ui, t, a.animo, `${t.nombre} · ${tx.animo[a.animo]}`)}
      <Text bold wrap="truncate-end">
        {t.nombre}
      </Text>
      {t.id === a.personaje ? (
        <Text color={tema.acento}>✓ {m.actual}</Text>
      ) : (
        <Button key={`elegir-${t.id}`} label={m.elegir} onPress={() => hacer.guardar([['roco.personaje', t.id]])} />
      )}
    </Box>
  ))

  // Un tema trae su color: si había un color propio, se quita después de guardar el tema.
  const temas = TEMAS_VALIDOS.map(t => (
    <Button
      key={`tema-${t}`}
      label={t}
      {...marca(t === a.tema)}
      onPress={() => hacer.guardar(a.acento ? [['roco.tema', t], ['roco.acento', '']] : [['roco.tema', t]])}
    />
  ))

  const colores = [
    ...COLORES.map(c => (
      <Box key={`color-${c.id}`} flexDirection="row">
        <Text color={c.hex}>● </Text>
        <Button key={`boton-${c.id}`} label={m.colores[c.id] ?? c.id} {...marca(c.hex === a.acento)} onPress={() => hacer.guardar([['roco.acento', c.hex]])} />
      </Box>
    )),
    <Button key="color-tema" label={m.colorTema} {...marca(!a.acento)} onPress={() => hacer.guardar([['roco.acento', '']])} />,
  ]

  const campos = CAMPOS_MENU.map(c => {
    const prendido = a.campos.includes(c)
    const nuevos = alternarCampo(a.campos, c).join(',')
    return (
      <Button
        key={`campo-${c}`}
        label={`${prendido ? '✓' : '·'} ${m.campos[c] ?? c}`}
        {...(prendido ? {} : { dimColor: true })}
        onPress={() => {
          if (nuevos !== a.campos.join(',')) hacer.guardar([['roco.campos', nuevos]])
        }}
      />
    )
  })

  const estilos = ESTILOS.map(s => (
    <Button key={`estilo-${s}`} label={m.estilos[s]} {...marca(s === a.estilo)} onPress={() => hacer.guardar([['roco.estilo', s]])} />
  ))

  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor wrap="truncate-end">
        {m.pista}
      </Text>
      {seccion('animos', m.animo, animos)}
      {seccion('galeria', m.mascotas, galeria)}
      {seccion('temas', m.tema, temas)}
      {seccion('colores', m.color, colores)}
      {seccion('campos', m.info, campos)}
      {seccion('estilos', m.tamano, estilos)}
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Button key="crear" label={m.crear} variant="primary" onPress={hacer.crear} />
        <Button key="cerrar" label={m.cerrar} role="dismiss" onPress={hacer.cerrar} />
      </Box>
    </Box>
  )
}
