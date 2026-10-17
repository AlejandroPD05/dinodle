// Utilidades compartidas del Sprite Studio (semillas, PRNG, colores).
import { createHash } from 'node:crypto'

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

export function semillaDe(texto) {
  return parseInt(createHash('md5').update(texto).digest('hex').slice(0, 8), 16)
}

export function crearAleatorio(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function colorDe(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// Escala del cuerpo a partir de la longitud real (logarítmica, 0.85..1.05).
export function escalaPorLongitud(largo) {
  if (largo == null || largo <= 0) return 0.95
  const t = clamp(Math.log10(largo) / Math.log10(35), 0, 1)
  return 0.85 + 0.2 * t
}
