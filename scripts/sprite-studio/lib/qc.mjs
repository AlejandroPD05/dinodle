// Imágenes de control para revisar el arte a ojo (se leen con la herramienta read).
import { mkdirSync } from 'node:fs'
import { escribirPngRGBA } from './png.mjs'
import { CELDA } from './render.mjs'
import { COLCHAS, FILAS } from './hoja.mjs'

const RAIZ_QC = new URL('../_qc/', import.meta.url)

function damero(ancho, alto, x0, y0, escala) {
  // Fondo a cuadros gris para ver la transparencia.
  const buf = new Uint8Array(ancho * alto * 4)
  const cuadro = 8 * escala
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const claro = (Math.floor((x + x0) / cuadro) + Math.floor((y + y0) / cuadro)) % 2 === 0
      const o = (y * ancho + x) * 4
      const v = claro ? 58 : 44
      buf[o] = v
      buf[o + 1] = v
      buf[o + 2] = v
      buf[o + 3] = 255
    }
  }
  return buf
}

function pegarEscalado(dest, anchoDest, rgba, x0, y0, escala) {
  for (let y = 0; y < CELDA * escala; y++) {
    for (let x = 0; x < CELDA * escala; x++) {
      const origen = (Math.floor(y / escala) * CELDA + Math.floor(x / escala)) * 4
      const a = rgba[origen + 3]
      const o = ((y0 + y) * anchoDest + x0 + x) * 4
      if (a === 255) {
        dest[o] = rgba[origen]
        dest[o + 1] = rgba[origen + 1]
        dest[o + 2] = rgba[origen + 2]
        dest[o + 3] = 255
      } else if (a > 0) {
        const t = a / 255
        dest[o] = Math.round(rgba[origen] * t + dest[o] * (1 - t))
        dest[o + 1] = Math.round(rgba[origen + 1] * t + dest[o + 1] * (1 - t))
        dest[o + 2] = Math.round(rgba[origen + 2] * t + dest[o + 2] * (1 - t))
        dest[o + 3] = 255
      }
    }
  }
}

// QC de un dinosaurio: su hoja completa (8×6) ampliada, con separadores.
export function escribirQcDino(dino, resultado, escala = 3) {
  const sep = 1
  const anchoCelda = CELDA * escala
  const ancho = COLCHAS * (anchoCelda + sep) + sep
  const alto = FILAS * (anchoCelda + sep) + sep
  const buf = damero(ancho, alto, 0, 0, escala)
  // Separadores magenta.
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const enSepX = (x - sep) % (anchoCelda + sep) < sep
      const enSepY = (y - sep) % (anchoCelda + sep) < sep
      if (enSepX || enSepY) {
        const o = (y * ancho + x) * 4
        buf[o] = 255
        buf[o + 1] = 0
        buf[o + 2] = 255
      }
    }
  }
  const filas = ['idle', 'walk', 'attack', 'hurt', 'sleep', 'faint']
  filas.forEach((anim, fila) => {
    const { lista } = resultado.frames[anim]
    lista.forEach((rgba, i) => {
      const x0 = sep + i * (anchoCelda + sep)
      const y0 = sep + fila * (anchoCelda + sep)
      pegarEscalado(buf, ancho, rgba, x0, y0, escala)
    })
  })
  mkdirSync(RAIZ_QC, { recursive: true })
  escribirPngRGBA(new URL(`${dino.slug}.png`, RAIZ_QC), ancho, alto, buf)
}

// Contacto por arquetipo: fila 0 (idle) frame 0 de cada dino del arquetipo.
export function escribirQcContacto(arquetipo, lista, escala = 3) {
  const porFila = 8
  const sep = 3
  const anchoCelda = CELDA * escala
  const filas = Math.ceil(lista.length / porFila)
  const ancho = porFila * (anchoCelda + sep) + sep
  const alto = filas * (anchoCelda + sep) + sep
  const buf = damero(ancho, alto, 0, 0, escala)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const enSepX = (x - sep) % (anchoCelda + sep) < sep
      const enSepY = (y - sep) % (anchoCelda + sep) < sep
      if (enSepX || enSepY) {
        const o = (y * ancho + x) * 4
        buf[o] = 255
        buf[o + 1] = 0
        buf[o + 2] = 255
      }
    }
  }
  lista.forEach(({ resultado }, i) => {
    const col = i % porFila
    const fila = Math.floor(i / porFila)
    const rgba = resultado.frames.idle.lista[0]
    pegarEscalado(
      buf,
      ancho,
      rgba,
      sep + col * (anchoCelda + sep),
      sep + fila * (anchoCelda + sep),
      escala
    )
  })
  mkdirSync(RAIZ_QC, { recursive: true })
  escribirPngRGBA(new URL(`contacto-${arquetipo}.png`, RAIZ_QC), ancho, alto, buf)
}
