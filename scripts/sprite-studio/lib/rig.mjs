// Helpers de anatomía para los cuerpos: patas, brazos, curvas, ojos y bocas.
// Todos los cuerpos dibujan mirando a la DERECHA.
import { BOCA, BORDE, CUERPO, DIENTE, GARRA, OJO, PUPILA } from './pixel.mjs'

export const ANCHO = 64
export const ALTO = 64
export const PIES_Y = 60
export const CENTRO_X = 30

/**
 * Pose de animación (ver references/03-animaciones.md).
 * @typedef {Object} Pose
 * @property {number} bob        -2..2 bob vertical del torso (+ arriba)
 * @property {number} inclina    -1..1 inclinación del torso (+ adelante)
 * @property {number} cuello     -1..1 curva extra del cuello
 * @property {number} cabeza     -1..1 cabeceo
 * @property {number} cola       -1..1 fase de ondulación de la cola
 * @property {number} pataDel    -1..1 fase pata delantera (+ adelante)
 * @property {number} pataTra    -1..1 fase pata trasera
 * @property {number} doblada    0..1 patas dobladas (sentado/tendido)
 * @property {number} boca       0|1
 * @property {string} ojo        'abierto'|'cerrado'|'feliz'|'mareo'|'enfadado'
 */

// Pata: cápsula de la cadera al pie + puntera. El cuerpo decide el z-order
// (pata lejana primero con TRASERO, cercana encima con CUERPO).
export function pata(
  l,
  caderaX,
  caderaY,
  pieX,
  pieY,
  { grosor = 3, v = CUERPO, puntera = true, pieRx = 2.6, pieRy = 1.6 } = {}
) {
  l.segmento(caderaX, caderaY, pieX, pieY, grosor / 2, Math.max(1, grosor / 2 - 0.7), v)
  if (puntera) l.elipse(pieX + 1.5, pieY - pieRy + 0.4, pieRx, pieRy, v)
}

// Brazo/mano: cápsula corta hacia una dirección (ángulo en radianes, 0 = derecha,
// positivo = hacia abajo). `garras` pinta 1-3 puntas GARRA al final.
export function mano(l, x, y, largo, angulo, { grosor = 2, v = CUERPO, garras = 0 } = {}) {
  const dx = Math.cos(angulo) * largo
  const dy = Math.sin(angulo) * largo
  l.segmento(x, y, x + dx, y + dy, grosor / 2, 1, v)
  if (garras > 0) {
    for (let i = 0; i < garras; i++) {
      l.punto(x + dx + 1, y + dy + i, GARRA)
    }
  }
}

// Puntos de una curva cuadrática suave entre dos puntos (para cuellos y colas).
export function curvaPuntos(x0, y0, x1, y1, combax = 0, combay = 0, n = 5) {
  const cx = (x0 + x1) / 2 + combax
  const cy = (y0 + y1) / 2 + combay
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    pts.push([
      u * u * x0 + 2 * u * t * cx + t * t * x1,
      u * u * y0 + 2 * u * t * cy + t * t * y1,
    ])
  }
  return pts
}

// Dibuja una cadena de cápsulas por una lista de puntos (cuello/cola).
export function cadena(l, pts, grosor0, grosor1, v = CUERPO) {
  const n = pts.length - 1
  for (let i = 0; i < n; i++) {
    const t0 = i / Math.max(1, n)
    const t1 = (i + 1) / Math.max(1, n)
    l.segmento(
      pts[i][0],
      pts[i][1],
      pts[i + 1][0],
      pts[i + 1][1],
      grosor0 + (grosor1 - grosor0) * t0,
      grosor0 + (grosor1 - grosor0) * t1,
      v
    )
  }
}

// Ojos (ver tabla en references/02-estilo-pixel-art.md).
export function ojoAbierto(l, x, y, w = 2, h = 2) {
  l.rect(x, y, w, h, OJO)
  l.rect(x + w - 1, y, 1, h, PUPILA)
}

export function ojoCerrado(l, x, y, w = 3) {
  l.linea(x, y, x + w - 1, y, BORDE)
}

export function ojoFeliz(l, x, y, w = 3) {
  l.linea(x, y + 1, x + 1, y, BORDE)
  l.linea(x + 1, y, x + w - 1, y + 1, BORDE)
}

export function ojoMareo(l, x, y) {
  l.linea(x, y, x + 2, y + 2, BORDE)
  l.linea(x + 2, y, x, y + 2, BORDE)
}

export function ceja(l, x, y, w = 2, inclinacion = -1) {
  l.linea(x, y + (inclinacion < 0 ? w - 1 : 0), x + w - 1, y + (inclinacion < 0 ? 0 : w - 1), BORDE)
}

// Boca: `y` es la línea del labio superior. Cerrada = línea; abierta = hueco BOCA
// con dientes opcionales ('normal' | 'colmillos' | 'ninguno').
export function boca(l, x, y, abierto, { ancho = 4, alto = 2, dientes = 'normal' } = {}) {
  if (!abierto) {
    l.linea(x, y, x + ancho - 1, y, BORDE)
    return
  }
  l.rect(x, y, ancho, alto + 1, BOCA)
  if (dientes === 'normal' || dientes === 'colmillos') {
    for (let i = 0; i < ancho; i += 2) l.punto(x + i, y, DIENTE)
    for (let i = 1; i < ancho; i += 2) l.punto(x + i, y + alto, DIENTE)
  }
}

export function garra(l, x, y, tam = 2, v = GARRA) {
  for (let i = 0; i < tam; i++) l.punto(x + i, y - i, v)
}
