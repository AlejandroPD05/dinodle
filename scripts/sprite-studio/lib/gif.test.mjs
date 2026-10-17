// @vitest-environment node
// Ida y vuelta del encoder GIF (lib/gif.mjs): decodificador GIF/LZW mínimo
// escrito en este test para comprobar encabezado, dimensiones, delays, bucle,
// paleta y que los índices de cada frame se recuperan exactamente.
import { describe, expect, it } from 'vitest'
import { ANIMACIONES } from './animaciones.mjs'
import { codificarGif } from './gif.mjs'
import { paletaDe } from './paleta.mjs'
import { CUERPO, Lienzo, OJO, PUPILA } from './pixel.mjs'
import { CELDA, renderizarFrame } from './render.mjs'
import { crearAleatorio } from './util.mjs'

// --- Decodificador mínimo (solo lo que produce nuestro encoder) ---------------

const u16le = (buf, off) => buf[off] | (buf[off + 1] << 8)

function decodificarLzw(datos, tamMinimo) {
  const limpieza = 1 << tamMinimo
  const fin = limpieza + 1
  const salida = []
  let tam = tamMinimo + 1
  let dict = []
  let acumulador = 0
  let nBits = 0
  let pos = 0

  const reiniciar = () => {
    dict = []
    for (let i = 0; i < limpieza; i++) dict.push([i])
    dict.push(null, null) // limpieza y fin no son cadenas
    tam = tamMinimo + 1
  }
  reiniciar()

  let previo = null
  for (;;) {
    while (nBits < tam) {
      if (pos >= datos.length) throw new Error('LZW truncado')
      acumulador |= datos[pos++] << nBits
      nBits += 8
    }
    const codigo = acumulador & ((1 << tam) - 1)
    acumulador >>>= tam
    nBits -= tam

    if (codigo === limpieza) {
      reiniciar()
      previo = null
      continue
    }
    if (codigo === fin) break

    let entrada
    if (codigo < dict.length && dict[codigo] !== null) {
      entrada = dict[codigo]
    } else if (codigo === dict.length && previo !== null) {
      entrada = [...previo, previo[0]] // caso KwKwK
    } else {
      throw new Error(`código LZW inválido: ${codigo}`)
    }
    for (const v of entrada) salida.push(v)

    // El decodificador va una entrada por detrás del encoder: crece cuando su
    // siguiente código ya no cabe (misma convención que los decodificadores
    // estándar, p. ej. giflib/GDI+).
    if (previo !== null && dict.length < 4096) {
      dict.push([...previo, entrada[0]])
      if (dict.length >= 1 << tam && tam < 12) tam++
    }
    previo = entrada
  }
  return salida
}

function decodificarGif(bytes) {
  const buf = Buffer.from(bytes)
  if (buf.toString('latin1', 0, 6) !== 'GIF89a') throw new Error('no es GIF89a')
  const ancho = u16le(buf, 6)
  const alto = u16le(buf, 8)
  const empaquetadoPantalla = buf[10]
  const fondo = buf[11]
  let pos = 13

  const tamPaleta = 1 << ((empaquetadoPantalla & 7) + 1)
  const paleta = []
  for (let i = 0; i < tamPaleta; i++) {
    paleta.push([buf[pos], buf[pos + 1], buf[pos + 2]])
    pos += 3
  }

  const frames = []
  let bucle = null
  let gce = null
  const saltarSubBloques = () => {
    while (pos < buf.length && buf[pos] !== 0) pos += buf[pos] + 1
    pos++
  }
  while (pos < buf.length) {
    const bloque = buf[pos++]
    if (bloque === 0x3b) break
    if (bloque === 0x21) {
      const etiqueta = buf[pos++]
      const tam = buf[pos++]
      if (etiqueta === 0xf9) {
        gce = {
          disposal: (buf[pos] >> 2) & 7,
          transparencia: (buf[pos] & 1) === 1,
          retardo: u16le(buf, pos + 1),
          indiceTransparente: buf[pos + 3],
        }
        pos += tam
        pos++ // terminador
      } else if (etiqueta === 0xff && tam === 11 && buf.toString('latin1', pos, pos + 11) === 'NETSCAPE2.0') {
        pos += 11
        if (buf[pos] >= 3 && buf[pos + 1] === 1) {
          bucle = u16le(buf, pos + 2)
          pos += buf[pos] + 1
        }
        saltarSubBloques()
      } else {
        pos += tam
        saltarSubBloques()
      }
    } else if (bloque === 0x2c) {
      const izq = u16le(buf, pos)
      const arriba = u16le(buf, pos + 2)
      const anchoFrame = u16le(buf, pos + 4)
      const altoFrame = u16le(buf, pos + 6)
      const empaquetado = buf[pos + 8]
      pos += 9
      if (empaquetado & 0x80) pos += 3 * (1 << ((empaquetado & 7) + 1))
      const tamMinimo = buf[pos++]
      const datos = []
      while (pos < buf.length && buf[pos] !== 0) {
        const n = buf[pos++]
        for (let i = 0; i < n; i++) datos.push(buf[pos + i])
        pos += n
      }
      pos++
      frames.push({
        ...gce,
        izq,
        arriba,
        ancho: anchoFrame,
        alto: altoFrame,
        indices: decodificarLzw(datos, tamMinimo),
      })
    } else {
      throw new Error(`bloque GIF desconocido: 0x${bloque.toString(16)}`)
    }
  }
  return { ancho, alto, paleta, fondo, frames, bucle }
}

// --- Utilidades de los frames sintéticos -------------------------------------

const COLORES = {
  r: [255, 0, 0],
  g: [0, 255, 0],
  b: [0, 0, 255],
}
const INDICES = { r: 0, g: 1, b: 2 } // orden de primera aparición en el frame 0
const TRANSPARENTE = 3

function frameDesdeArte(filas) {
  const frame = new Uint8Array(8 * 8 * 4)
  filas.forEach((fila, y) => {
    for (let x = 0; x < 8; x++) {
      const ch = fila[x]
      if (ch === '.') continue // alpha 0 = transparente
      const [r, g, b] = COLORES[ch]
      frame.set([r, g, b, 255], (y * 8 + x) * 4)
    }
  })
  return frame
}

const ARTE = [
  ['rrgb....', 'rr......', '........', '........', '........', '........', '........', '........'],
  ['........', '........', '..gg....', '..gg....', '....r...', '........', '........', '........'],
  ['........', '........', '........', '........', '........', '.....bb.', '.....bb.', 'g.......'],
  ['r.......', '.r......', '..r.....', '...r....', '....r...', '.....r..', '......r.', '.......r'],
]

const FRAMES_SINTETICOS = ARTE.map(frameDesdeArte)

// --- Utilidades del frame real (render de 64×64) ------------------------------

function frameReal(dx, dy) {
  const lienzo = new Lienzo(CELDA, CELDA)
  lienzo.disco(30 + dx, 42 + dy, 11, CUERPO)
  lienzo.rect(30 + dx, 30 + dy, 8, 5, CUERPO)
  lienzo.disco(41 + dx, 31 + dy, 2, OJO)
  lienzo.punto(42 + dx, 31 + dy, PUPILA)
  const paleta = paletaDe({ diet: 'Carnívoro', slug: 'test-gif' }, crearAleatorio(7))
  return renderizarFrame(lienzo, { paleta, semillaPatron: paleta.semillaPatron, escala: 1 })
}

const FRAMES_REALES = [frameReal(0, 0), frameReal(0, -1), frameReal(1, 0)]

describe('codificarGif', () => {
  it('escribe GIF89a con dimensiones, 4 frames, delay de fps=10 y bucle 0', () => {
    const bytes = codificarGif(FRAMES_SINTETICOS, { ancho: 8, alto: 8, fps: 10 })
    expect(Buffer.from(bytes.subarray(0, 6)).toString('latin1')).toBe('GIF89a')

    const gif = decodificarGif(bytes)
    expect(gif.ancho).toBe(8)
    expect(gif.alto).toBe(8)
    expect(gif.frames).toHaveLength(4)
    expect(gif.bucle).toBe(0)
    for (const frame of gif.frames) {
      expect(frame.retardo).toBe(10)
      expect(frame.ancho).toBe(8)
      expect(frame.alto).toBe(8)
      expect(frame.izq).toBe(0)
      expect(frame.arriba).toBe(0)
      expect(frame.disposal).toBe(2)
      expect(frame.transparencia).toBe(true)
      expect(frame.indiceTransparente).toBe(TRANSPARENTE)
      expect(frame.indices).toHaveLength(64)
    }
  })

  it('recupera la paleta exacta (orden de aparición) y los índices de cada frame', () => {
    const bytes = codificarGif(FRAMES_SINTETICOS, { ancho: 8, alto: 8, fps: 10 })
    const gif = decodificarGif(bytes)

    expect(gif.paleta[0]).toEqual(COLORES.r)
    expect(gif.paleta[1]).toEqual(COLORES.g)
    expect(gif.paleta[2]).toEqual(COLORES.b)
    expect(gif.fondo).toBe(TRANSPARENTE)

    ARTE.forEach((filas, f) => {
      const esperados = new Uint8Array(64)
      filas.forEach((fila, y) => {
        for (let x = 0; x < 8; x++) {
          const ch = fila[x]
          esperados[y * 8 + x] = ch === '.' ? TRANSPARENTE : INDICES[ch]
        }
      })
      expect(gif.frames[f].indices).toEqual([...esperados])
    })
  })

  it('escribe el número de repeticiones pedido en NETSCAPE2.0', () => {
    const bytes = codificarGif(FRAMES_SINTETICOS, { ancho: 8, alto: 8, fps: 10, bucle: 5 })
    expect(decodificarGif(bytes).bucle).toBe(5)
  })

  it('ida y vuelta con frames reales 64×64 del render (sombra incluida)', () => {
    const bytes = codificarGif(FRAMES_REALES, { ancho: 64, alto: 64, fps: 6 })
    const gif = decodificarGif(bytes)

    expect(gif.ancho).toBe(64)
    expect(gif.alto).toBe(64)
    expect(gif.frames).toHaveLength(3)
    expect(gif.bucle).toBe(0)
    expect(gif.frames.every((f) => f.retardo === 17)).toBe(true)

    // La sombra suave (alpha 90) se exporta opaca con su RGB: #0b0a07.
    expect(gif.paleta.some(([r, g, b]) => r === 11 && g === 10 && b === 7)).toBe(true)

    FRAMES_REALES.forEach((rgba, f) => {
      const { indices, indiceTransparente } = gif.frames[f]
      expect(indices).toHaveLength(64 * 64)
      for (let p = 0; p < indices.length; p++) {
        const o = p * 4
        if (rgba[o + 3] === 0) {
          expect(indices[p]).toBe(indiceTransparente)
        } else {
          expect(gif.paleta[indices[p]]).toEqual([rgba[o], rgba[o + 1], rgba[o + 2]])
        }
      }
    })
  })

  it('usa el delay de cada animación (round(100/fps))', () => {
    for (const [anim, { fps }] of Object.entries(ANIMACIONES)) {
      const bytes = codificarGif(FRAMES_REALES, { ancho: 64, alto: 64, fps })
      const gif = decodificarGif(bytes)
      expect(gif.frames.every((f) => f.retardo === Math.round(100 / fps)), anim).toBe(true)
      expect(gif.frames).toHaveLength(FRAMES_REALES.length)
    }
  })

  it('lanza un error claro si hay más de 255 colores distintos', () => {
    const frame = new Uint8Array(16 * 16 * 4)
    for (let p = 0; p < 256; p++) {
      frame.set([p, (p * 7) % 256, (p * 13) % 256, 255], p * 4)
    }
    expect(() => codificarGif([frame], { ancho: 16, alto: 16, fps: 10 })).toThrow(/colores/)
  })

  it('rechaza frames con tamaño incorrecto', () => {
    expect(() => codificarGif([new Uint8Array(4)], { ancho: 8, alto: 8, fps: 10 })).toThrow(/frame/)
  })
})
