import type { Animo } from '../types'
import type { MotivoInvalido } from './personaje'

export type Idioma = 'es' | 'en'

export interface Textos {
  animo: Record<Animo, string>
  estado: {
    esperando: string
    leyendo: string
    pensandoPaso: string
    termine: string
    detuve: string
    error: string
    refusal: string
    buscandoForma: string
    sinPermiso: (tool: string) => string
    falloTool: (tool: string) => string
  }
  detalle: {
    archivoDefault: string
    leyendo: (archivo: string) => string
    escribiendo: (archivo: string) => string
    ejecutandoComando: string
    buscandoCodigo: string
    investigandoWeb: string
    coordinandoSubagente: string
    cargandoSkill: string
    usandoTool: (tool: string) => string
  }
  acciones: {
    archivoDefault: string
    comandoDefault: string
    buscarDefault: string
    web: string
    subagente: string
    skill: string
    sinAcciones: string
  }
  uso: {
    conversacion: string
    cincoHoras: string
    semana: string
    avisoConversacion: string
    avisoCuota: string
  }
  tiempo: {
    duracionHoras: (h: number, m: string) => string
    duracionMin: (m: number) => string
    haceMin: (m: number) => string
    haceHoras: (h: number) => string
    haceDias: (d: number) => string
  }
  derecha: {
    sesion: (dur: string) => string
    cuotaCinco: (dur: string) => string
    turnos: string
  }
  git: {
    sinCommit: (n: number) => string
  }
  comando: {
    descripcion: (nombre: string) => string
    // Se ve en gris junto a /roco en el menú de comandos.
    pista: string
    escondido: (nombre: string) => string
    volvio: (nombre: string) => string
    ayuda: (nombre: string) => string
    temaCambiado: (tema: string) => string
    temaInvalido: (tema: string, validos: string) => string
    estiloCambiado: (estilo: string) => string
    estiloInvalido: (estilo: string, validos: string) => string
    camposCambiados: (campos: string) => string
    camposInvalidos: (validos: string) => string
    personajeCambiado: (personaje: string) => string
    personajeInvalido: (personaje: string, validos: string) => string
    personajesLista: (lista: string) => string
    creando: string
    colorCambiado: (color: string) => string
    colorRestablecido: string
    colorInvalido: string
    noGuardado: string
    bienvenida: (nombre: string) => string
    nombreCambiado: (nombre: string) => string
    nombreRestablecido: string
    nombreLargo: string
    idiomaCambiado: (idioma: string) => string
    idiomaInvalido: (idioma: string, validos: string) => string
    menuAbierto: string
    menuNoAbierto: string
    noEntendi: string
  }
  // Panel /roco menu (menu.tsx). Los ids (temas, colores, campos) son claves; aquí solo lo que se lee.
  menu: {
    titulo: (nombre: string) => string
    pista: string
    animo: string
    mascotas: string
    actual: string
    elegir: string
    tema: string
    color: string
    colorTema: string
    colores: Record<string, string>
    info: string
    campos: Record<string, string>
    tamano: string
    estilos: Record<'completo' | 'compacto' | 'minimo', string>
    crear: string
    cerrar: string
    escribeIdea: string
    escribeComando: string
  }
  personaje: {
    motivo: Record<MotivoInvalido, string>
    fallo: (id: string, motivo: string) => string
    svgGrande: string
  }
}

export const TEXTOS: Record<Idioma, Textos> = {
  es: {
    animo: {
      reposo: 'en reposo',
      pensando: 'pensando',
      trabajando: 'trabajando',
      listo: 'listo',
      error: 'tropezó',
    },
    estado: {
      esperando: 'Esperando tu mensaje',
      leyendo: 'Leyendo tu mensaje',
      pensandoPaso: 'Pensando el siguiente paso',
      termine: 'Terminé, te toca',
      detuve: 'Me detuve',
      error: 'Hubo un error',
      refusal: 'No pude hacer eso',
      buscandoForma: 'Buscando otra forma',
      sinPermiso: tool => `No tuvo permiso para ${tool}`,
      falloTool: tool => `Falló ${tool}`,
    },
    detalle: {
      archivoDefault: 'un archivo',
      leyendo: archivo => `Leyendo ${archivo}`,
      escribiendo: archivo => `Escribiendo ${archivo}`,
      ejecutandoComando: 'Ejecutando un comando',
      buscandoCodigo: 'Buscando en el código',
      investigandoWeb: 'Investigando en la web',
      coordinandoSubagente: 'Coordinando un subagente',
      cargandoSkill: 'Cargando una skill',
      usandoTool: tool => `Usando ${tool}`,
    },
    acciones: {
      archivoDefault: 'archivo',
      comandoDefault: 'comando',
      buscarDefault: 'buscar',
      web: 'web',
      subagente: 'subagente',
      skill: 'skill',
      sinAcciones: 'Sin acciones todavía',
    },
    uso: {
      conversacion: 'Conversación',
      cincoHoras: '5 h',
      semana: 'Semana',
      avisoConversacion: 'conviene conversación nueva',
      avisoCuota: 'cuota de 5 h casi agotada',
    },
    tiempo: {
      duracionHoras: (h, m) => `${h} h ${m} min`,
      duracionMin: m => `${m} min`,
      haceMin: m => `${m} min`,
      haceHoras: h => `${h} h`,
      haceDias: d => `${d} d`,
    },
    derecha: {
      sesion: dur => `⏱ Sesión ${dur}`,
      cuotaCinco: dur => `↻ Cuota 5 h: se reinicia en ${dur}`,
      turnos: 'turnos',
    },
    git: {
      sinCommit: n => `${n} sin commit`,
    },
    comando: {
      descripcion: nombre => `${nombre}: /roco menu para elegir y personalizar tu mascota (solo /roco la muestra u oculta)`,
      pista: '[menu | morado | gato | tema | ayuda]',
      escondido: nombre => `${nombre} se escondió. /roco lo trae de vuelta.`,
      volvio: nombre => `${nombre} volvió.`,
      ayuda: nombre =>
        [
          'Subcomandos de /roco:',
          `  /roco — muestra u oculta a ${nombre}`,
          '  /roco menu — mascotas, colores, información y tamaño con botones',
          '  /roco:crear [idea] — Claude te guía para crear tu mascota (gestos, colores e información)',
          '  /roco <color, tema o personaje> — p. ej. /roco morado, /roco oceano, /roco gato',
          '  /roco personaje [id] — sin id, lista los personajes',
          '  /roco nombre <texto (máx 16 caracteres)>',
          '  /roco color <nombre o código> — p. ej. /roco color naranja o /roco color #ff8a3d; sin valor vuelve el del tema',
          '  /roco tema <magma|oceano|bosque|lavanda|mono|auto>',
          '  /roco estilo <completo|compacto|minimo>',
          '  /roco campos <lista separada por comas>',
          '  /roco idioma <auto|es|en>',
          '  /roco ayuda — muestra esta ayuda',
        ].join('\n'),
      temaCambiado: tema => `Tema cambiado a "${tema}".`,
      temaInvalido: (tema, validos) => `Tema no válido "${tema}". Valores válidos: ${validos}`,
      estiloCambiado: estilo => `Estilo cambiado a "${estilo}".`,
      estiloInvalido: (estilo, validos) => `Estilo no válido "${estilo}". Valores válidos: ${validos}`,
      camposCambiados: campos => `Campos cambiados a "${campos}".`,
      camposInvalidos: validos => `Campos no válidos. Valores permitidos: ${validos}`,
      personajeCambiado: personaje => `Personaje cambiado a "${personaje}".`,
      personajeInvalido: (personaje, validos) => `Personaje no válido "${personaje}". Valores válidos: ${validos}`,
      personajesLista: lista => `Personajes disponibles: ${lista}. Elige uno con /roco personaje <id>; los tuyos van en ~/.claude/roco/personajes.`,
      creando: 'Para crear tu mascota escribe /roco:crear con tu idea (p. ej. /roco:crear un gato astronauta) o dile a Claude «quiero crear mi mascota».',
      colorCambiado: color => `Color cambiado a ${color}.`,
      colorRestablecido: 'Color restablecido: vuelve el del tema.',
      colorInvalido: 'No reconocí ese color. Escribe un nombre (morado, azul, rojo, verde, rosa, naranja, amarillo, cian, gris o blanco) o un código de color, por ejemplo: /roco color naranja o /roco color #ff8a3d.',
      noGuardado: 'No se pudo guardar la opción en la configuración.',
      bienvenida: nombre => `¡Hola! Soy ${nombre}. Escribe /roco para elegir tu mascota, o /roco:crear para crear una nueva con Claude.`,
      nombreCambiado: nombre => `Nombre cambiado a "${nombre}".`,
      nombreRestablecido: 'Nombre restablecido al predeterminado.',
      nombreLargo: 'El nombre no puede tener más de 16 caracteres.',
      idiomaCambiado: idioma => `Idioma cambiado a "${idioma}".`,
      idiomaInvalido: (idioma, validos) => `Idioma no válido "${idioma}". Valores válidos: ${validos}`,
      menuAbierto: 'Menú abierto: elige mascota, colores e información. Esc lo cierra; /roco menu lo vuelve a abrir.',
      menuNoAbierto: 'No se pudo abrir el menú aquí. Usa /roco ayuda para ver los comandos.',
      noEntendi: 'No entendí. Abre /roco menu o pídeselo a Claude con /roco:crear <lo que quieres>.',
    },
    menu: {
      titulo: nombre => `${nombre} · menú`,
      pista: 'Tab recorre los botones · Enter elige · Esc cierra',
      animo: 'Ánimo',
      mascotas: 'Mascotas',
      actual: 'actual',
      elegir: 'Elegir',
      tema: 'Tema',
      color: 'Color',
      colorTema: 'del tema',
      colores: { morado: 'morado', azul: 'azul', rojo: 'rojo', verde: 'verde', rosa: 'rosa', naranja: 'naranja', amarillo: 'amarillo', cian: 'cian', gris: 'gris', blanco: 'blanco' },
      info: 'Información',
      campos: { estado: 'estado', acciones: 'acciones', uso: 'uso', git: 'git', sesion: 'sesión', reinicio: 'reinicio', contadores: 'contadores' },
      tamano: 'Tamaño',
      estilos: { completo: 'completo', compacto: 'compacto', minimo: 'mínimo' },
      crear: '✨ Crear una nueva con Claude',
      cerrar: 'Cerrar',
      escribeIdea: 'Describe tu idea después de /roco:crear y presiona Enter.',
      escribeComando: 'Escribe /roco:crear <tu idea> para crear una mascota nueva con Claude.',
    },
    personaje: {
      motivo: {
        falta: 'no está en las carpetas de personajes',
        grande: 'el archivo pasa de 64 KB',
        json: 'el archivo no es un JSON válido',
        formato: 'el campo "formato" debe ser 1',
        nombre: '"nombre" debe tener de 1 a 16 letras, números, espacios, _ o -',
        medida: '"ancho" y "alto" deben ser enteros entre 8 y 32',
        paleta: '"paleta" debe tener de 1 a 16 colores',
        color: 'hay un color que no es #rrggbb',
        filas: 'las filas no coinciden con "ancho" y "alto"',
        caracter: 'hay un píxel con un carácter no válido o fuera de la paleta',
        vacio: 'todos los píxeles son transparentes',
        pose: 'hay una pose desconocida (usa reposo, pensando, trabajando, listo o error)',
      },
      fallo: (id, motivo) => `No se pudo cargar el personaje "${id.slice(0, 32)}": ${motivo}. Se usa Roco.`,
      svgGrande: 'el dibujo pasa del límite de 128 KB',
    },
  },
  en: {
    animo: {
      reposo: 'resting',
      pensando: 'thinking',
      trabajando: 'working',
      listo: 'ready',
      error: 'stumbled',
    },
    estado: {
      esperando: 'Waiting for your message',
      leyendo: 'Reading your message',
      pensandoPaso: 'Thinking next step',
      termine: 'Finished, your turn',
      detuve: 'Stopped',
      error: 'An error occurred',
      refusal: 'Could not do that',
      buscandoForma: 'Looking for another way',
      sinPermiso: tool => `No permission for ${tool}`,
      falloTool: tool => `Failed ${tool}`,
    },
    detalle: {
      archivoDefault: 'a file',
      leyendo: archivo => `Reading ${archivo}`,
      escribiendo: archivo => `Writing ${archivo}`,
      ejecutandoComando: 'Running a command',
      buscandoCodigo: 'Searching in code',
      investigandoWeb: 'Researching on the web',
      coordinandoSubagente: 'Coordinating a subagent',
      cargandoSkill: 'Loading a skill',
      usandoTool: tool => `Using ${tool}`,
    },
    acciones: {
      archivoDefault: 'file',
      comandoDefault: 'command',
      buscarDefault: 'search',
      web: 'web',
      subagente: 'subagent',
      skill: 'skill',
      sinAcciones: 'No actions yet',
    },
    uso: {
      conversacion: 'Conversation',
      cincoHoras: '5 h',
      semana: 'Week',
      avisoConversacion: 'new conversation recommended',
      avisoCuota: '5h limit almost reached',
    },
    tiempo: {
      duracionHoras: (h, m) => `${h} h ${m} min`,
      duracionMin: m => `${m} min`,
      haceMin: m => `${m} min`,
      haceHoras: h => `${h} h`,
      haceDias: d => `${d} d`,
    },
    derecha: {
      sesion: dur => `⏱ Session ${dur}`,
      cuotaCinco: dur => `↻ 5h limit: resets in ${dur}`,
      turnos: 'turns',
    },
    git: {
      sinCommit: n => `${n} uncommitted`,
    },
    comando: {
      descripcion: nombre => `${nombre}: /roco menu to pick and customize your pet (just /roco shows or hides it)`,
      pista: '[menu | purple | gato | theme | help]',
      escondido: nombre => `${nombre} hid away. /roco brings it back.`,
      volvio: nombre => `${nombre} is back.`,
      ayuda: nombre =>
        [
          'Subcommands of /roco:',
          `  /roco — show or hide ${nombre}`,
          '  /roco menu — pets, colors, info and size with buttons',
          '  /roco:crear [idea] — Claude guides you to create your mascot (gestures, colors and info)',
          '  /roco <color, theme or character> — e.g. /roco purple, /roco oceano, /roco gato',
          '  /roco character [id] — without an id, lists the characters',
          '  /roco name <text (max 16 chars)>',
          "  /roco color <name or code> — e.g. /roco color orange or /roco color #ff8a3d; empty brings back the theme's",
          '  /roco theme <magma|oceano|bosque|lavanda|mono|auto>',
          '  /roco style <completo|compacto|minimo>',
          '  /roco fields <comma-separated list>',
          '  /roco language <auto|es|en>',
          '  /roco help — show this help',
        ].join('\n'),
      temaCambiado: tema => `Theme changed to "${tema}".`,
      temaInvalido: (tema, validos) => `Invalid theme "${tema}". Valid values: ${validos}`,
      estiloCambiado: estilo => `Style changed to "${estilo}".`,
      estiloInvalido: (estilo, validos) => `Invalid style "${estilo}". Valid values: ${validos}`,
      camposCambiados: campos => `Fields changed to "${campos}".`,
      camposInvalidos: validos => `Invalid fields. Allowed values: ${validos}`,
      personajeCambiado: personaje => `Character changed to "${personaje}".`,
      personajeInvalido: (personaje, validos) => `Invalid character "${personaje}". Valid values: ${validos}`,
      personajesLista: lista => `Available characters: ${lista}. Pick one with /roco character <id>; yours go in ~/.claude/roco/personajes.`,
      creando: 'To create your mascot type /roco:crear with your idea (e.g. /roco:crear a space cat) or tell Claude "I want to create my mascot".',
      colorCambiado: color => `Color changed to ${color}.`,
      colorRestablecido: "Color reset: back to the theme's.",
      colorInvalido: "I didn't recognize that color. Type a name (purple, blue, red, green, pink, orange, yellow, cyan, gray or white) or a color code, for example: /roco color orange or /roco color #ff8a3d.",
      noGuardado: "Couldn't save the option to the settings.",
      bienvenida: nombre => `Hi! I'm ${nombre}. Type /roco to pick your mascot, or /roco:crear to create a new one with Claude.`,
      nombreCambiado: nombre => `Name changed to "${nombre}".`,
      nombreRestablecido: 'Name reset to default.',
      nombreLargo: 'Name cannot exceed 16 characters.',
      idiomaCambiado: idioma => `Language changed to "${idioma}".`,
      idiomaInvalido: (idioma, validos) => `Invalid language "${idioma}". Valid values: ${validos}`,
      menuAbierto: 'Menu open: pick a pet, colors and info. Esc closes it; /roco menu opens it again.',
      menuNoAbierto: "Couldn't open the menu here. Use /roco help to see the commands.",
      noEntendi: "I didn't get that. Open /roco menu or ask Claude with /roco:crear <what you want>.",
    },
    menu: {
      titulo: nombre => `${nombre} · menu`,
      pista: 'Tab moves between buttons · Enter picks · Esc closes',
      animo: 'Mood',
      mascotas: 'Pets',
      actual: 'current',
      elegir: 'Pick',
      tema: 'Theme',
      color: 'Color',
      colorTema: "theme's",
      colores: { morado: 'purple', azul: 'blue', rojo: 'red', verde: 'green', rosa: 'pink', naranja: 'orange', amarillo: 'yellow', cian: 'cyan', gris: 'gray', blanco: 'white' },
      info: 'Info',
      campos: { estado: 'status', acciones: 'actions', uso: 'usage', git: 'git', sesion: 'session', reinicio: 'reset', contadores: 'counters' },
      tamano: 'Size',
      estilos: { completo: 'full', compacto: 'compact', minimo: 'minimal' },
      crear: '✨ Create a new one with Claude',
      cerrar: 'Close',
      escribeIdea: 'Describe your idea after /roco:crear and press Enter.',
      escribeComando: 'Type /roco:crear <your idea> to create a new mascot with Claude.',
    },
    personaje: {
      motivo: {
        falta: 'not found in the character folders',
        grande: 'the file is larger than 64 KB',
        json: 'the file is not valid JSON',
        formato: '"formato" must be 1',
        nombre: '"nombre" must be 1–16 letters, digits, spaces, _ or -',
        medida: '"ancho" and "alto" must be integers from 8 to 32',
        paleta: '"paleta" must have 1 to 16 colors',
        color: 'a color is not #rrggbb',
        filas: 'the rows do not match "ancho" and "alto"',
        caracter: 'a pixel has an invalid character or is outside the palette',
        vacio: 'every pixel is transparent',
        pose: 'unknown pose (use reposo, pensando, trabajando, listo or error)',
      },
      fallo: (id, motivo) => `Could not load character "${id.slice(0, 32)}": ${motivo}. Using Roco.`,
      svgGrande: 'the drawing is over the 128 KB limit',
    },
  },
}

// 'auto' sigue el idioma del sistema: español si empieza por "es"; si no, inglés.
export function idiomaDelSistema(): Idioma {
  try {
    return /^es\b/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'es' : 'en'
  } catch {
    return 'es'
  }
}

export function obtenerTextos(idioma?: string): Textos {
  if (idioma === 'es' || idioma === 'en') return TEXTOS[idioma]
  return idioma === 'auto' ? TEXTOS[idiomaDelSistema()] : TEXTOS.es
}
