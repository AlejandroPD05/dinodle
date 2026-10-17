import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import zlib from 'node:zlib'

const CELDA = 56
const COLUMNAS = 16
const RUTA_HOJA = new URL('../public/dinos/dinos.png', import.meta.url)
const RUTA_MAPA = new URL('../src/data/sprites.ts', import.meta.url)
const RUTA_VISTA = new URL('../public/_sprites-preview.html', import.meta.url)
const CON_VISTA = process.argv.includes('--vista')

const BORDE = '#0d0c0a'
const OJO = '#efe9d4'
const PUPILA = '#0d0c0a'
const DIENTE = '#e6dfc6'
const GARRA = '#d8cfae'
const PICO = '#c9a45f'

function crc32(buf) {
  let c
  const tabla = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ tabla[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

function escribirPngRGBA(ruta, ancho, alto, px) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const filas = []
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 4)
    Buffer.from(px.buffer, px.byteOffset + y * ancho * 4, ancho * 4).copy(fila, 1)
    filas.push(fila)
  }
  const idat = zlib.deflateSync(Buffer.concat(filas), { level: 9 })
  writeFileSync(ruta, Buffer.concat([firma, trozo('IHDR', ihdr), trozo('IDAT', idat), trozo('IEND', Buffer.alloc(0))]))
}

function crearAleatorio(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function semillaDe(texto) {
  return parseInt(createHash('md5').update(texto).digest('hex').slice(0, 8), 16)
}

async function cargarDinosaurios() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const url = /VITE_SUPABASE_URL=(.+)/.exec(env)[1].trim().replace(/^"|"$/g, '')
  const clave = /VITE_SUPABASE_ANON_KEY=(.+)/.exec(env)[1].trim().replace(/^"|"$/g, '')
  const consulta = `${url}/rest/v1/dinosaurs?select=name,slug,diet,length_m,description&order=name`
  const respuesta = await fetch(consulta, { headers: { apikey: clave, Authorization: `Bearer ${clave}` } })
  if (!respuesta.ok) throw new Error(`Supabase respondió con ${respuesta.status}`)
  return respuesta.json()
}

const ARQUETIPO_POR_GRUPO = {
  'saurópodos': 'sauropodo',
  'terópodos grandes': 'teropodo-grande',
  'terópodos pequeños': 'teropodo-pequeno',
  'ornitópodos': 'ornitopodo',
  'dinosaurios acorazados': 'acorazado',
  'ceratopsios': 'ceratopsio',
}

const VARIANTE_POR_FAMILIA = {
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

const ARQUETIPO_POR_SLUG = {
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

const VARIANTE_POR_SLUG = {
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

const CRESTA_POR_SLUG = {
  parasaurolophus: 'tubo',
  corythosaurus: 'casco',
  hypacrosaurus: 'casco',
  lambeosaurus: 'hacha',
  tsintaosaurus: 'cuerno',
  saurolophus: 'pincho',
  prosaurolophus: 'pincho',
}

const VARIANTE_BASE = {
  sauropodo: 'base',
  'teropodo-grande': 'base',
  'teropodo-pequeno': 'base',
  ornitopodo: 'base',
  acorazado: 'base',
  ceratopsio: 'base',
}

function clasificar(dino) {
  const texto = dino.description ?? ''
  const grupo = /grupo de los ([^(.]+)/.exec(texto)
  const familia = /familia ([^)]+)/.exec(texto)
  const porSlug = VARIANTE_POR_SLUG[dino.slug]
  const arquetipo = ARQUETIPO_POR_SLUG[dino.slug] ?? ARQUETIPO_POR_GRUPO[grupo?.[1].trim()] ?? 'ornitopodo'
  const variante = porSlug ?? VARIANTE_POR_FAMILIA[familia?.[1].trim()] ?? VARIANTE_BASE[arquetipo]
  return { arquetipo, variante }
}

const RAMPAS = [
  ['#1c2a17', '#33502f', '#4f7a46', '#7fa66a'],
  ['#2a2c16', '#4a4d24', '#6f7336', '#9c9e57'],
  ['#232b18', '#3d4a28', '#5d6e3c', '#87985f'],
  ['#2b1f12', '#4f3a20', '#77603a', '#a68c5c'],
  ['#2f2410', '#56431c', '#7f6a2e', '#b09a54'],
  ['#33291a', '#5c4c31', '#8a7752', '#bda77c'],
  ['#2e1a10', '#5c321c', '#8a5430', '#b87f52'],
  ['#2c1511', '#57291f', '#834536', '#b06e56'],
  ['#122722', '#22453c', '#3a6e5e', '#5f9a86'],
  ['#161c26', '#2b3746', '#48596e', '#72879e'],
  ['#1e1e1a', '#3a3a32', '#5c5a4c', '#8a866f'],
  ['#221626', '#3d2a45', '#5f4469', '#8a6a92'],
  ['#2e1b19', '#573330', '#855048', '#b07a6c'],
  ['#2e2008', '#5c4214', '#8a6a24', '#bd9c4a'],
  ['#142a1c', '#254a30', '#3d7048', '#63a071'],
  ['#302a1c', '#544a30', '#7d7050', '#a89a76'],
]

const RAMPAS_HERBIVORO = [0, 1, 2, 3, 5, 6, 10, 11, 14, 15]
const RAMPAS_CARNIVORO = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14]
const RAMPAS_OMNIVORO = [2, 3, 5, 9, 11, 14, 15]

function elegirRampa(dino, ale) {
  const lista = dino.diet === 'Herbívoro' ? RAMPAS_HERBIVORO : dino.diet === 'Carnívoro' ? RAMPAS_CARNIVORO : RAMPAS_OMNIVORO
  return RAMPAS[lista[Math.floor(ale() * lista.length)]]
}

function elegirPatron(ale) {
  const tirada = ale()
  if (tirada < 0.45) return 'lisa'
  if (tirada < 0.65) return 'franjas'
  if (tirada < 0.85) return 'manchas'
  return 'banda'
}

function escalaPorLongitud(largo) {
  if (!largo || largo <= 0) return 1
  const t = Math.min(1, Math.max(0, Math.log10(largo) / Math.log10(35)))
  return 0.88 + 0.17 * t
}

function punto(m, x, y, valor = 1) {
  const ix = Math.round(x)
  const iy = Math.round(y)
  if (ix >= 0 && ix < CELDA && iy >= 0 && iy < CELDA) m[iy * CELDA + ix] = valor
}

function disco(m, cx, cy, r, valor = 1) {
  const r2 = r * r
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= r2) punto(m, x, y, valor)
    }
  }
}

function elipse(m, cx, cy, rx, ry, valor = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy <= 1) punto(m, x, y, valor)
    }
  }
}

function segmento(m, x0, y0, x1, y1, r0, r1, valor = 1) {
  const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3))
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    disco(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, valor)
  }
}

function poligono(m, pts, valor = 1) {
  let minY = Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minY = Math.min(minY, p[1])
    maxY = Math.max(maxY, p[1])
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const cruces = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) cruces.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]))
    }
    cruces.sort((a, b) => a - b)
    for (let i = 0; i + 1 < cruces.length; i += 2) {
      for (let x = Math.round(cruces[i]); x <= Math.round(cruces[i + 1]); x++) punto(m, x, y, valor)
    }
  }
}

function tri(m, x0, y0, x1, y1, x2, y2, valor = 1) {
  poligono(m, [[x0, y0], [x1, y1], [x2, y2]], valor)
}

function trazo(m, pts, valor = 2) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const pasos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4))
    for (let p = 0; p <= pasos; p++) {
      const t = p / pasos
      punto(m, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, valor)
    }
  }
}

function ojoGrande(m, x, y) {
  punto(m, x, y, 3)
  punto(m, x + 1, y, 3)
  punto(m, x, y + 1, 3)
  punto(m, x + 1, y + 1, 4)
}

function ojoPequeno(m, x, y) {
  punto(m, x, y, 3)
  punto(m, x + 1, y, 4)
}

function escalar(mascara, k) {
  if (k === 1) return mascara
  const salida = new Uint8Array(CELDA * CELDA)
  for (let y = 0; y < CELDA; y++) {
    for (let x = 0; x < CELDA; x++) {
      const origenX = Math.round((x - 28) / k + 28)
      const origenY = Math.round((y - 50) / k + 50)
      if (origenX >= 0 && origenX < CELDA && origenY >= 0 && origenY < CELDA) {
        const valor = mascara[origenY * CELDA + origenX]
        if (valor) salida[y * CELDA + x] = valor
      }
    }
  }
  return salida
}

function colorDe(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function renderizar(cuerpo, rampa, patron, semilla, k) {
  const px = new Uint8Array(CELDA * CELDA * 4)
  const arriba = new Int16Array(CELDA).fill(-1)
  const abajo = new Int16Array(CELDA)
  for (let x = 0; x < CELDA; x++) {
    for (let y = 0; y < CELDA; y++) {
      if (cuerpo[y * CELDA + x]) {
        if (arriba[x] === -1) arriba[x] = y
        abajo[x] = y
      }
    }
  }
  const tonos = rampa.map(colorDe)
  const fijos = [null, null, colorDe(BORDE), colorDe(OJO), colorDe(PUPILA), colorDe(DIENTE), colorDe(GARRA), colorDe(PICO)]
  for (let y = 0; y < CELDA; y++) {
    for (let x = 0; x < CELDA; x++) {
      const i = y * CELDA + x
      const valor = cuerpo[i]
      const destino = i * 4
      if (!valor) {
        const dx = (x + 0.5 - 28) / (14 * k)
        const dy = (y + 0.5 - 51.5) / 2.4
        if (dx * dx + dy * dy <= 1) {
          px[destino] = 11
          px[destino + 1] = 10
          px[destino + 2] = 7
          px[destino + 3] = 90
        }
        continue
      }
      let rgb = fijos[valor]
      if (valor === 8) {
        const t = (y - arriba[x]) / (abajo[x] - arriba[x] + 1)
        let tono = 2
        if (t < 0.35) tono = 3
        else if (t > 0.75) tono = 1
        rgb = tonos[tono]
      } else if (!rgb) {
        const t = (y - arriba[x]) / (abajo[x] - arriba[x] + 1)
        let tono = 1
        if (t < 0.22) tono = 3
        else if (t < 0.52) tono = 2
        else if (t > 0.82) tono = 0
        if (patron === 'franjas' && (x + semilla) % 6 < 2) tono = Math.max(1, tono - 1)
        if (patron === 'banda' && t < 0.16) tono = Math.max(1, tono - 1)
        if (patron === 'manchas' && t > 0.25 && t < 0.75 && (x * 31 + y * 17 + semilla) % 27 < 3) tono = Math.max(1, tono - 1)
        rgb = tonos[tono]
      }
      px[destino] = rgb[0]
      px[destino + 1] = rgb[1]
      px[destino + 2] = rgb[2]
      px[destino + 3] = 255
    }
  }
  for (let y = 0; y < CELDA; y++) {
    for (let x = 0; x < CELDA; x++) {
      const i = y * CELDA + x
      const enCuerpo = cuerpo[i]
      if (enCuerpo !== 1 && enCuerpo !== 8) continue
      let toca = false
      for (let dy = -1; dy <= 1 && !toca; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= CELDA || ny < 0 || ny >= CELDA || !cuerpo[ny * CELDA + nx]) {
            toca = true
            break
          }
        }
      }
      if (toca) {
        const destino = i * 4
        const borde = colorDe(BORDE)
        px[destino] = borde[0]
        px[destino + 1] = borde[1]
        px[destino + 2] = borde[2]
      }
    }
  }
  return px
}

const PINTORES = {}

Object.assign(PINTORES, {
  'teropodo-grande': (m, variante) => {
    segmento(m, 12, 28.5, 1.5, 23.5, 4.6, 1)
    elipse(m, 23.5, 30.5, 12.2, 9)
    elipse(m, 32.5, 28.5, 7.8, 7.6)
    segmento(m, 30, 23, 38.5, 19, 4.6, 3.4)
    elipse(m, 44, 16, 6.8, 4.4)
    elipse(m, 45.5, 20, 6, 3)
    segmento(m, 47, 18.8, 53, 19.2, 2.2, 1.4)
    if (variante === 'tirano') {
      elipse(m, 44.5, 16, 7.8, 5.2)
      elipse(m, 46, 20.5, 6.6, 3.4)
    }
    if (variante === 'abelisaurio') {
      elipse(m, 43.5, 16.5, 5.8, 4)
      elipse(m, 45, 20.2, 5.4, 2.8)
      disco(m, 41.5, 12.6, 1.7)
      disco(m, 45, 12, 1.5)
    }
    if (variante === 'carnosaurio') {
      elipse(m, 44.5, 15.5, 7.2, 3.8)
      elipse(m, 46, 19.5, 6.4, 2.8)
      segmento(m, 47, 18.6, 54, 19, 2, 1.2)
    }
    if (variante === 'espinosaurio') {
      elipse(m, 23.5, 30.5, 11, 8.4)
      poligono(m, [[16.5, 26], [22, 10.5], [29.5, 8], [36.5, 14], [39.5, 25]], 8)
      elipse(m, 44, 17.5, 6.6, 3.4)
      elipse(m, 45.5, 20.2, 5.6, 2.6)
      segmento(m, 47, 18.8, 54.5, 19.2, 1.8, 1)
    }
    if (variante === 'tericinosaurio') {
      elipse(m, 23.5, 31.5, 13.6, 10.6)
      elipse(m, 43, 20.5, 4.6, 3.6)
      elipse(m, 44, 23, 4.2, 2.4)
      segmento(m, 30, 24, 39, 21, 4, 2.6)
    }
    if (variante === 'carnotauro') {
      elipse(m, 43.5, 16.5, 5.6, 3.8)
      elipse(m, 44.5, 20, 5.2, 2.6)
      tri(m, 40.5, 14.5, 41.7, 10.2, 42.9, 14.5)
      tri(m, 44.2, 13.8, 45.6, 9.8, 47, 13.8)
    }
    if (variante === 'crestado') {
      disco(m, 42.5, 12.6, 2.1)
      disco(m, 46.2, 12, 1.7)
    }
    segmento(m, 20.5, 33.5, 21.5, 46.5, 3.4, 2)
    segmento(m, 25.5, 35.5, 27.5, 47.5, 4.2, 2.4)
    disco(m, 28.5, 48, 2.5)
    disco(m, 22.5, 47.5, 2)
    segmento(m, 36.5, 27.5, 41, 30, 1.5, 1)
    trazo(m, [[42.5, 18.8], [52.5, 19.4]])
    ojoGrande(m, 45, 13.5)
    punto(m, 48.5, 21, 5)
    punto(m, 50.5, 21.2, 5)
    punto(m, 46.5, 21.4, 5)
    if (variante === 'tericinosaurio') {
      segmento(m, 36.5, 29, 43.5, 33, 1.6, 1.2)
      punto(m, 44, 34, 6)
      punto(m, 45, 33.5, 6)
    } else if (variante === 'carnosaurio' || variante === 'crestado') {
      segmento(m, 36.5, 27.5, 43, 31, 1.4, 1)
      punto(m, 43.5, 31.5, 6)
    }
    if (variante === 'espinosaurio') {
      punto(m, 52.5, 20.4, 5)
      punto(m, 50, 20.6, 5)
    }
  },

  'teropodo-pequeno': (m, variante) => {
    segmento(m, 15, 32, 2.5, 26.5, 3, 0.8)
    elipse(m, 24, 32.5, 8.6, 6)
    elipse(m, 30.5, 30.5, 5.2, 5.2)
    segmento(m, 29, 27.5, 36, 23, 3.2, 2.4)
    elipse(m, 39.5, 21, 5.2, 4.2)
    segmento(m, 41.5, 22.5, 46, 23, 1.8, 1)
    if (variante === 'ornitomimo') {
      segmento(m, 29, 28, 35, 19.5, 3.2, 2.4)
      elipse(m, 38.5, 18, 4.6, 3.6)
      segmento(m, 40, 19.5, 44.5, 20, 1.6, 0.9)
    }
    if (variante === 'oviraptor') {
      disco(m, 38, 17, 3.2)
      elipse(m, 39.5, 21.5, 5.4, 3.6)
      poligono(m, [[41.5, 22.3], [46.5, 21.8], [46.5, 23.8], [41.5, 24.6]], 7)
    }
    if (variante === 'dromeosaurio') {
      poligono(m, [[33, 26.5], [21, 23], [24, 30]])
      poligono(m, [[33, 28.5], [19, 27], [23, 32.5]])
      poligono(m, [[15, 31], [3.5, 22.5], [8, 27]])
      poligono(m, [[15, 31.8], [3.5, 27], [9.5, 29.5]])
      poligono(m, [[15, 32.5], [4.5, 31.5], [10.5, 33.5]])
    }
    if (variante === 'alvarezsaurio') {
      segmento(m, 33.5, 30.5, 36, 31.5, 1.4, 1)
      punto(m, 36.5, 32, 6)
      punto(m, 36.5, 30.5, 6)
    }
    segmento(m, 25.5, 36, 27, 47.5, 2.6, 1.4)
    segmento(m, 20.5, 36.5, 21.5, 47.5, 2.4, 1.3)
    disco(m, 28, 48, 2)
    disco(m, 22.5, 48, 1.8)
    segmento(m, 33.5, 30, 37.5, 31.5, 1.3, 1)
    trazo(m, [[38.5, 23.5], [45, 24]])
    ojoPequeno(m, 41, 20)
    punto(m, 43, 24, 5)
    if (variante === 'dromeosaurio') punto(m, 29.5, 48.5, 6)
    if (variante === 'troodonte') ojoPequeno(m, 42, 20.5)
  },
})

Object.assign(PINTORES, {
  sauropodo: (m, variante) => {
    segmento(m, 10, 33, 2, 30, 4.6, 1)
    elipse(m, 23.5, 33, 13.4, 9.6)
    elipse(m, 33, 31.5, 6.8, 8)
    if (variante === 'braquiosaurio') {
      elipse(m, 23.5, 33.5, 12.6, 9)
      segmento(m, 36, 27, 43, 16, 3.4, 2.6)
      segmento(m, 43, 16, 47, 9.5, 2.6, 2.2)
      elipse(m, 48, 8.5, 3.4, 2.6)
      segmento(m, 49, 9, 53, 9, 1.5, 0.9)
      ojoPequeno(m, 48, 7.6)
    } else if (variante === 'diplocido') {
      segmento(m, 35, 29.5, 44, 26.5, 3.2, 2.6)
      segmento(m, 44, 26.5, 49.5, 25.5, 2.6, 2.2)
      elipse(m, 51, 25.5, 3.4, 2.4)
      segmento(m, 52, 26, 55, 26, 1.4, 0.8)
      segmento(m, 10, 33, 1, 28, 4.2, 0.7)
      ojoPequeno(m, 51.5, 24.6)
    } else if (variante === 'titanosaurio') {
      for (let x = 13; x <= 35; x += 5) disco(m, x, 25.5 - Math.sin(((x - 13) / 22) * Math.PI) * 1.5, 1.6)
      segmento(m, 36, 28, 42, 21, 3.4, 2.6)
      elipse(m, 44, 20, 3.4, 2.6)
      segmento(m, 44.8, 20.5, 48.5, 20.5, 1.5, 0.9)
      ojoPequeno(m, 44.5, 19.2)
    } else if (variante === 'dicraeosaurio' || variante === 'amargasaurio') {
      segmento(m, 35, 29, 42, 23, 3, 2.2)
      elipse(m, 43.8, 21.8, 3.4, 2.6)
      segmento(m, 44.8, 22.2, 48.5, 22.2, 1.6, 0.9)
      const altura = variante === 'amargasaurio' ? 7.5 : 5
      for (let i = 0; i < 4; i++) {
        const x = 37 + i * 1.9
        const y = 28 - i * 1.5
        tri(m, x - 1, y, x + 0.2, y - altura, x + 1.4, y)
      }
      ojoPequeno(m, 44, 21)
    } else if (variante === 'mamenquisaurio') {
      segmento(m, 35, 29, 44, 25, 3, 2.4)
      segmento(m, 44, 25, 51, 23.5, 2.4, 2)
      elipse(m, 52.5, 23.5, 3, 2.2)
      segmento(m, 53.3, 24, 56, 24, 1.4, 0.8)
      ojoPequeno(m, 52.5, 22.6)
    } else if (variante === 'prosauropodo') {
      elipse(m, 24, 33.5, 10.6, 7.6)
      segmento(m, 34, 29.5, 39.5, 24, 2.9, 2.4)
      elipse(m, 42, 23, 3.4, 2.7)
      segmento(m, 43, 23.5, 47, 23.5, 1.5, 0.9)
      segmento(m, 13, 32, 2, 24, 3.4, 0.8)
      ojoPequeno(m, 42.5, 22.2)
    } else {
      segmento(m, 35, 28, 41, 20, 3.6, 2.8)
      segmento(m, 41, 20, 45.5, 14.5, 2.8, 2.4)
      elipse(m, 47, 13.5, 3.6, 2.8)
      segmento(m, 48, 14, 52, 14, 1.6, 0.9)
      ojoPequeno(m, 47, 12.6)
    }
    segmento(m, 13, 38, 13.5, 46.5, 3.2, 2.2)
    segmento(m, 31.5, 38, 32, 46.5, 3.2, 2.2)
    segmento(m, 17.5, 38, 18, 47.5, 3.8, 2.4)
    segmento(m, 35.5, 38, 36, 47.5, 3.6, 2.4)
    disco(m, 19, 48, 2.2)
    disco(m, 37, 48, 2.1)
    disco(m, 14, 47, 1.9)
    disco(m, 32.5, 47, 1.9)
  },

  ornitopodo: (m, variante, dino) => {
    segmento(m, 12, 32, 2.5, 30, 4, 1.1)
    elipse(m, 24, 32.5, 10.5, 7.6)
    elipse(m, 32.5, 30.5, 5.8, 6)
    segmento(m, 32, 26, 37.5, 22.5, 3.2, 2.4)
    elipse(m, 42.5, 21, 5.2, 4)
    segmento(m, 44.5, 22.5, 48.5, 22, 1.8, 1)
    if (variante === 'hadrosaurio') {
      elipse(m, 43, 21.4, 5.6, 3.8)
      segmento(m, 46, 22, 50, 22, 1.7, 1.2)
      const cresta = CRESTA_POR_SLUG[dino.slug]
      if (cresta === 'tubo') segmento(m, 39, 18.5, 32, 13, 1.7, 1)
      if (cresta === 'casco') poligono(m, [[40, 17.5], [44, 13], [48.5, 17.5]])
      if (cresta === 'hacha') poligono(m, [[40, 18], [41.5, 12], [45, 12.5], [46, 17.5]])
      if (cresta === 'cuerno') tri(m, 43, 18.4, 41.5, 12, 44.5, 17.5)
      if (cresta === 'pincho') tri(m, 39.5, 18, 37.5, 13, 41.5, 17.5)
    }
    if (variante === 'iguanodonte') elipse(m, 24, 32.5, 11.2, 8.2)
    if (variante === 'pequeno') {
      elipse(m, 24, 33, 9.4, 6.8)
      segmento(m, 12, 32, 3, 29.5, 3.4, 0.9)
    }
    if (variante === 'paquicefalo') {
      disco(m, 42.5, 16.5, 4.4)
      elipse(m, 43, 20.5, 4.6, 3.6)
      tri(m, 38, 14.5, 37, 12.5, 39, 13.5)
    }
    if (variante === 'vela') poligono(m, [[14, 27], [18, 15], [27, 12], [33, 17], [35, 26]])
    segmento(m, 25.5, 36.5, 27, 47.5, 2.8, 1.6)
    segmento(m, 20.5, 37, 21.5, 47.5, 2.6, 1.5)
    disco(m, 28, 48, 2)
    disco(m, 22, 48, 1.8)
    segmento(m, 35.5, 29.5, 39.5, 31.5, 1.4, 1)
    trazo(m, variante === 'hadrosaurio' ? [[44, 24], [49.5, 24]] : [[44.5, 23.5], [48, 23.5]])
    if (variante === 'paquicefalo') ojoPequeno(m, 43.5, 19.5)
    else ojoPequeno(m, 43, 20)
    if (variante === 'iguanodonte') punto(m, 39.5, 32, 6)
    if (variante === 'pequeno') punto(m, 40, 23, 7)
  },
})

Object.assign(PINTORES, {
  acorazado: (m, variante) => {
    if (variante === 'estegosaurio') {
      segmento(m, 11, 32.5, 2, 30, 3.6, 1.4)
      elipse(m, 23, 33, 12.2, 7.8)
      segmento(m, 34, 32.5, 41, 34.5, 3.2, 2.2)
      elipse(m, 44.5, 35, 4, 2.8)
      segmento(m, 45.5, 35.5, 49, 35.5, 1.6, 0.9)
      const alturas = [4, 6, 8, 6.5, 4.5]
      for (let i = 0; i < alturas.length; i++) {
        const x = 15 + i * 3.6
        const y = 27 + Math.sin((i / (alturas.length - 1)) * Math.PI) * 1.2
        tri(m, x - 2.2, y + 1, x, y - alturas[i], x + 2.2, y + 1, 8)
      }
      tri(m, 7.5, 30, 5.5, 23.5, 9, 28.5)
      tri(m, 10.5, 30.5, 9.5, 24.5, 12, 29)
      segmento(m, 13.5, 38, 14, 46.5, 2.8, 2)
      segmento(m, 31.5, 38, 32, 46.5, 2.8, 2)
      segmento(m, 17, 38, 17.5, 47.5, 3.4, 2.2)
      segmento(m, 35, 38, 35.5, 47.5, 3.2, 2.2)
      disco(m, 18.5, 48, 2)
      disco(m, 36.5, 48, 2)
      disco(m, 13.5, 47, 1.8)
      disco(m, 32, 47, 1.8)
      ojoPequeno(m, 45.5, 34.2)
      return
    }
    if (variante === 'basal') {
      segmento(m, 13, 35, 3.5, 33, 3.4, 1.4)
      elipse(m, 24, 35, 11.5, 6.8)
      elipse(m, 36.5, 34.5, 5.4, 4.4)
      segmento(m, 39, 34.5, 44, 34.5, 3, 1.6)
      for (let x = 15; x <= 33; x += 4.5) disco(m, x, 29 - Math.sin(((x - 15) / 18) * Math.PI) * 0.8, 1.4)
      segmento(m, 16, 40, 16.5, 47, 2.4, 1.7)
      segmento(m, 31, 40, 31.5, 47, 2.4, 1.7)
      disco(m, 17.5, 47.5, 1.7)
      disco(m, 32.5, 47.5, 1.7)
      tri(m, 38, 32.5, 37, 28.5, 40, 31.5)
      ojoPequeno(m, 37.5, 33.5)
      return
    }
    segmento(m, 8, 36, 2, 34.5, 4, 2.6)
    elipse(m, 24, 36.5, 14.5, 8.2)
    elipse(m, 38, 35.5, 6.5, 5.8)
    segmento(m, 41, 35.5, 46.5, 36, 3.4, 2)
    for (let x = 11; x <= 35; x += 4) disco(m, x, 29.5 - Math.sin(((x - 11) / 24) * Math.PI) * 1.4, 1.7)
    if (variante === 'anquilosaurio') {
      disco(m, 4.5, 34.5, 3.4)
      tri(m, 2.5, 32.5, 1, 29.5, 4, 31.5)
      tri(m, 2.5, 36.5, 1, 39.5, 4, 37.5)
    }
    if (variante === 'nodosaurio') {
      tri(m, 36, 32, 33, 26.5, 39, 30)
      disco(m, 41.5, 33.5, 2.4)
    }
    segmento(m, 16, 41, 16.5, 47.5, 2.6, 2)
    segmento(m, 31, 41, 31.5, 47.5, 2.6, 2)
    disco(m, 17.5, 48, 2)
    disco(m, 32.5, 48, 2)
    trazo(m, [[43, 37], [48, 37.5]])
    ojoPequeno(m, 42, 34.2)
    punto(m, 46, 37.5, 7)
  },

  ceratopsio: (m, variante) => {
    if (variante === 'psitacosaurio') {
      segmento(m, 13, 33, 3, 31, 3.4, 1.2)
      elipse(m, 24, 33.5, 9.6, 7)
      segmento(m, 32, 29, 37, 24.5, 2.8, 2.2)
      elipse(m, 41.5, 22.5, 4.6, 3.6)
      segmento(m, 43, 23.5, 46, 24.5, 1.6, 1)
      segmento(m, 25, 36, 26.5, 47.5, 2.6, 1.5)
      segmento(m, 20, 36.5, 21, 47.5, 2.4, 1.4)
      disco(m, 27.5, 48, 1.9)
      disco(m, 21.5, 48, 1.7)
      segmento(m, 34.5, 31, 38.5, 32.5, 1.3, 0.9)
      poligono(m, [[43, 23.5], [47.5, 24.5], [46, 26]], 7)
      ojoPequeno(m, 42, 21.4)
      return
    }
    if (variante === 'protoceratópsido') {
      segmento(m, 13, 35, 5, 33.5, 3, 1.4)
      elipse(m, 25, 35, 11, 7.4)
      elipse(m, 34.5, 33, 5, 5)
      elipse(m, 40, 31.5, 5.2, 4.4)
      elipse(m, 41.5, 33.5, 4.6, 2.4)
      poligono(m, [[37.5, 29], [36.5, 24.5], [40.5, 22], [44, 22.6], [45.5, 27]], 8)
      segmento(m, 43, 32.5, 47.5, 32.5, 1.6, 1)
      segmento(m, 16, 39, 16.5, 47, 2.6, 1.8)
      segmento(m, 31, 39, 31.5, 47, 2.6, 1.8)
      disco(m, 17.5, 47.5, 1.8)
      disco(m, 32.5, 47.5, 1.8)
      trazo(m, [[43.5, 33.7], [47.2, 33.7]])
      ojoPequeno(m, 40.5, 30.5)
      punto(m, 47, 32.3, 7)
      return
    }
    segmento(m, 11, 34, 3, 32.5, 3.4, 1.6)
    elipse(m, 24, 34, 13, 8.6)
    elipse(m, 34.5, 31.5, 6, 6.2)
    elipse(m, 41, 28.5, 6.6, 4.6)
    elipse(m, 43.5, 32.5, 5.6, 2.6)
    poligono(m, [[35.5, 27], [34, 19], [39, 15], [45.5, 16], [48.5, 21], [47, 27]], 8)
    segmento(m, 45, 31, 50.5, 31.2, 2.2, 1.4)
    if (variante === 'centrosaurino') {
      tri(m, 43.5, 29.5, 44.7, 21, 45.9, 29.5)
      tri(m, 35, 20.5, 33, 15.5, 37, 18.5)
      tri(m, 39, 17.5, 38.6, 12.5, 41.5, 16.5)
      tri(m, 43.5, 16.5, 45, 12, 46.5, 17.5)
    } else {
      tri(m, 43.5, 29, 44.5, 22.5, 45.7, 29)
      tri(m, 37.5, 26.5, 38.7, 16, 40.2, 26.5)
      tri(m, 41.5, 25.5, 42.8, 16.5, 44.2, 25.5)
    }
    segmento(m, 16, 39, 16.5, 47.5, 3, 1.9)
    segmento(m, 31, 39, 31.5, 47.5, 3, 1.9)
    disco(m, 17.5, 48, 2)
    disco(m, 32.5, 48, 2)
    trazo(m, [[45.6, 32.4], [50, 32.6]])
    ojoPequeno(m, 41, 27.4)
    punto(m, 49.5, 31.8, 7)
  },
})

function dibujarDinosaurio(dino, arquetipo, variante, ale) {
  const mascara = new Uint8Array(CELDA * CELDA)
  PINTORES[arquetipo](mascara, variante, dino)
  const k = escalaPorLongitud(dino.length_m)
  return renderizar(escalar(mascara, k), elegirRampa(dino, ale), elegirPatron(ale), semillaDe(dino.slug) % 97, k)
}

function pegarCelda(hoja, anchoHoja, sprite, col, fila) {
  for (let y = 0; y < CELDA; y++) {
    const destino = ((fila * CELDA + y) * anchoHoja + col * CELDA) * 4
    hoja.set(sprite.subarray(y * CELDA * 4, (y + 1) * CELDA * 4), destino)
  }
}

function escribirMapa(mapa, filas) {
  const entradas = Object.entries(mapa)
    .map(([slug, indice]) => `  ${JSON.stringify(slug)}: ${indice},`)
    .join('\n')
  const contenido = `export const SPRITE_COLUMNAS = ${COLUMNAS};\nexport const SPRITE_CELDA = ${CELDA};\nexport const SPRITE_FILAS = ${filas};\nexport const DINO_SPRITES: Record<string, number> = {\n${entradas}\n};\n`
  writeFileSync(RUTA_MAPA, contenido)
}

const DESTACADOS = ['tyrannosaurus-rex', 'triceratops', 'stegosaurus', 'brachiosaurus', 'ankylosaurus', 'spinosaurus', 'parasaurolophus', 'velociraptor', 'diplodocus', 'iguanodon', 'carnotaurus', 'allosaurus']

function escribirVista(dinosaurios, filas) {
  const posicion = (i, celda) => {
    const col = i % COLUMNAS
    const fila = Math.floor(i / COLUMNAS)
    return `${-col * celda}px ${-fila * celda}px`
  }
  const celdas = dinosaurios
    .map((dino, i) => `<div class="celda ${i % 2 ? '' : 'oscura'}"><div class="bicho" style="background-position:${posicion(i, 168)}"></div><div class="nombre">${dino.name}</div></div>`)
    .join('\n')
  const destacados = dinosaurios
    .map((dino, i) => [dino, i])
    .filter(([dino]) => DESTACADOS.includes(dino.slug))
    .map(([dino, i]) => `<div class="celda"><div class="bicho" style="background-position:${posicion(i, 336)}"></div><div class="nombre">${dino.name}</div></div>`)
    .join('\n')
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sprites 16 bits · Dinodle</title>
<style>
  body { margin: 0; padding: 24px; background: #15160f; color: #d9cfb3; font-family: system-ui, sans-serif; }
  h1 { font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
  h2 { font-size: 14px; margin-top: 30px; color: #e0ab5c; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
  .destacados .grid { grid-template-columns: repeat(auto-fill, minmax(352px, 1fr)); }
  .celda { background: #22241a; border: 2px solid #3a3b2c; border-radius: 6px; padding: 8px; text-align: center; }
  .celda.oscura { background: #0a0a08; }
  .bicho { width: 168px; height: 168px; margin: 0 auto 6px; background-image: url('./dinos/dinos.png'); background-repeat: no-repeat; background-size: ${COLUMNAS * 168}px auto; image-rendering: pixelated; }
  .destacados .bicho { width: 336px; height: 336px; background-size: ${COLUMNAS * 336}px auto; }
  .nombre { font-size: 13px; }
</style>
</head>
<body>
  <h1>Sprites 16 bits · ${dinosaurios.length} dinosaurios</h1>
  <section class="destacados">
    <h2>Destacados</h2>
    <div class="grid">${destacados}</div>
  </section>
  <section>
    <h2>Todos</h2>
    <div class="grid">${celdas}</div>
  </section>
</body>
</html>
`
  writeFileSync(RUTA_VISTA, html)
}

async function principal() {
  const dinosaurios = await cargarDinosaurios()
  mkdirSync(new URL('../public/dinos/', import.meta.url), { recursive: true })
  mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
  const filas = Math.ceil(dinosaurios.length / COLUMNAS)
  const anchoHoja = COLUMNAS * CELDA
  const hoja = new Uint8Array(anchoHoja * filas * CELDA * 4)
  const mapa = {}
  dinosaurios.forEach((dino, i) => {
    const { arquetipo, variante } = clasificar(dino)
    const sprite = dibujarDinosaurio(dino, arquetipo, variante, crearAleatorio(semillaDe(dino.slug)))
    pegarCelda(hoja, anchoHoja, sprite, i % COLUMNAS, Math.floor(i / COLUMNAS))
    mapa[dino.slug] = i
  })
  escribirPngRGBA(RUTA_HOJA, anchoHoja, filas * CELDA, hoja)
  escribirMapa(mapa, filas)
  if (CON_VISTA) escribirVista(dinosaurios, filas)
  console.log(`sprites generados: ${dinosaurios.length} en public/dinos/dinos.png`)
}

principal()
