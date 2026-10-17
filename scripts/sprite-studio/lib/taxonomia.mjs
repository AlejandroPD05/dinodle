// Clasificación de dinosaurios en arquetipos de dibujo y variantes de familia.
// Portado de scripts/generar-sprites.mjs (mismos mapas) para reutilizar la
// clasificación ya validada sobre el catálogo.

export const ARQUETIPO_POR_GRUPO = {
  'saurópodos': 'sauropodo',
  'terópodos grandes': 'teropodo-grande',
  'terópodos pequeños': 'teropodo-pequeno',
  'ornitópodos': 'ornitopodo',
  'dinosaurios acorazados': 'acorazado',
  'ceratopsios': 'ceratopsio',
}

export const VARIANTE_POR_FAMILIA = {
  Tyrannosauridae: 'tirano',
  Abelisauridae: 'abelisaurio',
  Carcharodontosauridae: 'carnosaurio',
  Megalosauridae: 'carnosaurio',
  Allosauridae: 'carnosaurio',
  Neovenatoridae: 'carnosaurio',
  Metriacanthosauridae: 'carnosaurio',
  Piatnitzkysauridae: 'carnosaurio',
  Proceratosauridae: 'crestado',
  Spinosauridae: 'espinosaurio',
  Therizinosauridae: 'tericinosaurio',
  Noasauridae: 'noasaurio',
  Dromaeosauridae: 'dromeosaurio',
  Archaeopterygidae: 'dromeosaurio',
  Troodontidae: 'troodonte',
  Oviraptoridae: 'oviraptor',
  Caenagnathidae: 'oviraptor',
  Caudipterygidae: 'oviraptor',
  Ornithomimidae: 'ornitomimo',
  Compsognathidae: 'compsognato',
  Alvarezsauridae: 'alvarezsaurio',
  Hadrosauridae: 'hadrosaurio',
  Iguanodontidae: 'iguanodonte',
  Rhabdodontidae: 'pequeno',
  Hypsilophodontidae: 'pequeno',
  Dryosauridae: 'pequeno',
  Thescelosauridae: 'pequeno',
  Heterodontosauridae: 'pequeno',
  Pachycephalosauridae: 'paquicefalo',
  Ankylosauridae: 'anquilosaurio',
  Nodosauridae: 'nodosaurio',
  Stegosauridae: 'estegosaurio',
  Ceratopsidae: 'ceratopsido',
  Protoceratopsidae: 'protoceratópsido',
  Leptoceratopsidae: 'protoceratópsido',
  Chaoyangsauridae: 'protoceratópsido',
  Psittacosauridae: 'psitacosaurio',
  Brachiosauridae: 'braquiosaurio',
  Diplodocidae: 'diplocido',
  Dicraeosauridae: 'dicraeosaurio',
  Mamenchisauridae: 'mamenquisaurio',
  Saltasauridae: 'titanosaurio',
  Titanosauridae: 'titanosaurio',
  Nemegtosauridae: 'titanosaurio',
  Rebbachisauridae: 'diplocido',
  Massospondylidae: 'prosauropodo',
  Plateosauridae: 'prosauropodo',
  Riojasauridae: 'prosauropodo',
  Anchisauridae: 'prosauropodo',
  Guaibasauridae: 'prosauropodo',
}

export const ARQUETIPO_POR_SLUG = {
  'tyrannosaurus-rex': 'teropodo-grande',
  triceratops: 'ceratopsio',
  velociraptor: 'teropodo-pequeno',
  stegosaurus: 'acorazado',
  brachiosaurus: 'sauropodo',
  ankylosaurus: 'acorazado',
  allosaurus: 'teropodo-grande',
  diplodocus: 'sauropodo',
  parasaurolophus: 'ornitopodo',
  spinosaurus: 'teropodo-grande',
  iguanodon: 'ornitopodo',
  carnotaurus: 'teropodo-grande',
}

export const VARIANTE_POR_SLUG = {
  'tyrannosaurus-rex': 'tirano',
  triceratops: 'ceratopsido',
  velociraptor: 'dromeosaurio',
  stegosaurus: 'estegosaurio',
  brachiosaurus: 'braquiosaurio',
  ankylosaurus: 'anquilosaurio',
  allosaurus: 'carnosaurio',
  diplodocus: 'diplocido',
  parasaurolophus: 'hadrosaurio',
  spinosaurus: 'espinosaurio',
  iguanodon: 'iguanodonte',
  carnotaurus: 'carnotauro',
  huayangosaurus: 'estegosaurio',
  tuojiangosaurus: 'estegosaurio',
  chungkingosaurus: 'estegosaurio',
  dacentrurus: 'estegosaurio',
  scelidosaurus: 'basal',
  scutellosaurus: 'basal',
  emausaurus: 'basal',
  amargasaurus: 'amargasaurio',
  ouranosaurus: 'vela',
  dilophosaurus: 'crestado',
  cryolophosaurus: 'crestado',
  monolophosaurus: 'crestado',
  guanlong: 'crestado',
  deinocheirus: 'deinocheirus',
  muttaburrasaurus: 'hadrosaurio',
  nigersaurus: 'diplocido',
  masiakasaurus: 'noasaurio',
}

export const CRESTA_POR_SLUG = {
  parasaurolophus: 'tubo',
  corythosaurus: 'casco',
  hypacrosaurus: 'casco',
  lambeosaurus: 'hacha',
  tsintaosaurus: 'cuerno',
  saurolophus: 'pincho',
  prosaurolophus: 'pincho',
}

export const VARIANTE_BASE = {
  sauropodo: 'base',
  'teropodo-grande': 'base',
  'teropodo-pequeno': 'base',
  ornitopodo: 'base',
  acorazado: 'base',
  ceratopsio: 'base',
}

// Clasifica un dinosaurio (fila de Supabase) en { arquetipo, variante }.
export function clasificar(dino) {
  const texto = dino.description ?? ''
  const grupo = /grupo de los ([^(.]+)/.exec(texto)
  const familia = /familia ([^)]+)/.exec(texto)
  const porSlug = VARIANTE_POR_SLUG[dino.slug]
  const arquetipo =
    ARQUETIPO_POR_SLUG[dino.slug] ?? ARQUETIPO_POR_GRUPO[grupo?.[1].trim()] ?? 'ornitopodo'
  const variante = porSlug ?? VARIANTE_POR_FAMILIA[familia?.[1].trim()] ?? VARIANTE_BASE[arquetipo]
  return { arquetipo, variante }
}

// Arquetipos soportados (uno por módulo en lib/cuerpos/).
export const ARQUETIPOS = [
  'sauropodo',
  'teropodo-grande',
  'teropodo-pequeno',
  'ornitopodo',
  'acorazado',
  'ceratopsio',
]

// Rasgos de dibujo por variante (ver references/04-cuerpos-y-variantes.md).
export const RASGOS_POR_VARIANTE = {
  // terópodos
  tirano: { cabezaGrande: 1, brazos: 'cortos', dientes: 'aserrados', cejas: 1 },
  abelisaurio: { cabezaCorta: 1, cuernos: 'bultos', brazos: 'cortos' },
  carnosaurio: { crestaOcular: 1, brazos: 'normales' },
  crestado: { cresta: 'doble' },
  espinosaurio: { vela: 0.85, hocicoLargo: 1, brazos: 'largos', dientes: 'normal' },
  carnotauro: { cuernos: 'cejas', brazos: 'cortos' },
  tericinosaurio: { plumas: 0.9, garrasGrandes: 0.9, pico: 'rapaz', cuelloLargo: 0.4, panzaGrande: 1 },
  deinocheirus: { joroba: 0.8, pico: 'pato', brazos: 'largos', plumas: 0.7 },
  dromeosaurio: { garraHoz: 0.6, filoplumasCola: 1, plumas: 0.5 },
  troodonte: { ojosGrandes: 1, plumas: 0.5, filoplumasCola: 1 },
  oviraptor: { cresta: 'casco', pico: 'loro', plumas: 0.4 },
  ornitomimo: { cuelloLargo: 0.5, pico: 'rapaz', dientes: 'ninguno', filoplumasCola: 1, plumas: 0.3 },
  compsognato: { menudo: 1, plumas: 0.4 },
  alvarezsaurio: { garraUnica: 1, plumas: 0.5 },
  noasaurio: { dientes: 'colmillos' },
  // ornitópodos
  hadrosaurio: { pico: 'pato' },
  iguanodonte: { pico: 'pato', pulgar: 1 },
  pequeno: {},
  paquicefalo: { cupula: 1 },
  vela: { vela: 0.9, pico: 'pato' },
  // acorazados
  anquilosaurio: { blindaje: 0.9, cola: 'maza' },
  nodosaurio: { blindaje: 0.9 },
  estegosaurio: { placas: 1, cola: 'pua' },
  basal: { placas: 0.3 },
  // ceratopsios
  ceratopsido: { gola: 1, cuernos: 'tres' },
  'protoceratópsido': { gola: 0.6, cuernos: 'bultos' },
  psitacosaurio: { pico: 'loro', gola: 0, cuernos: 'ninguno', semibipedo: 1 },
  // saurópodos
  braquiosaurio: { cuelloLargo: 0.9, hombrosAltos: 1 },
  diplocido: { cuelloLargo: 0.8, cola: 'latigo', cabezaPequena: 1 },
  dicraeosaurio: { espinasCuello: 0.7, cuelloLargo: 0.3 },
  amargasaurio: { espinasCuello: 1, cuelloLargo: 0.2 },
  mamenquisaurio: { cuelloLargo: 1 },
  titanosaurio: { cuelloLargo: 0.6, blindaje: 0.3 },
  prosauropodo: { semibipedo: 1, cuelloLargo: 0.2 },
}

// Índice sin tildes del mapa anterior: tolera desajustes de clave entre el
// clasificador y los rasgos (p. ej. 'protoceratópsido').
const RASGOS_SIN_TILDES = Object.fromEntries(
  Object.entries(RASGOS_POR_VARIANTE).map(([clave, valor]) => [
    clave.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    valor,
  ])
)

// Rasgos finales de un dinosaurio (siempre deterministas; sin azar).
export function rasgosDe(dino) {
  const { arquetipo, variante } = clasificar(dino)
  const sinTilde = variante.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const rasgos = { ...(RASGOS_POR_VARIANTE[variante] ?? RASGOS_SIN_TILDES[sinTilde] ?? {}) }
  const cresta = CRESTA_POR_SLUG[dino.slug]
  if (cresta) rasgos.cresta = cresta
  return { arquetipo, variante, rasgos }
}
