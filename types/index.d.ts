export type Animo = 'reposo' | 'pensando' | 'trabajando' | 'listo' | 'error'

// A dónde vuelve la mascota cuando vence un estado pasajero (listo, error).
export type Vuelta = { en: number; animo: Animo; detalle: string }

export type Estado = {
  animo: Animo
  detalle: string
  desde: number
  vuelve: Vuelta | null
}

// Medidores de la franja: % (0-100), tokens y momentos en ms epoch; ausente si la app no tiene la cifra.
export type Uso = {
  contexto?: number
  tokens?: number
  cinco?: number
  semana?: number
  inicio?: number
  reinicioCinco?: number
}

// Contadores de esta sesión (sobreviven a las recargas del mod; una sesión nueva empieza en cero).
export type Cuenta = { turnos: number; ediciones: number; comandos: number; errores: number }

export type GitEstado = {
  rama: string
  sinCommit: number
}

declare module 'claude-code' {
  interface PluginState {
    roco: {
      estado: Estado
      cuadro: number
      oculto: boolean
      acciones: string[]
      uso: Uso
      cuenta: Cuenta
      minuto: number
      git: GitEstado | null
      // Ánimo con que el menú muestra la galería.
      animoMenu: Animo
      // Cambios de opciones que faltan por guardar (cada uno recarga el módulo; session.start los retoma).
      pendientes: [string, string][]
    }
  }
}
