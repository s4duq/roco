import type { Animo } from '../types'

// El personaje. Para cambiar de mascota se reemplaza solo este archivo,
// manteniendo NOMBRE, COLOR, svg() y ascii(). El SVG es autónomo (sin scripts):
// el mismo dibujo sirve para otra superficie o una web, cambiando la clase raíz.

export const NOMBRE = 'Roco'
export const COLOR = '#FF8A3D'

// Golem pixel art Magma: basalto con lava por dentro.
// Contorno, sombra, piedra, barriga, brillo, superficie, runa/ojos, mejillas.
const P = { o: '#6E5A52', d: '#2B2321', m: '#3E3431', b: '#4D413D', l: '#5E504B', v: '#3E3431', g: '#FF8A3D', k: '#C25A3A' }
type Tinta = keyof typeof P

const LAVA = '#F0752B'
const CHISPA = '#FAC775'
const ROJO = '#E24B4A'

const U = 6
const px = (x: number, y: number, c: string, w = 1, h = 1) =>
  `<rect x="${x * U}" y="${y * U}" width="${w * U}" height="${h * U}" fill="${c}"/>`
const malla = (filas: string[], x0: number, y0: number) =>
  filas.map((fila, j) => [...fila].map((ch, i) => (ch === '.' ? '' : px(x0 + i, y0 + j, P[ch as Tinta]))).join('')).join('')
const puntos = (lista: [number, number][], c: string) => lista.map(([x, y]) => px(x, y, c)).join('')
const zeta = (x: number, y: number): [number, number][] =>
  [[x, y], [x + 1, y], [x + 2, y], [x + 1, y + 1], [x, y + 2], [x + 1, y + 2], [x + 2, y + 2]]

const CABEZA = ['...oooooooo...', '.oollvvvvmloo.', 'ollmmmmmmmmmdo', 'olmmmmmmmmmmdo', 'olmmmmmmmmmmdo', 'olkkmmmmmmkkdo', 'odmmmmmmmmmmdo', '.oddddddddddo.']
const TORSO = ['.oooddddddddooo.', 'ollmmmmmmmmmmmdo', 'olmmmmmmmmmmmmdo', 'olmmmbbbbbbmmmdo', 'olmmbbbbbbbbmmdo', 'odmmmbbbbbbmmmdo', '.oddddddddddddo.', '..oooooooooooo..']
const BRAZO_I = ['.oo.', 'olmo', 'olmo', 'ommo', 'oddo', '.oo.']
const BRAZO_D = ['.oo.', 'omdo', 'omdo', 'ommo', 'oddo', '.oo.']
const PIERNA = ['ommdo', 'ooooo']
const VENAS: [number, number][] = [[6, 10], [7, 11], [7, 12], [8, 13], [16, 11], [17, 12], [15, 14], [16, 3], [17, 2], [6, 3]]

// Animación por pasos (steps), píxel a píxel. Una pose por estado:
// reposo = siesta, pensando = burbujas, trabajando = forja, listo = erupción, error = grieta roja.
const CSS = `.gl{shape-rendering:crispEdges}
.gl .sup{animation:bob 1.6s steps(1,end) infinite}
.gl .ojo{transform-box:fill-box;transform-origin:center;animation:pa 4s steps(1,end) infinite}
.gl .runa{animation:ru 2.4s steps(1,end) infinite}
.gl .vena{animation:ru 1.6s steps(1,end) infinite}
.gl .zz g,.gl .fu{animation:sube 3s steps(4,end) infinite}.gl .zz g:nth-child(2){animation-delay:-1.5s}.gl .fu{animation-duration:.8s}
.gl .bu rect,.gl .fg rect,.gl .al rect{opacity:0;animation:ap 1.8s steps(1,end) infinite}
.gl .bu rect:nth-child(2){animation-delay:.3s}.gl .bu rect:nth-child(3){animation-delay:.6s}
.gl .fg rect{animation-duration:.4s}.gl .fg rect:nth-child(odd){animation-delay:.15s}.gl .al rect{animation-duration:.8s}
.reposo .ojos{display:none}.reposo .dorm,.reposo .zz{display:inline}.reposo .sup{animation-duration:3.2s}
.pensando .runa{animation-duration:.8s}.pensando .ojos{transform:translateY(-6px)}.pensando .bu{display:inline}
.trabajando .bi,.trabajando .bd{animation:ar .4s steps(1,end) infinite}.trabajando .fg{display:inline}.trabajando .vena,.trabajando .runa{animation-duration:.4s}
.listo .ojos{display:none}.listo .felices,.listo .fu{display:inline}.listo .bi,.listo .bd{transform:translateY(-18px)}.listo .sup,.listo .vena{animation:none}.listo .vena rect{fill:#FFB347}
.error .ojos,.error .sonrisa{display:none}.error .triste,.error .x,.error .grieta,.error .al{display:inline}.error .sup{animation:te .3s steps(1,end) 4}.error .runa rect,.error .vena rect{fill:${ROJO}}.error .runa{animation-duration:.5s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
@keyframes pa{0%,92%,100%{transform:scaleY(1)}93%{transform:scaleY(.5)}}
@keyframes ru{0%{opacity:1}50%{opacity:.45}}
@keyframes ap{0%{opacity:0}33%{opacity:1}66%{opacity:0}}
@keyframes ar{0%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes te{0%{transform:translateX(-6px)}50%{transform:translateX(6px)}}
@keyframes sube{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-24px);opacity:0}}`

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -24 156 144" width="156" height="144" class="gl {{ANIMO}}">
<style>${CSS}</style>
${px(4, 19, 'rgba(0,0,0,.35)', 16, 1)}
<g class="todo">${malla(PIERNA, 6, 17)}${malla(PIERNA, 13, 17)}
<g class="sup">${malla(TORSO, 4, 9)}<g class="runa">${px(11, 10, P.g, 2, 2)}</g>
<g class="bi">${malla(BRAZO_I, 0, 10)}</g><g class="bd">${malla(BRAZO_D, 20, 10)}</g>
${malla(CABEZA, 5, 1)}
<g class="vena">${puntos(VENAS, LAVA)}</g>
<g class="ojos"><g class="ojo">${px(8, 4, P.g, 2, 2)}${px(8, 4, '#FFE3C2')}</g><g class="ojo">${px(14, 4, P.g, 2, 2)}${px(14, 4, '#FFE3C2')}</g></g>
<g class="dorm" display="none">${puntos([[8, 5], [9, 5], [14, 5], [15, 5]], P.g)}</g>
<g class="felices" display="none">${puntos([[7, 5], [8, 4], [9, 4], [10, 5], [13, 5], [14, 4], [15, 4], [16, 5]], P.g)}</g>
<g class="x" display="none">${puntos([[7, 3], [9, 3], [8, 4], [7, 5], [9, 5], [14, 3], [16, 3], [15, 4], [14, 5], [16, 5]], '#F06A6A')}</g>
<g class="sonrisa">${puntos([[10, 6], [11, 7], [12, 7], [13, 6]], P.o)}</g>
<g class="triste" display="none">${puntos([[10, 7], [11, 6], [12, 6], [13, 7]], P.o)}</g>
<g class="grieta" display="none">${puntos([[17, 2], [16, 3], [17, 4], [6, 12], [7, 13]], ROJO)}</g>
</g></g>
<g class="zz" display="none"><g>${puntos(zeta(20, -1), '#B4B2A9')}</g><g>${puntos(zeta(23, -4), '#888780')}</g></g>
<g class="bu" display="none">${px(20, 5, P.g)}${px(21, 2, P.g, 2, 2)}${px(23, 0, P.g, 3, 3)}</g>
<g class="fg" display="none">${puntos([[0, 16], [2, 17], [4, 16], [1, 18], [19, 16], [21, 17], [23, 16], [22, 18]], CHISPA)}${puntos([[1, 17], [3, 18], [20, 18], [24, 17]], P.g)}</g>
<g class="fu" display="none">${puntos([[11, 0], [12, 0], [9, -2], [14, -2], [11, -3], [12, -3]], P.g)}${puntos([[10, -1], [13, -1]], CHISPA)}</g>
<g class="al" display="none">${px(22, -2, ROJO, 1, 3)}${px(22, 2, ROJO)}</g>
</svg>`

// Superficies con SVG (escritorio, VS Code, móvil): la animación es CSS dentro del dibujo.
export const svg = (animo: Animo): string => SVG.replace('{{ANIMO}}', animo)

// Terminal: tres líneas de texto que avanzan con `cuadro`.
export const ascii = (animo: Animo, cuadro: number): [string, string, string] => {
  const par = cuadro % 2 === 0
  const puntos = '.'.repeat((cuadro % 3) + 1).padEnd(3)

  switch (animo) {
    case 'reposo':
      return [`  ,----, ${['z  ', 'zZ ', 'zZz'][cuadro % 3]}`, ' [ -  - ]  ', ' /|  <>  |\\']
    case 'pensando':
      return [`  ,----, ${puntos}`, " [ '  ' ]  ", ' /|  <>  |\\']
    case 'trabajando':
      return [par ? '  ,----, * ' : '  ,----,  *', ' [ o  o ]  ', par ? ' \\|  <>  |/' : ' /|  <>  |\\']
    case 'listo':
      return [par ? '  ,*^^*,   ' : '  ,^**^,   ', ' [ ^  ^ ]  ', ' \\|  <>  |/']
    case 'error':
      return ['  ,----, ! ', ' [ x  x ]  ', ' /|  ..  |\\']
  }
}
