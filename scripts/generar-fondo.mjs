import { writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

const DIR_FONDO = new URL('../public/fondo/', import.meta.url)

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

function escribirPng(ruta, ancho, alto, indices, paletaHex) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8
  ihdr[9] = 3
  const plte = Buffer.from(paletaHex.flatMap((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]))
  const filas = []
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho)
    indices.copy(fila, 1, y * ancho, (y + 1) * ancho)
    filas.push(fila)
  }
  const idat = zlib.deflateSync(Buffer.concat(filas), { level: 9 })
  const iend = Buffer.alloc(0)
  writeFileSync(ruta, Buffer.concat([firma, trozo('IHDR', ihdr), trozo('PLTE', plte), trozo('IDAT', idat), trozo('IEND', iend)]))
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

function rejillaRuido(lado, ale) {
  const v = new Float32Array(lado * lado)
  for (let i = 0; i < v.length; i++) v[i] = ale()
  return v
}

function muestrear(vals, lado, x, y) {
  const fx = x * lado
  const fy = y * lado
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const at = (ix, iy) => vals[((((iy % lado) + lado) % lado) * lado) + (((ix % lado) + lado) % lado)]
  const a = at(x0, y0)
  const b = at(x0 + 1, y0)
  const c = at(x0, y0 + 1)
  const d = at(x0 + 1, y0 + 1)
  const arr = a + (b - a) * sx
  const aba = c + (d - c) * sx
  return arr + (aba - arr) * sy
}

const BAYER = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
]

const PALETA_TIERRA = ['#140f09', '#18120c', '#1d1710', '#221b12', '#271f15', '#2d2418', '#342a1b', '#3b301f']

function generarTierra({ contraste, piedras, terrones, pozos, semilla, archivo }) {
  const ART = 240
  const PX = 2
  const ale = crearAleatorio(semilla)
  const n12 = rejillaRuido(12, ale)
  const n36 = rejillaRuido(36, ale)
  const n108 = rejillaRuido(108, ale)
  const n240 = rejillaRuido(ART, ale)
  const idx = new Uint8ClampedArray(ART * ART)
  const maxNivel = PALETA_TIERRA.length - 1

  for (let y = 0; y < ART; y++) {
    for (let x = 0; x < ART; x++) {
      const cx = x / ART
      const cy = y / ART
      const bruto =
        0.14 * (muestrear(n12, 12, cx, cy) - 0.5) * 1.4 +
        0.28 * (muestrear(n36, 36, cx, cy) - 0.5) * 1.2 +
        0.34 * (muestrear(n108, 108, cx, cy) - 0.5) * 1.2 +
        0.24 * (muestrear(n240, ART, cx, cy) - 0.5)
      const v = Math.min(1, Math.max(0, 0.5 + bruto * contraste))
      const dither = (BAYER[y % 8][x % 8] / 64 - 0.5) * 0.85
      idx[y * ART + x] = Math.min(maxNivel, Math.max(0, Math.round(v * maxNivel + dither)))
    }
  }

  const motas = Math.round(ART * ART * 0.02)
  for (let i = 0; i < motas; i++) {
    const x = Math.floor(ale() * ART)
    const y = Math.floor(ale() * ART)
    idx[y * ART + x] = Math.min(maxNivel, idx[y * ART + x] + 1)
  }

  for (let i = 0; i < terrones; i++) {
    const cx = Math.floor(ale() * ART)
    const cy = Math.floor(ale() * ART)
    const ancho = ale() < 0.6 ? 2 : 3
    for (let dx = 0; dx < ancho; dx++) {
      const x = (((cx + dx) % ART) + ART) % ART
      const y = (((cy % ART) + ART) % ART)
      idx[y * ART + x] = 5 + Math.floor(ale() * 2)
      if (ale() < 0.6) {
        const y2 = (((cy + 1) % ART) + ART) % ART
        idx[y2 * ART + x] = 0
      }
    }
  }

  for (let i = 0; i < pozos; i++) {
    const x = Math.floor(ale() * ART)
    const y = Math.floor(ale() * ART)
    idx[y * ART + x] = 0
    if (ale() < 0.5) idx[y * ART + ((x + 1) % ART)] = 1
  }

  for (let i = 0; i < piedras; i++) {
    const cx = Math.floor(ale() * ART)
    const cy = Math.floor(ale() * ART)
    const ancho = ale() < 0.5 ? 1 : 2
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx < ancho; dx++) {
        const x = (((cx + dx) % ART) + ART) % ART
        const y = (((cy + dy) % ART) + ART) % ART
        idx[y * ART + x] = dy === 0 ? 6 : 1
      }
    }
  }

  const ancho = ART * PX
  const alto = ART * PX
  const px = new Uint8ClampedArray(ancho * alto)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      px[y * ancho + x] = idx[Math.floor(y / PX) * ART + Math.floor(x / PX)]
    }
  }
  escribirPng(archivo, ancho, alto, Buffer.from(px), PALETA_TIERRA)
}

function elipse(rej, w, h, cx, cy, rx, ry) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy <= 1) rej[y * w + x] = 1
    }
  }
}

function tallo(rej, w, h, x0, y0, grados, largo, anchoIni, anchoFin) {
  const rad = (grados * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = -Math.sin(rad)
  const pasos = Math.ceil(largo * 4)
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    const x = x0 + dx * largo * t
    const y = y0 + dy * largo * t
    const ancho = anchoIni + (anchoFin - anchoIni) * t
    const desde = Math.round(x - ancho / 2)
    const hasta = Math.round(x + ancho / 2) - 1
    const fila = Math.round(y)
    if (fila < 0 || fila >= h) continue
    for (let xx = desde; xx <= hasta; xx++) {
      if (xx < 0 || xx >= w) continue
      rej[fila * w + xx] = 1
    }
  }
}

function rejillaAPath(rej, w, h, ox, oy) {
  let d = ''
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      if (rej[y * w + x]) {
        let fin = x
        while (fin + 1 < w && rej[y * w + fin + 1]) fin++
        const ancho = fin - x + 1
        d += `M${(x - ox) * 2} ${(y - oy) * 2}h${ancho * 2}v2h${-ancho * 2}z`
        x = fin + 1
      } else x++
    }
  }
  return d
}

function piePath() {
  const W = 30
  const H = 34
  const rej = new Uint8Array(W * H)
  elipse(rej, W, H, 15, 24.5, 7.4, 6.4)
  tallo(rej, W, H, 15, 17.5, 90, 14, 8, 2.2)
  tallo(rej, W, H, 12.2, 17.8, 140, 12.5, 8, 2.2)
  tallo(rej, W, H, 17.8, 17.8, 40, 12.5, 8, 2.2)
  return rejillaAPath(rej, W, H, 15, 17)
}

function defsPie(d) {
  return `<defs><path id="pie" d="${d}"/><clipPath id="recorte"><use href="#pie"/></clipPath></defs>`
}

function huellaSVG(px, py, giro, esc, op) {
  const rad = (giro * Math.PI) / 180
  const sen = Math.sin(rad) / esc
  const cos = Math.cos(rad) / esc
  const sombra = { x: (2.4 * sen).toFixed(2), y: (2.4 * cos).toFixed(2) }
  const labio = { x: (-2.4 * sen).toFixed(2), y: (-2.4 * cos).toFixed(2) }
  const banda = { x: (-5 * sen).toFixed(2), y: (-5 * cos).toFixed(2) }
  return `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${giro.toFixed(1)}) scale(${esc.toFixed(3)})" opacity="${op.toFixed(2)}"><use href="#pie" x="${sombra.x}" y="${sombra.y}" fill="#000000" opacity="0.45"/><use href="#pie" x="${labio.x}" y="${labio.y}" fill="#6b5735" opacity="0.32"/><g clip-path="url(#recorte)"><use href="#pie" fill="#6a5630" opacity="0.55"/><use href="#pie" x="${banda.x}" y="${banda.y}" fill="#0b0806" opacity="0.85"/></g></g>`
}

function puntoCurva(p0, c, p1, t) {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]
}

function tangente(p0, c, p1, t) {
  const dx = 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0])
  const dy = 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

function sendero({ ancho, alto, p0, c, p1, n, escala, opacidadIni, opacidadFin, separation, semilla, archivo }) {
  const ale = crearAleatorio(semilla)
  const d = piePath()
  let usos = ''
  let escombros = ''
  for (let i = 0; i < n; i++) {
    const t = 0.04 + (0.9 * i) / (n - 1)
    const [x, y] = puntoCurva(p0, c, p1, t)
    const ang = tangente(p0, c, p1, t)
    const lado = i % 2 === 0 ? 1 : -1
    const perp = ((ang + 90) * Math.PI) / 180
    const px = x + Math.cos(perp) * separation * lado
    const py = y + Math.sin(perp) * separation * lado
    const giro = ang + 90 + lado * 5 + (ale() - 0.5) * 4
    const esc = escala * (1 + (ale() - 0.5) * 0.1) * (lado === 1 ? 1 : 0.96)
    const op = opacidadIni + (opacidadFin - opacidadIni) * (i / (n - 1))
    usos += huellaSVG(px, py, giro, esc, op)
    const restos = 3 + Math.floor(ale() * 4)
    for (let j = 0; j < restos; j++) {
      const amor = ale() * Math.PI * 2
      const radio = 34 + ale() * 46
      const rx = px + Math.cos(amor) * radio
      const ry = py + Math.sin(amor) * radio
      const oscuro = ale() < 0.55
      escombros += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${(2 + ale() * 3).toFixed(1)}" height="2" fill="${oscuro ? '#0b0906' : '#3a2f1e'}" opacity="${(oscuro ? 0.4 : 0.18) + ale() * 0.1}"/>`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" shape-rendering="crispEdges">${defsPie(d)}${escombros}${usos}</svg>`
  writeFileSync(archivo, svg)
}

generarTierra({ contraste: 1, piedras: 45, terrones: 70, pozos: 200, semilla: 11, archivo: new URL('tierra.png', DIR_FONDO) })

sendero({
  ancho: 1600,
  alto: 1050,
  p0: [760, 140],
  c: [1090, 470],
  p1: [1460, 960],
  n: 7,
  escala: 1.55,
  opacidadIni: 0.75,
  opacidadFin: 0.48,
  separation: 18,
  semilla: 7,
  archivo: new URL('huellas-grandes.svg', DIR_FONDO),
})

sendero({
  ancho: 620,
  alto: 640,
  p0: [40, -30],
  c: [300, 260],
  p1: [600, 590],
  n: 5,
  escala: 0.95,
  opacidadIni: 0.5,
  opacidadFin: 0.26,
  separation: 14,
  semilla: 13,
  archivo: new URL('huellas-pequenas.svg', DIR_FONDO),
})

console.log('fondo generado en public/fondo')
