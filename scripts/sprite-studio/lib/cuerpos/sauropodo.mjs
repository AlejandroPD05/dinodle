// Saurópodos: base, braquiosaurio, diplocido, dicraeosaurio, amargasaurio,
// mamenquisaurio, titanosaurio y prosauropodo (semibípedo menudo).
// Cuadrúpedos columna: cuerpo voluminoso, patas de pilar, cuello largo en
// curva S y cola larga; el prosauropodo se apoya en la cola.
// Ver references/04-cuerpos-y-variantes.md.
import { ACENTO, BORDE, CUERPO, GARRA, TRASERO } from '../pixel.mjs'
import {
  boca,
  cadena,
  ceja,
  garra,
  ojoAbierto,
  ojoCerrado,
  ojoFeliz,
  ojoMareo,
  pata,
} from '../rig.mjs'

export function preparar(dino, rasgos, ale) {
  const variacion = ale()
  const hombrosAltos = !!rasgos.hombrosAltos
  const cabezaPequena = !!rasgos.cabezaPequena
  return {
    cuelloLargo: rasgos.cuelloLargo ?? 0.65,
    hombrosAltos,
    cabezaPequena,
    colaLatigo: rasgos.cola === 'latigo',
    semibipedo: !!rasgos.semibipedo,
    espinasCuello: rasgos.espinasCuello ?? 0,
    blindaje: rasgos.blindaje ?? 0,
    factorCabeza: cabezaPequena ? 0.78 : hombrosAltos ? 1.04 : 1,
    // Sesgo determinista por dinosaurio: mueve un pelo el arco de la cola y la
    // curva del cuello para que dos saurópodos de la misma variante no salgan
    // clonados (menos de 1px real de diferencia).
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

// Bézier cúbica muestreada (cuellos en S y colas con caída propia).
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

// Cuerpo voluminoso: pila de elipses de cadera a pecho (admite torso inclinado).
function pilaTorso(ax, ay, bx, by, r0, r1, pasos = 9) {
  const lista = []
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos
    lista.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, r: r0 + (r1 - r0) * t })
  }
  return lista
}

function pintarPila(l, lista, v = CUERPO) {
  for (const e of lista) l.elipse(e.x, e.y, e.r, e.r * 0.92, v)
}

// Púa ACENTO apoyada en un borde (normal nx,ny; tangente tx,ty unitarias).
function pua(l, x, y, nx, ny, tx, ty, alto, media) {
  l.tri(
    x - tx * media,
    y - ty * media,
    x + tx * media,
    y + ty * media,
    x + nx * alto,
    y + ny * alto,
    ACENTO
  )
}

// Doble fila de púas dorsales sobre una cadena (cuello de dicraeosáuridos):
// alterna púas largas y cortas para insinuar las dos filas en el perfil.
function espinasDeCadena(l, pts, grosor0, grosor1, fuerza) {
  const n = pts.length - 1
  const total = 3 + Math.round(fuerza * 2)
  for (let k = 0; k < total; k++) {
    const t = 0.12 + (k / Math.max(1, total - 1)) * 0.58
    const i = Math.max(1, Math.min(n - 1, Math.round(t * n)))
    const g = grosor0 + (grosor1 - grosor0) * t
    const [px, py] = pts[i]
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i + 1]
    const largo = Math.hypot(bx - ax, by - ay) || 1
    const tx = (bx - ax) / largo
    const ty = (by - ay) / largo
    const nx = ty
    const ny = -tx
    const alto = (1.7 + 2 * fuerza) * (k % 2 === 0 ? 1 : 0.62)
    pua(l, px + nx * (g / 2 - 0.9), py + ny * (g / 2 - 0.9), nx, ny, tx, ty, alto, 1.15)
  }
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

// Cabezón chibi con ojo grande: el frame 0 de idle es el retrato del dino.
function dibujarCabeza(l, hx, hy, spec, pose) {
  const f = spec.factorCabeza
  const rx = 5.1 * f
  const ry = 4.3 * f
  l.elipse(hx, hy, rx, ry, CUERPO)
  // Muzzle redondeado (el hocico de los saurópodos es romo y corto).
  const mx = hx + rx * 0.72
  const my = hy + 1.1 * f
  l.elipse(mx, my, 3 * f, 2.5 * f, CUERPO)
  l.elipse(hx - rx * 0.45, hy + ry * 0.4, rx * 0.55, ry * 0.5, CUERPO)
  l.punto(mx - 1.2 * f, my - 2.6 * f, BORDE)

  // Boca: línea curva en reposo, hueco granate con la pose de ataque.
  const bx = mx - 1.6 * f
  const by = my + 2.2 * f
  if (pose.boca) {
    boca(l, bx, by, true, { ancho: Math.round(3.8 * f), alto: 2, dientes: 'ninguno' })
  } else {
    l.linea(bx, by, bx + 2, by + 1, BORDE)
    l.linea(bx + 2, by + 1, bx + 2.8 * f, by, BORDE)
  }

  const ojoX = Math.round(hx + rx * 0.15)
  const ojoY = Math.round(hy - ry * 0.55)
  const w = spec.cabezaPequena ? 2 : 3
  dibujarOjo(l, ojoX, ojoY, w, 2, pose.ojo)
}

export function dibujar(l, pose, spec, paleta) {
  const sb = spec.semibipedo
  const sentado = pose.doblada > 0.6 && pose.inclina <= 0.6
  const tendido = pose.doblada > 0.6 && pose.inclina > 0.6
  const inclina = pose.inclina
  const dyDob = sentado ? 5 : tendido ? 8 : pose.doblada * 4
  const dyT = -pose.bob + dyDob
  const alt = spec.hombrosAltos ? 3 : 0

  // --- Esqueleto --------------------------------------------------------
  let cadera
  let pecho
  if (tendido) {
    cadera = { x: 19.5, y: 50.5 }
    pecho = { x: 34.5, y: 49.5 }
  } else if (sentado) {
    cadera = { x: 22, y: 42.5 + dyT }
    pecho = { x: 36 + inclina, y: 39.5 + dyT - alt * 0.6 }
  } else if (sb) {
    cadera = { x: 23.5, y: 44.5 + dyT }
    pecho = { x: 32.5 + inclina * 1.5, y: 36.5 + dyT }
  } else {
    cadera = { x: 21.5, y: 41 + dyT }
    pecho = { x: 37 + inclina * 2, y: 38.5 + dyT - alt }
  }

  // --- Cola (primero: queda detrás de todo) -----------------------------
  const cx = cadera.x
  const cy = cadera.y
  const arco = spec.sesgo * 0.8
  let colaPts
  if (tendido) {
    colaPts = cubica(cx - 2.5, cy - 1, cx - 8, cy - 2.5, 8.5, 55.5, 5.2, 56.5, 8)
  } else if (sb) {
    colaPts = cubica(cx - 2.5, cy - 1, cx - 6.5, cy + 4, cx - 12.5, cy + 11.5, 7.5, 57.5, 8)
  } else if (sentado) {
    colaPts = cubica(cx - 2.5, cy - 1, cx - 8, cy + 1.5, cx - 14, cy + 6, 6.2, 55, 8)
  } else if (spec.colaLatigo) {
    colaPts = cubica(cx - 2.5, cy - 1, cx - 10.5, cy - 5 + arco, 8, cy + 5, 4.6, cy + 1, 8)
  } else {
    colaPts = cubica(cx - 2.5, cy - 1, cx - 10.5, cy - 4.5 + arco, 8, cy + 2, 4.6, cy + 5, 8)
  }
  const nCola = colaPts.length - 1
  for (let i = 0; i <= nCola; i++) {
    colaPts[i][1] += pose.cola * Math.sin((i / nCola) * Math.PI) * 2.6
  }
  cadena(
    l,
    colaPts,
    sb ? 4.2 : spec.colaLatigo ? 3.2 : 3.9,
    sb ? 2 : spec.colaLatigo ? 0.9 : 1.3,
    CUERPO
  )

  // --- Patas (lejanas primero, en TRASERO) ------------------------------
  // Marcha diagonal: delantera cercana + trasera lejana comparten fase.
  const zan = sb ? 2.2 : 3
  const liftDel = lift(pose.pataDel)
  const liftTra = lift(pose.pataTra)
  const hipDelT = { x: cx + 2.5, y: cy + 1 }
  const hipTraT = { x: cx - 1.5, y: cy + 1 }
  const hipDelF = { x: pecho.x + 2.5, y: pecho.y + 3.5 }
  const hipTraF = { x: pecho.x - 1, y: pecho.y + 3.5 }
  const pieDe = (baseX, fase, lf, alto0) => ({ x: baseX + fase * zan, y: alto0 - lf })
  const tendidoTraT = { x: 13, y: 57 }
  const tendidoTraF = { x: 32, y: 56.5 }
  const tendidoDelT = { x: 15, y: 57 }
  const tendidoDelF = { x: 41, y: 57.5 }
  const pieTraT = tendido ? tendidoTraT : pieDe(cx - 1, pose.pataDel, liftDel, 60)
  const pieTraF = tendido
    ? tendidoTraF
    : pieDe(pecho.x - 1, pose.pataTra, liftTra, sb ? 57 : 60)
  pata(l, hipTraT.x, hipTraT.y, pieTraT.x, pieTraT.y, { grosor: 3.4, v: TRASERO, pieRx: 2.8 })
  pata(l, hipTraF.x, hipTraF.y, pieTraF.x, pieTraF.y, {
    grosor: 3.3,
    v: TRASERO,
    pieRx: sb ? 2.2 : 2.8,
    pieRy: 1.6,
  })

  // --- Torso ------------------------------------------------------------
  const gordo = spec.blindaje > 0 ? 0.7 : 0
  const rCad = (sb ? 7.4 : 8.5 + gordo) + (tendido ? 0.4 : 0)
  const rPecho = (sb ? 6.6 : 7.6 + gordo) + (tendido ? 0.4 : 0)
  const pila = pilaTorso(cadera.x, cadera.y, pecho.x, pecho.y, rCad, rPecho)
  pintarPila(l, pila)
  l.elipse(cadera.x + 0.5, cadera.y - 0.5, rCad * 0.96, rCad * 0.86, CUERPO)
  if (spec.hombrosAltos && !tendido && !sentado) {
    l.elipse(pecho.x - 1, pecho.y - 2, 6.6, 5.2, CUERPO)
  }

  // Escuditos del titanosaurio a lo largo del lomo (separados, tipo armadura).
  if (spec.blindaje > 0) {
    for (const t of [0.2, 0.44, 0.68, 0.88]) {
      const e = pila[Math.round(t * (pila.length - 1))]
      l.elipse(e.x, e.y - e.r * 0.92 + 0.6, 1.35, 0.95, ACENTO)
    }
  }

  // --- Patas cercanas (encima del cuerpo) -------------------------------
  const pieDelT = tendido ? tendidoDelT : pieDe(cx + 3.5, pose.pataTra, liftTra, 60)
  const pieDelF = tendido
    ? tendidoDelF
    : pieDe(pecho.x + 4, pose.pataDel, liftDel, sb ? 57 : 60)
  pata(l, hipDelT.x, hipDelT.y, pieDelT.x, pieDelT.y, { grosor: 4.2, pieRx: 3.1, pieRy: 1.8 })
  l.linea(hipDelT.x + 2.3, hipDelT.y + 1, pieDelT.x + 2.3, pieDelT.y - 3, BORDE)
  garra(l, Math.round(pieDelT.x + 3), pieDelT.y - 2, 2, GARRA)
  pata(l, hipDelF.x, hipDelF.y, pieDelF.x, pieDelF.y, {
    grosor: 4,
    pieRx: sb ? 2.3 : 3,
    pieRy: 1.8,
  })
  l.linea(hipDelF.x + 2.2, hipDelF.y + 1, pieDelF.x + 2.2, pieDelF.y - 3, BORDE)
  garra(l, Math.round(pieDelF.x + 3), pieDelF.y - 2, 2, GARRA)

  // --- Cuello y cabeza --------------------------------------------------
  const cl = spec.cuelloLargo
  const nuca = { x: pecho.x - 1.5, y: pecho.y - 3.5 }
  let hx
  let hy
  if (tendido) {
    hx = 47.5
    hy = 53
  } else if (sentado) {
    hx = pecho.x + 6
    hy = pecho.y - 7 - cl * 6
  } else if (sb) {
    hx = pecho.x + 9
    hy = pecho.y - 5 - cl * 12
  } else if (spec.colaLatigo) {
    hx = pecho.x + 10.5 + cl * 3
    hy = pecho.y - 2.5 - cl * 6
  } else if (spec.hombrosAltos) {
    // Braquiosáurido: cuello casi vertical y cabeza sobre los hombros.
    hx = pecho.x + 4.5 + cl * 2
    hy = pecho.y - 6 - cl * 17
  } else {
    hx = pecho.x + 9 + cl * 2
    hy = pecho.y - 6 - cl * 19
  }
  hx = Math.min(hx, 47.5)
  hy = Math.max(hy, 10)

  // Ataque: el cuello se estira mezclando la curva con una recta.
  const ataque = pose.boca > 0 && inclina > 0.3 ? 1 : 0
  const adjX = pose.cuello * 2.5 + pose.cabeza * 1.5 + inclina * 3 * ataque
  const adjY = -pose.cuello * 1.5 + pose.cabeza * 1.5 * ataque
  const hxf = hx + adjX
  const hyf = hy + adjY
  const finX = hxf - 4
  const finY = hyf + 2.4
  const erguido = spec.colaLatigo ? 0.25 : spec.hombrosAltos ? 1 : 0.7
  const sube = mezcla(0.35, 0.62, erguido)
  const c1x = mezcla(nuca.x - 1.2 - erguido * 0.8 - pose.cuello * 1.5, nuca.x + (finX - nuca.x) * 0.3, ataque)
  const c1y = mezcla(nuca.y - (nuca.y - finY) * sube, nuca.y + (finY - nuca.y) * 0.3, ataque)
  const c2x = mezcla(finX - 2.5 - pose.cuello * 1.5, nuca.x + (finX - nuca.x) * 0.7, ataque)
  const c2y = mezcla(finY + (nuca.y - finY) * mezcla(0.18, 0.34, erguido), nuca.y + (finY - nuca.y) * 0.7, ataque)
  const cuelloPts = cubica(nuca.x, nuca.y, c1x + spec.sesgo * 0.9, c1y, c2x, c2y, finX, finY, 8)
  const grosorCuello = (spec.colaLatigo ? 3.3 : spec.espinasCuello > 0 ? 4.4 : 4.1) * (sb ? 0.84 : 1)
  const grosorNuca = (spec.cabezaPequena ? 1.9 : 2.5) * (sb ? 0.9 : 1)
  cadena(l, cuelloPts, grosorCuello, grosorNuca, CUERPO)
  if (spec.espinasCuello > 0 && !tendido) {
    espinasDeCadena(l, cuelloPts, grosorCuello, grosorNuca, spec.espinasCuello)
  }

  dibujarCabeza(l, hxf, hyf, spec, pose)
  void paleta
}
