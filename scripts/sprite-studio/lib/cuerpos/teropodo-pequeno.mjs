// Terópodos pequeños: base, dromeosaurio, troodonte, oviraptor, ornitomimo,
// compsognato, alvarezsaurio, noasaurio y crestado (prosauropodo cae al base).
// Ágiles y esbeltos: cola fina y larga, patas largas, ojos grandes y plumas.
// Ver references/04-cuerpos-y-variantes.md.
import { ACENTO, BOCA, BORDE, CUERPO, DIENTE, GARRA, PICO, TRASERO } from '../pixel.mjs'
import { boca, cadena, ceja, curvaPuntos, garra, mano, ojoAbierto, ojoCerrado, ojoFeliz, ojoMareo, pata } from '../rig.mjs'

export function preparar(dino, rasgos, ale) {
  const variacion = ale()
  return {
    menudo: rasgos.menudo ? 1 : 0,
    factorCabeza: rasgos.menudo ? 0.9 : 1,
    ojosGrandes: rasgos.ojosGrandes ? 1 : 0,
    cuelloLargo: rasgos.cuelloLargo ?? 0,
    plumas: rasgos.plumas ?? 0,
    filoplumasCola: rasgos.filoplumasCola ? 1 : 0,
    garraHoz: rasgos.garraHoz ?? 0,
    garraUnica: rasgos.garraUnica ? 1 : 0,
    cresta: rasgos.cresta ?? 'ninguna',
    pico: rasgos.pico ?? 'ninguno',
    dientes: rasgos.dientes ?? 'normal',
    variacion,
  }
}

function lift(fase) {
  return Math.max(0, 1 - Math.abs(fase) * 2.2) * 2
}

// Cuánto puede sobresalir el morro a la derecha del centro de la cabeza
// (para que nada toque el borde del lienzo en la embestida).
function alcanceMorro(spec) {
  if (spec.pico === 'loro') return 10
  if (spec.pico === 'rapaz') return 9
  return 7.4
}

function dibujarCabeza(l, cx, cy, spec, pose) {
  const f = spec.factorCabeza
  const hocico = 6.5
  const rx = 6.2 * f
  const ry = 5.3 * f

  // Cráneo + hocico corto.
  l.elipse(cx, cy, rx, ry, CUERPO)
  l.segmento(cx + 2, cy - 1.2 * f, cx + hocico * 0.78, cy + 0.3 * f, 3.3 * f, 2.1 * f, CUERPO)
  l.elipse(cx + hocico * 0.78, cy + 0.5 * f, 2.1 * f, 2 * f, CUERPO)

  // Fosa nasal.
  l.punto(cx + hocico * 0.6, cy - 0.4 * f, BORDE)

  // Ojo (el troodonte lo lleva 3×3: su seña de identidad).
  const ojoX = Math.round(cx + 1.5)
  const ojoY = Math.round(cy - 2.3 * f)
  const h = spec.ojosGrandes ? 3 : 2
  if (pose.ojo === 'abierto') ojoAbierto(l, ojoX, ojoY, 3, h)
  else if (pose.ojo === 'cerrado') ojoCerrado(l, ojoX, ojoY, 3)
  else if (pose.ojo === 'feliz') ojoFeliz(l, ojoX, ojoY, 3)
  else if (pose.ojo === 'mareo') ojoMareo(l, ojoX, ojoY)
  else if (pose.ojo === 'enfadado') {
    ojoAbierto(l, ojoX, ojoY, 3, h)
    ceja(l, ojoX - 1, ojoY - 2, 4, -1)
  }

  // Crestas.
  if (spec.cresta === 'casco') {
    // Casco redondeado del oviraptor.
    l.elipse(cx - 0.5, cy - ry - 0.2, 3.4, 2.1, ACENTO)
    l.disco(cx - 3, cy - ry + 1.6, 1.5, ACENTO)
  } else if (spec.cresta === 'doble') {
    // Crestado (guanlong): cresta nasal doble en swoosh, con hueco entre las dos.
    l.poligono(
      [
        [cx + 2.6, cy - ry + 2.5],
        [cx + 5, cy - ry - 4.5],
        [cx + 7, cy - ry - 1],
        [cx + 6.4, cy - ry + 2.5],
      ],
      ACENTO
    )
    l.poligono(
      [
        [cx - 3.4, cy - ry + 2.5],
        [cx - 1.6, cy - ry - 2.6],
        [cx + 0.4, cy - ry + 2.5],
      ],
      ACENTO
    )
  }

  // Boca: pico (oviraptor, ornitomimo) o mandíbula con dientes.
  const bocaY = cy + 2.3 * f
  if (spec.pico === 'loro') {
    // Pico de loro: ganchudo hacia abajo, sin dientes.
    const px = cx + hocico * 0.5
    l.segmento(px, cy + 0.4 * f, px + 4.4, cy + 1.4 * f, 2.5, 1.8, PICO)
    l.segmento(px + 3, cy + 1.4 * f, px + 4.6, cy + 3.4 * f, 1.8, 1, PICO)
    if (pose.boca) l.rect(px - 1, Math.round(cy + 2.6 * f), 4, 2, BOCA)
    else l.linea(px - 1, cy + 3 * f, px + 3.2, cy + 3.4 * f, BORDE)
  } else if (spec.pico === 'rapaz') {
    // Pico corto y puntiagudo del ornitomimo, sin dientes.
    const px = cx + hocico * 0.5
    l.segmento(px + 0.5, cy + 0.5 * f, px + 4.4, cy + 1.6 * f, 2.1, 1.1, PICO)
    if (pose.boca) l.rect(px + 0.5, Math.round(cy + 2.3 * f), 3, 2, BOCA)
    else l.linea(px + 0.5, cy + 2.6 * f, px + 3.4, cy + 2.8 * f, BORDE)
  } else {
    boca(l, cx + 2, bocaY, pose.boca, { ancho: Math.round(hocico * 0.72), alto: 2, dientes: spec.dientes })
    // Noasaurio: colmillos que asoman bajo el labio (masiakasaurus).
    if (spec.dientes === 'colmillos' && !pose.boca) {
      const colmilloX = Math.round(cx + hocico * 0.55)
      l.punto(colmilloX, Math.round(bocaY) + 1, DIENTE)
      l.punto(colmilloX, Math.round(bocaY) + 2, DIENTE)
      l.punto(Math.round(cx + hocico * 0.25), Math.round(bocaY) + 1, DIENTE)
    }
  }
}

export function dibujar(l, pose, spec, paleta) {
  const doblada = pose.doblada
  const tendido = doblada > 0.6 && pose.inclina > 0.6
  const sentado = doblada > 0.6 && pose.inclina <= 0.6
  const dyDob = sentado ? doblada * 8 : tendido ? doblada * 10 : doblada * 6
  const dyT = -pose.bob + dyDob
  const inclina = pose.inclina

  // El compsognato es menudo de verdad: cuerpo más bajo y cabeza más pequeña.
  // Sentado o tendido la rebaja se reduce: con la bajada completa la cola o la
  // barriga rozaban el borde inferior del lienzo.
  const baja = spec.menudo ? (doblada > 0.6 ? 1 : 3.5) : 0
  const dyC = dyT + baja

  // Anclajes del esqueleto.
  const cadera = { x: 25, y: 43 + dyC }
  const pecho = { x: 36 + inclina * 1.5, y: 37.5 + dyC }
  const cabeza = {
    x: 47.5 + inclina * 4 + pose.cuello * 3 + pose.cabeza - doblada * 2 + spec.cuelloLargo * 2,
    y:
      25 +
      dyC * 1.15 +
      inclina * 1.5 -
      pose.cuello * 2.5 +
      pose.cabeza * 1.6 -
      spec.cuelloLargo * 2.5 +
      (tendido ? 4 : sentado ? 1.5 : 0),
  }
  cabeza.x = Math.min(cabeza.x, 58.5 - alcanceMorro(spec))

  // Cola: fina, larga y caída en curva; el compsognato la lleva aún más larga.
  // Sentado o tendido la cola descansa más plana (menos caída y más alta): con
  // el trazo grueso de sus plumas el borde redondeado del pincel rozaba la fila 63.
  const colaBase = tendido || sentado ? { x: cadera.x - 1, y: cadera.y + 2 } : { x: cadera.x, y: cadera.y + 1 }
  const colaPts = curvaPuntos(
    colaBase.x,
    colaBase.y,
    spec.menudo ? 4.5 : 6.5,
    (tendido || sentado ? (spec.menudo ? 53.5 : 55) : 33 + spec.variacion * 2) + dyC * 0.4,
    -5,
    tendido || sentado ? (spec.menudo ? 1.5 : 3) : 8,
    7
  )
  for (let i = 0; i < colaPts.length; i++) {
    colaPts[i][1] += pose.cola * Math.sin((i / (colaPts.length - 1)) * Math.PI) * 3.2
  }
  cadena(l, colaPts, spec.plumas > 0.3 ? 4.2 : 3.9, 1.3, CUERPO)

  // Filoplumas: festón de acento sobre la espina de la cola.
  if (spec.filoplumasCola) {
    for (let i = 2; i < colaPts.length - 1; i += 2) {
      const [tx, ty] = colaPts[i]
      l.tri(tx - 1.2, ty - 1, tx + 1.6, ty - 1, tx + 0.2, ty - 3.4, ACENTO)
    }
  }

  // Patas (largas y finas) y pies.
  const liftTra = lift(pose.pataTra)
  const liftDel = lift(pose.pataDel)
  const pieTra = tendido
    ? { x: 21, y: 60 }
    : sentado
      ? { x: 23, y: 60 }
      : { x: 20.5 + pose.pataTra * 3.6 - doblada * 2, y: 60 - liftTra }
  const pieDel = tendido
    ? { x: 40, y: 60 }
    : sentado
      ? { x: 35, y: 60 }
      : { x: 33 + pose.pataDel * 3.6 - doblada * 2, y: 60 - liftDel }
  const caderaTra = { x: cadera.x - 2.5, y: sentado ? cadera.y : tendido ? cadera.y - 1 : cadera.y + 2 }
  const caderaDel = { x: cadera.x + 5, y: sentado ? cadera.y - 1 : tendido ? cadera.y - 1 : cadera.y + 1.5 }

  // Pata lejana.
  pata(l, caderaTra.x, caderaTra.y, pieTra.x, pieTra.y, { grosor: 3, v: TRASERO })

  // Torso esbelto (vientre + pecho + cadera).
  l.elipse((cadera.x + pecho.x) / 2, (cadera.y + pecho.y) / 2 + dyDob * 0.1, 8.4, 7, CUERPO)
  l.elipse(pecho.x, pecho.y, 7, 6.4, CUERPO)
  l.elipse(cadera.x, cadera.y, 6.2, 6.2, CUERPO)

  // Plumas del lomo (dromeosaurios, troodontes, oviraptores…).
  if (spec.plumas > 0.3) {
    for (let i = 0; i < 5; i++) {
      const px = 28.5 + i * 2.6
      const py = 32.6 - i * 0.5 + dyC
      if (spec.plumas > (i % 2 === 0 ? 0.45 : 0.28)) {
        l.tri(px - 1.2, py + 1.6, px + 1.2, py + 1.6, px, py - 2.4, ACENTO)
      }
    }
  }

  // Pata cercana (delante del torso) con línea de separación y garra.
  pata(l, caderaDel.x, caderaDel.y, pieDel.x, pieDel.y, { grosor: 3.4, pieRx: 2.7, pieRy: 1.5 })
  l.linea(caderaDel.x + 2, caderaDel.y + 1, pieDel.x + 2, pieDel.y - 3, BORDE)
  garra(l, Math.round(pieDel.x + 3), pieDel.y - 2, 2, GARRA)

  // Garra hoz del dromeosaurio: dedo levantado con garra en la pata cercana.
  if (spec.garraHoz > 0 && doblada < 0.6) {
    const gx = pieDel.x + 1
    const gy = pieDel.y - 1
    l.segmento(gx, gy, gx + 0.5, gy - 2.5, 1.2, 1, CUERPO)
    garra(l, Math.round(gx), Math.round(gy - 3.2), 2 + Math.round(spec.garraHoz * 2), GARRA)
  }

  // Brazos; el alvarezsaurio lleva una garra única enorme.
  const largoBrazo = spec.garraUnica ? 3.2 : 5
  const anguloBrazo = spec.garraUnica ? 1 : 0.8
  mano(l, pecho.x - 1, pecho.y + 2.5, largoBrazo * 0.7, anguloBrazo + 0.25, { v: TRASERO })
  mano(l, pecho.x + 1.5, pecho.y + 3, largoBrazo, anguloBrazo, { garras: spec.garraUnica ? 0 : 2 })
  if (spec.garraUnica) {
    const hx = pecho.x + 1.5 + Math.cos(anguloBrazo) * largoBrazo
    const hy = pecho.y + 3 + Math.sin(anguloBrazo) * largoBrazo
    garra(l, Math.round(hx) + 1, Math.round(hy), 3, GARRA)
  }

  // Cuello fino (el ornitomimo lo lleva largo, en S y con la cabeza alta).
  const cuelloPts = curvaPuntos(
    pecho.x + 1,
    pecho.y - 2.5,
    cabeza.x - 5 * spec.factorCabeza,
    cabeza.y + 2,
    -1,
    tendido ? -1 : -3 - spec.cuelloLargo * 4.5,
    4
  )
  cadena(l, cuelloPts, 3.2, 2.5, CUERPO)

  // Cabeza.
  dibujarCabeza(l, cabeza.x, cabeza.y, spec, pose)

  // Penacho de la punta de la cola (filoplumas; en tendido no, para no rozar el borde).
  if ((spec.plumas > 0.3 || spec.filoplumasCola) && !tendido) {
    const [tx, ty] = colaPts[colaPts.length - 1]
    l.tri(tx - 1.8, ty - 2.4, tx + 1.8, ty - 0.4, tx - 1.4, ty + 1.8, ACENTO)
  }
  void paleta
}
