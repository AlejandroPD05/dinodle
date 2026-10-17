// Render de máscara → RGBA: escala, sombreado por columna, patrón, contorno y sombra.
// Portado de la lógica validada de scripts/generar-sprites.mjs.
import { colorDe } from './util.mjs'
import { FIJOS } from './paleta.mjs'
import { ACENTO, CUERPO, TRASERO } from './pixel.mjs'

const CELDA = 64
const ANCLA = [30, 60]

function escalar(mascara, k) {
  if (k === 1) return mascara
  const out = new Uint8Array(CELDA * CELDA)
  for (let y = 0; y < CELDA; y++) {
    for (let x = 0; x < CELDA; x++) {
      const sx = Math.round((x - ANCLA[0]) / k + ANCLA[0])
      const sy = Math.round((y - ANCLA[1]) / k + ANCLA[1])
      if (sx >= 0 && sy >= 0 && sx < CELDA && sy < CELDA) {
        out[y * CELDA + x] = mascara[sy * CELDA + sx]
      }
    }
  }
  return out
}

export function renderizarFrame(lienzo, { paleta, semillaPatron = 0, escala = 1, sombra = true }) {
  const m = escala === 1 ? lienzo.px.slice() : escalar(lienzo.px, escala)
  const rgba = new Uint8Array(CELDA * CELDA * 4)

  const rampa = paleta.rampa.map(colorDe)
  const acento = paleta.acento.map(colorDe)
  const fijos = {}
  for (const [codigo, hex] of Object.entries(FIJOS)) fijos[codigo] = colorDe(hex)
  const patron = paleta.patron

  // Extensiones verticales por columna (para el gradiente de sombreado).
  const arriba = new Int16Array(CELDA).fill(-1)
  const abajo = new Int16Array(CELDA)
  for (let x = 0; x < CELDA; x++) {
    for (let y = 0; y < CELDA; y++) {
      if (m[y * CELDA + x] !== 0) {
        if (arriba[x] === -1) arriba[x] = y
        abajo[x] = y
      }
    }
  }

  const tonoDe = (x, y) => {
    const t =
      arriba[x] === -1 ? 0 : (y - arriba[x]) / Math.max(1, abajo[x] - arriba[x] + 1)
    return { t, arriba: arriba[x] }
  }

  const escribe = (x, y, [r, g, b], a = 255) => {
    const o = (y * CELDA + x) * 4
    rgba[o] = r
    rgba[o + 1] = g
    rgba[o + 2] = b
    rgba[o + 3] = a
  }

  for (let y = 0; y < CELDA; y++) {
    for (let x = 0; x < CELDA; x++) {
      const v = m[y * CELDA + x]
      if (v === 0) continue
      const { t } = tonoDe(x, y)
      if (v === CUERPO) {
        let tono = t < 0.22 ? 3 : t < 0.52 ? 2 : t > 0.82 ? 0 : 1
        if (patron === 'franjas' && (x + semillaPatron) % 6 < 2) tono = Math.max(tono - 1, 0)
        else if (patron === 'banda' && t < 0.16) tono = Math.max(tono - 1, 0)
        else if (patron === 'manchas' && t > 0.25 && t < 0.75 && (x * 31 + y * 17 + semillaPatron) % 27 < 3)
          tono = Math.max(tono - 1, 0)
        escribe(x, y, rampa[tono])
      } else if (v === TRASERO) {
        const base = t < 0.22 ? 3 : t < 0.52 ? 2 : t > 0.82 ? 0 : 1
        escribe(x, y, rampa[Math.min(base, 1)])
      } else if (v === ACENTO) {
        const tono = t < 0.35 ? 3 : t > 0.75 ? 1 : 2
        escribe(x, y, acento[tono])
      } else {
        escribe(x, y, fijos[v] ?? rampa[1])
      }
    }
  }

  // Contorno automático alrededor de lo opaco (no expande bordes manuales).
  const conBorde = new Set([1, 5, 6, 7, 8, 12, 14])
  const borde = colorDe(FIJOS[2])
  for (let y = 0; y < CELDA; y++) {
    for (let x = 0; x < CELDA; x++) {
      if (m[y * CELDA + x] !== 0) continue
      let toca = false
      for (let dy = -1; dy <= 1 && !toca; dy++) {
        for (let dx = -1; dx <= 1 && !toca; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= CELDA || ny >= CELDA) continue
          if (conBorde.has(m[ny * CELDA + nx])) toca = true
        }
      }
      if (toca) escribe(x, y, borde)
    }
  }

  // Sombra elíptica bajo los pies (solo sobre vacío real).
  if (sombra) {
    const rx = 14 * escala
    const ry = 2.4
    for (let y = 0; y < CELDA; y++) {
      for (let x = 0; x < CELDA; x++) {
        const nx = (x - 30) / rx
        const ny = (y - 61) / ry
        if (nx * nx + ny * ny > 1) continue
        const o = (y * CELDA + x) * 4
        if (rgba[o + 3] === 0) {
          rgba[o] = 11
          rgba[o + 1] = 10
          rgba[o + 2] = 7
          rgba[o + 3] = 90
        }
      }
    }
  }

  return rgba
}

export { CELDA }
