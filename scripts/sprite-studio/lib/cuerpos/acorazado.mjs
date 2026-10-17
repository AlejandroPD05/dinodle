// Acorazados: estegosaurio (placas dobles alternas + púas de cola),
// anquilosaurio (blindaje + maza), nodosaurio (blindaje sin maza) y basal
// (escuditos pequeños). Cuadrúpedos bajos y anchos, patas cortas y gruesas.
// Ver references/04-cuerpos-y-variantes.md.
import { ACENTO, BORDE, CUERNO, CUERPO, PICO, TRASERO } from '../pixel.mjs'
import {
  boca,
  cadena,
  ceja,
  ojoAbierto,
  ojoCerrado,
  ojoFeliz,
  ojoMareo,
  pata,
} from '../rig.mjs'

export function preparar(dino, rasgos, ale) {
  const variacion = ale()
  const placas = rasgos.placas ?? 0
  const blindaje = rasgos.blindaje ?? 0
  const cola = rasgos.cola ?? 'normal'
  const largo = dino.length_m ?? 6
  return {
    placas,
    blindaje,
    cola,
    maza: cola === 'maza',
    blindado: blindaje >= 0.5,
    // Los estegosáuridos menudos (kentrosaurus y parientes) cambian parte de
    // las placas por púas: mismo rasgo, silueta distinta.
    espinoso: placas >= 0.5 && largo < 7,
    // Sesgo determinista por dinosaurio (mueve un pelo lomo y cola).
    sesgo: variacion < 0.5 ? -1 : 1,
    variacion,
  }
}

function lift(fase) {
  return Math.max(0, 1 - Math.abs(fase) * 2.2) * 2
}

function mezcla(a, b, t) {
  return a + (b - a) * t
}

// Bézier cúbica muestreada (cuello y cola).
function cubica(x0, y0, cx1, cy1, cx2, cy2, x1, y1, n = 8) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    pts.push([
      u * u * u * x0 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x1,
      u * u * u * y0 + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * y1,
    ])
  }
  return pts
}

// Pila de elipses del torso (bajo y ancho) entre cadera y hombros.
function pilaTorso(ax, ay, bx, by, r0, r1, pasos = 10) {
  const lista = []
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    lista.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, r: r0 + (r1 - r0) * t })
  }
  return lista
}

function pintarPila(l, lista, v = CUERPO) {
  for (const e of lista) l.elipse(e.x, e.y, e.r, e.r * 0.88, v)
}

// Altura del lomo (borde superior de la pila) en una columna.
function alturaLomo(pila, x) {
  let arriba = Infinity
  for (const e of pila) {
    const dx = (x - e.x) / e.r
    if (Math.abs(dx) >= 1) continue
    const y = e.y - e.r * 0.88 * Math.sqrt(1 - dx * dx)
    if (y < arriba) arriba = y
  }
  return arriba === Infinity ? null : arriba
}

// Placa ACENTO con forma de escudo: base ancha y punta redondeada.
function placa(l, x, y, alto, ancho) {
  l.poligono(
    [
      [x - ancho, y + 1],
      [x - ancho * 0.6, y - alto * 0.5],
      [x, y - alto],
      [x + ancho * 0.6, y - alto * 0.5],
      [x + ancho, y + 1],
    ],
    ACENTO
  )
}

// Púa hueso apoyada en un borde (normal nx,ny; tangente perpendicular).
function puaHueso(l, x, y, nx, ny, alto, media = 1.2) {
  l.tri(
    x + ny * media,
    y - nx * media,
    x - ny * media,
    y + nx * media,
    x + nx * alto,
    y + ny * alto,
    CUERNO
  )
}

function dibujarOjo(l, x, y, w, h, ojo) {
  if (ojo === 'abierto') ojoAbierto(l, x, y, w, h)
  else if (ojo === 'cerrado') ojoCerrado(l, x - 1, y, w + 1)
  else if (ojo === 'feliz') ojoFeliz(l, x - 1, y, w + 1)
  else if (ojo === 'mareo') ojoMareo(l, x - 1, y - 1)
  else if (ojo === 'enfadado') {
    ojoAbierto(l, x, y, w, h)
    ceja(l, x - 1, y - 2, w + 1, -1)
  }
}

// Cabeza pequeña y baja: cráneo ancho, hocico corto, cuernos caraclanos.
function dibujarCabeza(l, hx, hy, spec, pose) {
  const rx = spec.maza ? 5.6 : 5.2
  const ry = 4
  const hocico = spec.maza ? 5.6 : 5
  const punta = hx + hocico
  l.elipse(hx, hy, rx, ry, CUERPO)
  l.segmento(hx + rx * 0.35, hy - 0.4, punta, hy + 0.8, 3.4, 2.4, CUERPO)
  l.elipse(punta, hy + 0.8, 2.1, 1.8, CUERPO)

  // Pico romo de los anquilosáuridos (mandíbula en cuchara).
  if (spec.maza) l.elipse(punta + 1.1, hy + 0.9, 1.8, 1.2, PICO)

  // Boca: línea curva en reposo, hueco granate al atacar.
  const bx = hx + 2.6
  const by = hy + 2.4
  if (pose.boca) {
    boca(l, bx, by, true, { ancho: 4.6, alto: 2.4, dientes: 'ninguno' })
  } else {
    l.linea(bx, by, bx + 1.8, by + 1, BORDE)
    l.linea(bx + 1.8, by + 1, bx + 3.2, by, BORDE)
  }
  l.punto(punta - 0.8, hy - 1.4, BORDE)

  // Cuernos caraclanos (anquilosáuridos y nodosáuridos).
  if (spec.blindado) {
    l.tri(hx - 3.4, hy - 1.4, hx - 1, hy - 2.2, hx - 5.6, hy - 4.8, CUERNO)
    l.tri(hx - 3.6, hy + 0.6, hx - 1.2, hy - 0.2, hx - 5.8, hy - 0.6, CUERNO)
  }

  const ojoX = Math.round(hx + rx * 0.22)
  const ojoY = Math.round(hy - ry * 0.62)
  dibujarOjo(l, ojoX, ojoY, 3, 2, pose.ojo)
}

export function dibujar(l, pose, spec, paleta) {
  const sentado = pose.doblada > 0.6 && pose.inclina <= 0.6
  const tendido = pose.doblada > 0.6 && pose.inclina > 0.6
  const inclina = pose.inclina
  const dyDob = sentado ? 8 : tendido ? 11 : pose.doblada * 6
  const dyT = -pose.bob + dyDob
  const estego = spec.placas > 0.5

  // --- Esqueleto --------------------------------------------------------
  let cadera
  let pecho
  if (tendido) {
    cadera = { x: 20, y: 49 }
    pecho = { x: 33.5, y: 48.5 }
  } else {
    cadera = { x: 19.5, y: 38 + dyT }
    pecho = { x: 34.5 + inclina * 2.5, y: 38.5 + dyT - inclina + (sentado ? 0.5 : 0) }
  }
  const cx = cadera.x
  const cy = cadera.y

  // --- Patas lejanas (TRASERO; quedan tras la cola y el torso) -----------
  const zan = 2.6
  const liftDel = lift(pose.pataDel)
  const liftTra = lift(pose.pataTra)
  const pieDe = (baseX, fase, lf) => ({ x: baseX + fase * zan, y: 60 - lf })
  const hipTraT = { x: cx - 2, y: cy + 5.5 }
  const hipTraF = { x: pecho.x - 2, y: pecho.y + 5.5 }
  const pieTraT = tendido ? { x: 12, y: 59 } : pieDe(cx - 2.8, pose.pataDel, liftDel)
  const pieTraF = tendido ? { x: 39.5, y: 59 } : pieDe(pecho.x - 2.6, pose.pataTra, liftTra)
  pata(l, hipTraT.x, hipTraT.y, pieTraT.x, pieTraT.y, {
    grosor: 4.4,
    v: TRASERO,
    pieRx: 3,
    pieRy: 1.9,
  })
  pata(l, hipTraF.x, hipTraF.y, pieTraF.x, pieTraF.y, {
    grosor: 4.4,
    v: TRASERO,
    pieRx: 3,
    pieRy: 1.9,
  })

  // --- Cola (sobre las patas lejanas) ------------------------------------
  const amago = pose.cola * (estego ? 2 : 0.8)
  let colaPts
  if (sentado) {
    colaPts = cubica(cx - 2, cy - 1, cx - 7, cy + 2, cx - 11, cy + 6, 6, cy + 8.5, 8)
  } else if (tendido) {
    colaPts = cubica(cx - 2, cy - 1, cx - 8, cy + 1, 10, cy + 4.5, 6.2, cy + 6.5, 8)
  } else if (estego) {
    // Los estegosáuridos llevan la cola en alto, lista para el latigazo.
    colaPts = cubica(cx - 3, cy - 7, cx - 10, cy - 8 - amago, 8.5, cy - 8, 4.6, cy - 6.8 - amago, 8)
  } else if (spec.maza) {
    colaPts = cubica(cx - 3, cy - 2.5, cx - 9.5, cy + 1.5, 8.5, cy + 7, 6, cy + 9.5, 8)
  } else {
    colaPts = cubica(cx - 2.5, cy - 3, cx - 9, cy - 1, 9.5, cy + 3.5, 6.2, cy + 5.5, 8)
  }
  cadena(
    l,
    colaPts,
    estego ? 4.4 : spec.maza ? 4.8 : 4.2,
    estego ? 1.7 : spec.maza ? 2.6 : 1.3,
    CUERPO
  )

  // Armadura de anillos de la cola del nodosaurio.
  if (spec.blindado && !spec.maza && !sentado && !tendido) {
    for (const t of [0.25, 0.45, 0.65]) {
      const i = Math.round(t * (colaPts.length - 1))
      l.elipse(colaPts[i][0], colaPts[i][1] - 0.6, 1.5, 0.9, ACENTO)
    }
  }

  // Maza caudal del anquilosáurido: esfera ACENTO con púas CUERNO.
  if (spec.maza) {
    const [mxx, myy] = colaPts[colaPts.length - 1]
    const cxm = mxx + 0.8
    const cym = myy + 0.7
    l.disco(cxm, cym, tendido ? 3.6 : 4, ACENTO)
    if (!tendido) {
      puaHueso(l, cxm - 1.4, cym - 3.2, -0.45, -0.89, 3.3, 1.2)
      puaHueso(l, cxm - 1.2, cym + 3.3, -0.35, 0.94, 2.8, 1.1)
    }
  }

  // Púas de la cola (thagomizer) de los estegosáuridos.
  if (estego) {
    const nPuas = spec.espinoso ? 3 : 2
    for (let i = 0; i < nPuas; i++) {
      const t = 0.62 + i * 0.13
      const idx = Math.min(colaPts.length - 1, Math.round(t * (colaPts.length - 1)))
      const [px, py] = colaPts[idx]
      const arriba = i % 2 === 0 || tendido || sentado
      puaHueso(
        l,
        px,
        py + (arriba ? -0.5 : 0.5),
        arriba ? -0.34 : -0.47,
        arriba ? -0.94 : 0.88,
        4.2,
        1.15
      )
    }
  }

  // --- Torso y armadura dorsal ------------------------------------------
  const pila = pilaTorso(
    cadera.x,
    cadera.y,
    pecho.x,
    pecho.y,
    tendido ? 9.4 : estego ? 11.4 : 11.8,
    tendido ? 8.8 : estego ? 9.4 : 9.8
  )

  // Fila lejana de placas/escudos: asoma por detrás del lomo.
  const armar = (fila) => {
    if (estego) {
      if (spec.espinoso) {
        // Kentrosaurus y parientes: una sola fila de púas en sierra.
        if (fila === 2) return
        for (let i = 0; i < 6; i++) {
          const x = 17.5 + i * 3.9 + spec.sesgo * 0.3
          const y = alturaLomo(pila, x)
          if (y == null) continue
          const alto = 3.4 + Math.sin(((i + 0.5) / 6) * Math.PI) * 3.4
          l.tri(x - 1.4, y + 0.7, x + 1.4, y + 0.7, x - 0.7, y + 0.7 - alto, ACENTO)
        }
        return
      }
      const n = fila === 2 ? 4 : 5
      for (let i = 0; i < n; i++) {
        const x = 17.5 + i * 4.8 + (fila === 2 ? 2.4 : 0) + spec.sesgo * 0.3
        const y = alturaLomo(pila, x)
        if (y == null) continue
        // Fila lejana más baja y estrecha: asoma entre las placas grandes.
        const alturas = [4.4, 6.6, 8.4, 6.6, 4.4]
        const alto = fila === 2 ? 2.6 : alturas[i]
        placa(l, x, y + (fila === 2 ? 0.9 : 0.6), alto, fila === 2 ? 1.2 : 1.5)
      }
    } else if (spec.blindado) {
      const anky = spec.maza
      const n = fila === 2 ? (anky ? 3 : 4) : anky ? 4 : 5
      const sep = anky ? 5 : 4.4
      const x0 = anky ? 20.5 : 19
      for (let i = 0; i < n; i++) {
        const x = x0 + i * sep + (fila === 2 ? sep / 2 : 0)
        const y = alturaLomo(pila, x)
        if (y == null) continue
        const rx = anky ? (fila === 2 ? 2 : 2.6) : fila === 2 ? 1.7 : 2.1
        const ry = anky ? (fila === 2 ? 1.1 : 1.3) : fila === 2 ? 1.2 : 1.7
        l.elipse(x, y + (fila === 2 ? 1.3 : 0.4), rx, ry, ACENTO)
      }
      // Anillo de escudos del cuello (anquilosáuridos).
      if (anky && fila === 1) {
        l.elipse(pecho.x + 1, pecho.y - 6.5, 1.8, 1.4, ACENTO)
        l.elipse(pecho.x + 4, pecho.y - 4.5, 1.6, 1.3, ACENTO)
      }
    } else {
      const n = fila === 2 ? 5 : 6
      for (let i = 0; i < n; i++) {
        const x = 17.5 + i * 3.6 + (fila === 2 ? 1.8 : 0) + spec.sesgo * 0.3
        const y = alturaLomo(pila, x)
        if (y == null) continue
        l.elipse(x, y + (fila === 2 ? 1 : 0.4), fila === 2 ? 1.2 : 1.5, fila === 2 ? 0.8 : 1.1, ACENTO)
      }
    }
  }
  armar(2)
  pintarPila(l, pila)
  armar(1)

  // Púas de los hombros del nodosaurio.
  if (spec.blindado && !spec.maza && !tendido) {
    l.tri(pecho.x - 4, 33.5, pecho.x - 1.5, 34.5, pecho.x - 6, 26.5, CUERNO)
    l.tri(pecho.x - 1, 33, pecho.x + 1.5, 34, pecho.x - 2.5, 26, CUERNO)
    l.tri(pecho.x - 6.5, 34, pecho.x - 4, 35, pecho.x - 8.5, 27.5, CUERNO)
  }
  // Kentrosaurus: púa larga en el cuello.
  if (spec.espinoso && !tendido) {
    l.tri(pecho.x + 3, 32.5, pecho.x + 5.5, 33.5, pecho.x + 0.5, 25.5, CUERNO)
  }

  // --- Patas cercanas (encima del cuerpo) -------------------------------
  const hipDelT = tendido ? { x: 24, y: 47.5 } : { x: cx + 2.5, y: cy + 4.5 }
  const hipDelF = tendido ? { x: 35.5, y: 47 } : { x: pecho.x + 2.5, y: pecho.y + 5 }
  const pieDelT = tendido ? { x: 14.5, y: 58.5 } : pieDe(cx + 4.6, pose.pataTra, liftTra)
  const pieDelF = tendido ? { x: 43, y: 58.5 } : pieDe(pecho.x + 4.8, pose.pataDel, liftDel)
  pata(l, hipDelT.x, hipDelT.y, pieDelT.x, pieDelT.y, { grosor: 5.2, pieRx: 3.4, pieRy: 1.9 })
  l.linea(hipDelT.x + 2.7, hipDelT.y + 1, pieDelT.x + 2.7, pieDelT.y - 3, BORDE)
  pata(l, hipDelF.x, hipDelF.y, pieDelF.x, pieDelF.y, { grosor: 5, pieRx: 3.2, pieRy: 1.9 })
  l.linea(hipDelF.x + 2.6, hipDelF.y + 1, pieDelF.x + 2.6, pieDelF.y - 3, BORDE)

  // --- Cuello y cabeza --------------------------------------------------
  const nuca = { x: pecho.x - 2.2, y: pecho.y - 3.5 }
  let hx
  let hy
  if (tendido) {
    hx = 47
    hy = 53
  } else if (sentado) {
    hx = 46.5
    hy = pecho.y - 2.5
  } else {
    hx = 48.5 + inclina * 2 + pose.cuello * 1.5
    hy = pecho.y + 1 + inclina * 2 + pose.cabeza * 1.5
  }
  hx = Math.min(hx, 50.5)
  const finX = hx - 4.4
  const finY = hy + 1.2
  const cuelloPts = cubica(
    nuca.x,
    nuca.y,
    mezcla(nuca.x, finX, 0.5),
    mezcla(nuca.y, finY, 0.3),
    finX - 1.5,
    finY - 0.5,
    finX,
    finY,
    6
  )
  cadena(l, cuelloPts, 4.6, 3.4, CUERPO)
  dibujarCabeza(l, hx, hy, spec, pose)
  void paleta
}
