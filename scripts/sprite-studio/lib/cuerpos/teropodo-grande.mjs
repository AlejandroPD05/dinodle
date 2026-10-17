// Terópodos grandes: tirano, carnosaurio, abelisaurio, espinosaurio, crestado,
// carnotauro, tericinosaurio, deinocheirus. Cuerpo de REFERENCIA del estudio.
// Ver references/04-cuerpos-y-variantes.md.
import { ACENTO, BORDE, CUERNO, CUERPO, GARRA, PICO, TRASERO } from '../pixel.mjs'
import { boca, cadena, ceja, curvaPuntos, garra, mano, ojoAbierto, ojoCerrado, ojoFeliz, ojoMareo, pata } from '../rig.mjs'

export function preparar(dino, rasgos, ale) {
  const variacion = ale()
  return {
    factorCabeza: rasgos.cabezaGrande ? 1.22 : rasgos.cabezaCorta ? 0.94 : 1,
    largoHocico: rasgos.hocicoLargo ? 1.45 : 1,
    cuelloLargo: rasgos.cuelloLargo ?? 0,
    vela: rasgos.vela ?? 0,
    joroba: rasgos.joroba ?? 0,
    plumas: rasgos.plumas ?? 0,
    cresta: rasgos.cresta ?? 'ninguna',
    cuernos: rasgos.cuernos ?? 'ninguno',
    pico: rasgos.pico ?? 'ninguno',
    brazos: rasgos.brazos ?? 'normales',
    dientes: rasgos.dientes ?? 'normal',
    cejas: rasgos.cejas ?? false,
    crestaOcular: rasgos.crestaOcular ?? false,
    garrasGrandes: rasgos.garrasGrandes ?? 0,
    panzaGrande: rasgos.panzaGrande ?? false,
    garraHoz: rasgos.garraHoz ?? 0,
    filoplumasCola: rasgos.filoplumasCola ?? false,
    ojosGrandes: rasgos.ojosGrandes ?? false,
    variacion,
  }
}

function lift(fase) {
  return Math.max(0, 1 - Math.abs(fase) * 2.2) * 2
}

function dibujarCabeza(l, cx, cy, spec, pose) {
  const f = spec.factorCabeza
  const hocico = 8 * spec.largoHocico
  const rx = 6.8 * f
  const ry = 5.8 * f

  // Cráneo + hocico.
  l.elipse(cx, cy, rx, ry, CUERPO)
  l.segmento(cx + 2, cy - 1.8 * f, cx + hocico * 0.75, cy + 0.4 * f, 3.4 * f, 2.2 * f, CUERPO)
  l.elipse(cx + hocico * 0.75, cy + 0.5 * f, 2.2 * f, 2.1 * f, CUERPO)

  // Boca.
  const bocaY = cy + 2.8 * f
  const abierta = pose.boca
  boca(l, cx + 2.5, bocaY, abierta, {
    ancho: Math.round(hocico * 0.72),
    alto: 3,
    dientes: spec.dientes === 'aserrados' ? 'normal' : spec.dientes,
  })
  // Fosa nasal.
  l.punto(cx + hocico * 0.66, cy - 0.5 * f, BORDE)

  // Ojo.
  const ojoX = Math.round(cx - 1)
  const ojoY = Math.round(cy - 2.6 * f)
  const w = 3
  const h = spec.ojosGrandes || f >= 1.1 ? 3 : 2
  if (pose.ojo === 'abierto') ojoAbierto(l, ojoX, ojoY, w, h)
  else if (pose.ojo === 'cerrado') ojoCerrado(l, ojoX, ojoY, 4)
  else if (pose.ojo === 'feliz') ojoFeliz(l, ojoX, ojoY, 4)
  else if (pose.ojo === 'mareo') ojoMareo(l, ojoX, ojoY)
  else if (pose.ojo === 'enfadado') {
    ojoAbierto(l, ojoX, ojoY, w, h)
    ceja(l, ojoX - 1, ojoY - 2, 4, -1)
  }
  if (spec.cejas) ceja(l, ojoX - 1, ojoY - 2, 4, -1)
  if (spec.crestaOcular) {
    l.linea(cx - 4, cy - ry + 1, cx + 3, cy - ry, ACENTO)
    l.linea(cx - 4, cy - ry + 2, cx + 2, cy - ry + 1, ACENTO)
  }

  // Pico (tericinosaurio, deinocheirus).
  if (spec.pico === 'pato') {
    l.segmento(cx + hocico * 0.62, cy + 0.8 * f, cx + hocico * 1.05, cy + 1.4 * f, 2.4 * f, 1.5 * f, PICO)
  } else if (spec.pico === 'rapaz') {
    l.segmento(cx + hocico * 0.62, cy + 1.2 * f, cx + hocico * 1.05, cy + 2.8 * f, 2.1 * f, 1, PICO)
  }

  // Crestas.
  if (spec.cresta === 'doble') {
    l.disco(cx + 4, cy - ry - 1, 3, ACENTO)
    l.disco(cx - 2.5, cy - ry - 0.2, 2.6, ACENTO)
  } else if (spec.cresta === 'lomo') {
    l.poligono(
      [
        [cx - 5, cy - ry + 1],
        [cx + 0.5, cy - ry - 6],
        [cx + 5, cy - ry + 1],
      ],
      ACENTO
    )
  } else if (spec.cresta === 'redonda' || spec.cresta === 'casco' || spec.cresta === 'tubo' || spec.cresta === 'pincho' || spec.cresta === 'hacha' || spec.cresta === 'cuerno') {
    l.disco(cx - 1, cy - ry - 1, 2.6, ACENTO)
  }

  // Cuernos.
  if (spec.cuernos === 'cejas') {
    garra(l, cx - 3, cy - ry - 1, 3, CUERNO)
    garra(l, cx + 2, cy - ry - 2, 2, CUERNO)
  } else if (spec.cuernos === 'bultos') {
    l.disco(cx + 3, cy - ry + 0.5, 1.8, CUERNO)
    l.disco(cx - 3, cy - ry + 1.5, 1.6, CUERNO)
  } else if (spec.cuernos === 'nariz') {
    l.disco(cx + hocico * 0.7, cy - 1.8 * f, 1.6, CUERNO)
  }
}

export function dibujar(l, pose, spec, paleta) {
  const doblada = pose.doblada
  const tendido = doblada > 0.6 && pose.inclina > 0.6
  const sentado = doblada > 0.6 && pose.inclina <= 0.6
  const dyDob = sentado ? doblada * 8 : tendido ? doblada * 11 : doblada * 6
  const dyT = -pose.bob + dyDob
  const inclina = pose.inclina

  // Anclajes del esqueleto.
  const cadera = { x: 25, y: 42 + dyT }
  const pecho = { x: 37 + inclina * 1.5, y: 36 + dyT }
  let cabeza = {
    x: 49 + inclina * 4 + pose.cuello * 3 + pose.cabeza - doblada * 2,
    y: 24 + dyT * 1.15 + inclina * 1.5 - pose.cuello * 2.5 + pose.cabeza * 1.6 + (tendido ? 4 : sentado ? 1.5 : 0),
  }
  const hocico = 8 * spec.largoHocico
  cabeza.x = Math.min(cabeza.x, 60 - (hocico * 0.75 + 4))

  // Cola.
  const colaBase = tendido || sentado ? { x: cadera.x - 1, y: cadera.y + 2 } : { x: cadera.x, y: cadera.y + 1 }
  const colaPts = curvaPuntos(
    colaBase.x,
    colaBase.y,
    4,
    (tendido ? 51 : sentado ? 56 : 32) + dyT * 0.4,
    -6,
    tendido || sentado ? 3 : 9,
    6
  )
  for (let i = 0; i < colaPts.length; i++) {
    colaPts[i][1] += pose.cola * Math.sin((i / (colaPts.length - 1)) * Math.PI) * 3
  }
  cadena(l, colaPts, spec.plumas > 0.3 ? 5 : 4.6, 1.6, CUERPO)

  // Patas.
  const liftTra = lift(pose.pataTra)
  const liftDel = lift(pose.pataDel)
  const pieTra = tendido
    ? { x: 20, y: 60 }
    : sentado
      ? { x: 23, y: 60 }
      : { x: 20 + pose.pataTra * 4 - doblada * 2, y: 60 - liftTra }
  const pieDel = tendido
    ? { x: 41, y: 60 }
    : sentado
      ? { x: 36, y: 60 }
      : { x: 34.5 + pose.pataDel * 4 - doblada * 2, y: 60 - liftDel }
  const caderaTra = { x: cadera.x - 2.5, y: sentado ? 50 : tendido ? 52 : cadera.y + 2 }
  const caderaDel = { x: cadera.x + 5.5, y: sentado ? 50 : tendido ? 52 : cadera.y + 1.5 }

  pata(l, caderaTra.x, caderaTra.y, pieTra.x, pieTra.y, { grosor: 3.6, v: TRASERO })

  // Cuerpo (vientre + pecho + cadera). La panza nunca baja de y=52 para
  // reservar el margen del contorno en las poses tendidas.
  const gr = spec.panzaGrande
  const centroVientreY = Math.min((cadera.y + pecho.y) / 2 + dyDob * 0.15, 52)
  l.elipse((cadera.x + pecho.x) / 2, centroVientreY, gr ? 11.5 : 10.5, gr ? 10 : 9, CUERPO)
  l.elipse(pecho.x, pecho.y, 8.5, 8, CUERPO)
  l.elipse(cadera.x, cadera.y, 7.5, 7.5, CUERPO)
  if (spec.joroba > 0) l.elipse(31, pecho.y - 2 - spec.joroba * 2.5, 8, 3.5, CUERPO)

  // Plumas: zigzag de acento en el lomo.
  if (spec.plumas > 0.3) {
    for (let i = 0; i < 5; i++) {
      const px = 26 + i * 3.6
      const py = (spec.joroba > 0 ? 31 : 32.5) - i * 0.9 + dyT
      if (spec.plumas > (i % 2 === 0 ? 0.55 : 0.3)) {
        l.tri(px - 1.5, py, px + 1.5, py, px, py - 2.8, ACENTO)
      }
    }
  }

  // Pata cercana (delante del cuerpo, con línea de separación).
  pata(l, caderaDel.x, caderaDel.y, pieDel.x, pieDel.y, { grosor: 4, pieRx: 3, pieRy: 1.8 })
  l.linea(caderaDel.x + 2.2, caderaDel.y + 1, pieDel.x + 2.2, pieDel.y - 3, BORDE)
  garra(l, Math.round(pieDel.x + 3), pieDel.y - 2, 2, GARRA)
  if (spec.garraHoz > 0) {
    // Garra de hoz (dromeosaurios): dedo levantado con uña curva.
    garra(l, Math.round(pieDel.x + 2), pieDel.y - 4, 2, GARRA)
  }

  // Brazos.
  const largoBrazo = spec.brazos === 'cortos' ? 4.2 : spec.brazos === 'largos' ? 9 : 6
  const anguloBrazo = spec.brazos === 'cortos' ? 1.05 : spec.brazos === 'largos' ? 0.55 : 0.75
  mano(l, pecho.x - 1, pecho.y + 3, largoBrazo * 0.75, anguloBrazo + 0.25, { v: TRASERO })
  mano(l, pecho.x + 1.5, pecho.y + 3.5, largoBrazo, anguloBrazo, {
    garras: spec.garrasGrandes > 0 ? 3 : 2,
  })
  if (spec.garrasGrandes > 0) {
    const gx = pecho.x + 1.5 + Math.cos(anguloBrazo) * largoBrazo
    const gy = pecho.y + 3.5 + Math.sin(anguloBrazo) * largoBrazo
    garra(l, Math.round(gx) + 1, Math.round(gy), 3, GARRA)
  }

  // Cuello.
  const cuelloPts = curvaPuntos(
    pecho.x + 1.5,
    pecho.y - 2.5,
    cabeza.x - 6 * spec.factorCabeza,
    cabeza.y + 2,
    -1,
    tendido ? -1 : -3.5 - spec.cuelloLargo * 4,
    4
  )
  cadena(l, cuelloPts, 3.8, 3, CUERPO)

  // Vela dorsal (espinosaurio, ouranosaurus).
  if (spec.vela > 0) {
    const n = 7
    for (let i = 0; i < n; i++) {
      const px = 25 + i * 3.1
      const py = 31.5 - i * 0.72 + dyT
      const altura = (5 + Math.sin((i / (n - 1)) * Math.PI) * 7) * (0.55 + 0.45 * spec.vela)
      l.tri(px - 1.8, py, px + 1.8, py, px, py - altura, ACENTO)
    }
  }

  // Cabeza.
  dibujarCabeza(l, cabeza.x, cabeza.y, spec, pose)

  // Plumas en la punta de la cola.
  if (spec.plumas > 0.3 || spec.filoplumasCola) {
    const [tx, ty] = colaPts[colaPts.length - 1]
    l.tri(tx - 1, ty - 2.2, tx + 2.5, ty, tx - 1, ty + 2.2, ACENTO)
  }
  void paleta
}
