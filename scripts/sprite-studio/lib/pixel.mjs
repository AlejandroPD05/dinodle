// Lienzo de píxeles con las primitivas de dibujo del estudio de sprites.
// Los valores de píxel son códigos de máscara (ver references/01-pipeline-y-contratos.md).

export const VACIO = 0
export const CUERPO = 1
export const BORDE = 2
export const OJO = 3
export const PUPILA = 4
export const DIENTE = 5
export const GARRA = 6
export const PICO = 7
export const ACENTO = 8
export const BOCA = 9
export const CUERNO = 12
export const TRASERO = 14

export class Lienzo {
  constructor(ancho = 64, alto = 64) {
    this.ancho = ancho
    this.alto = alto
    this.px = new Uint8Array(ancho * alto)
  }

  punto(x, y, v = CUERPO) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return
    this.px[y * this.ancho + x] = v
  }

  rect(x, y, ancho, alto, v = CUERPO) {
    for (let j = 0; j < alto; j++) {
      for (let i = 0; i < ancho; i++) this.punto(x + i, y + j, v)
    }
  }

  disco(cx, cy, r, v = CUERPO) {
    const ri = Math.round(r)
    if (ri <= 0) return this.punto(cx, cy, v)
    for (let dy = -ri; dy <= ri; dy++) {
      const dx = Math.floor(Math.sqrt(ri * ri - dy * dy))
      for (let x = Math.round(cx) - dx; x <= Math.round(cx) + dx; x++) {
        this.punto(x, Math.round(cy) + dy, v)
      }
    }
  }

  elipse(cx, cy, rx, ry, v = CUERPO) {
    if (rx <= 0 || ry <= 0) return
    const ryI = Math.round(ry)
    for (let dy = -ryI; dy <= ryI; dy++) {
      const t = dy / ry
      const s = 1 - t * t
      if (s < 0) continue
      const dx = Math.round(rx * Math.sqrt(s))
      for (let x = Math.round(cx) - dx; x <= Math.round(cx) + dx; x++) {
        this.punto(x, Math.round(cy) + dy, v)
      }
    }
  }

  // Cápsula cónica entre dos puntos (r0 en el primero, r1 en el segundo).
  segmento(x0, y0, x1, y1, r0, r1, v = CUERPO) {
    const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos
      this.disco(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, v)
    }
  }

  poligono(pts, v = CUERPO) {
    if (pts.length < 3) return
    const ys = pts.map((p) => p[1])
    const minY = Math.max(0, Math.floor(Math.min(...ys)))
    const maxY = Math.min(this.alto - 1, Math.ceil(Math.max(...ys)))
    for (let y = minY; y <= maxY; y++) {
      const cruces = []
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i]
        const [x1, y1] = pts[(i + 1) % pts.length]
        if (y0 === y1) continue
        const yMin = Math.min(y0, y1)
        const yMax = Math.max(y0, y1)
        if (y < yMin || y >= yMax) continue
        cruces.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0))
      }
      cruces.sort((a, b) => a - b)
      for (let i = 0; i + 1 < cruces.length; i += 2) {
        for (let x = Math.round(cruces[i]); x <= Math.round(cruces[i + 1]); x++) {
          this.punto(x, y, v)
        }
      }
    }
  }

  tri(x0, y0, x1, y1, x2, y2, v = CUERPO) {
    this.poligono(
      [
        [x0, y0],
        [x1, y1],
        [x2, y2],
      ],
      v
    )
  }

  linea(x0, y0, x1, y1, v = BORDE) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.punto(x0, y0, v)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  trazo(pts, v = BORDE) {
    for (let i = 0; i + 1 < pts.length; i++) {
      this.linea(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], v)
    }
  }

  // Pega otro lienzo encima (solo píxeles no vacíos).
  copiarDe(otro, dx = 0, dy = 0) {
    for (let y = 0; y < otro.alto; y++) {
      for (let x = 0; x < otro.ancho; x++) {
        const v = otro.px[y * otro.ancho + x]
        if (v !== 0) this.punto(x + dx, y + dy, v)
      }
    }
  }

  contarOpaques() {
    let n = 0
    for (const v of this.px) if (v !== 0) n++
    return n
  }

  // Rectángulo envolvente de lo no vacío: {x0,y0,x1,y1} o null.
  limites() {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        if (this.px[y * this.ancho + x] !== 0) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    return x1 >= x0 ? { x0, y0, x1, y1 } : null
  }
}
