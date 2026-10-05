export type Tema = {
  acento: string
  aviso: string
  error: string
}

export const TEMAS: Record<string, Tema> = {
  magma: {
    acento: '#FF8A3D',
    aviso: '#E5A50A',
    error: '#E24B4A',
  },
  oceano: {
    acento: '#38BDF8',
    aviso: '#FBBF24',
    error: '#F43F5E',
  },
  bosque: {
    acento: '#34D399',
    aviso: '#FBBF24',
    error: '#EF4444',
  },
  lavanda: {
    acento: '#A78BFA',
    aviso: '#FBBF24',
    error: '#F43F5E',
  },
  mono: {
    acento: '#E2E8F0',
    aviso: '#FBBF24',
    error: '#EF4444',
  },
}

// En auto es igual a magma; con un personaje propio, conPersonaje (opciones.ts) toma su acento.
TEMAS.auto = TEMAS.magma

export function obtenerTema(nombreTema?: string): Tema {
  return (nombreTema && TEMAS[nombreTema]) ? TEMAS[nombreTema] : TEMAS.magma
}
