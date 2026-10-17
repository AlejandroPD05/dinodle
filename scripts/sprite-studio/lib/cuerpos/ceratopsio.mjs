// Ceratopsios: ceratopsido (gola grande + cuernos 'tres'), protoceratópsido (gola
// media + bultos), psitacosaurio (bípedo, pico loro, sin gola) y base (gola media +
// cuernos suaves). Cuadrúpedos macizos salvo el psitacosaurio, que va de pie.
// Ver references/04-cuerpos-y-variantes.md.
import { ACENTO, BOCA, BORDE, CUERNO, CUERPO, DIENTE, GARRA, OJO, PICO, PUPILA, TRASERO } from '../pixel.mjs'
import { cadena, ceja, curvaPuntos, garra, mano, ojoFeliz, ojoCerrado, ojoMareo, pata } from '../rig.mjs'

// Sabor por slug (determinista y opcional): los ceratopsios más icónicos del
// catálogo se distinguen sin salirse del arquetipo.
const EXTRAS_POR_SLUG = {
  styracosaurus: { puntasGola: 5, largoBrow: 4.6, largoNariz: 6.6 },
  einiosaurus: { cuernoGancho: 1, largoNariz: 5.4 },
  pachyrhinosaurus: { cuernos: 'bultos' },
  torosaurus: { golaExtra: 0.14 },
  pentaceratops: { golaExtra: 0.14 },
}

/** Una vez por dinosaurio. Aquí (y solo aquí) se puede consumir `ale`. */
export function preparar(dino, rasgos, ale) {
  const variacion = ale()
  const extra = EXTRAS_POR_SLUG[dino.slug] ?? {}
  const bipedo = rasgos.semibipedo === 1 || rasgos.semibipedo === true

  // Gola: 1.0 ceratopsido, 0.7 base, 0.6 protoceratópsido, 0 psitacosaurio.
  let gola = rasgos.gola !== undefined ? rasgos.gola : 0.7
  if (extra.golaExtra) gola += extra.golaExtra
  const cuernos = extra.cuernos ?? rasgos.cuernos ?? 'suaves'
  const pico = rasgos.pico ?? 'rapaz'

  // Cuernos: largo del par supraocular y del nasal (0 = sin cuerno).
  const tres = cuernos === 'tres'
  const suaves = cuernos === 'suaves' || cuernos === 'cejas'
  let largoBrow = tres ? 7.5 : suaves ? 4.4 : 0
  let largoNariz = tres ? 4.2 : suaves ? 2.8 : 0
  if (cuernos === 'nariz') {
    largoBrow = 0
    largoNariz = 4.2
  }
  if (extra.largoBrow !== undefined) largoBrow = extra.largoBrow
  if (extra.largoNariz !== undefined) largoNariz = extra.largoNariz

  // Escudo circular ACENTO de 17–25px de diámetro detrás de la cabeza.
  const radioGola = gola > 0 ? 2.4 + 9.8 * gola + (variacion - 0.5) * 0.5 : 0
  // El disco va de la nuca (delante, sin asomar entre los cuernos) al lomo (detrás).
  const abierto = Math.min(gola, 1)
  return {
    bipedo,
    gola,
    radioGola,
    golaA0: 1.28 + (1 - abierto) * 0.2,
    golaA1: 3.95 - (1 - abierto) * 0.25,
    puntasGola: extra.puntasGola ?? 0,
    cuernos,
    cuernoGancho: extra.cuernoGancho ?? 0,
    largoBrow,
    largoNariz,
    pico,
    ojoGrande: pico === 'loro', // mirada curiosa del psitacosaurio
    dientes: rasgos.dientes ?? 'ninguno',
    // Compensación: a gola pequeña le sienta bien una cabeza algo mayor.
    factorCabeza: (gola <= 0.65 ? 1.05 : 1) * (variacion > 0.8 ? 1.02 : 1),
    anchoCuerpo: gola >= 1 ? 1.06 : gola >= 0.68 ? 1 : 0.95,
    colaCaida: (variacion - 0.5) * 1.6,
    variacion,
  }
}

function lift(fase) {
  return Math.max(0, 1 - Math.abs(fase) * 2.2) * 2
}

// Gola: escudo ACENTO redondo con una vaina interior que lo separa del cráneo y
// una púa por slug. Se dibuja ANTES del cráneo, que tapa el centro y deja ver el
// escudo por detrás y por arriba: hueso, no melena (el borde va liso).
function dibujarGola(l, cx, cy, spec, tendido) {
  if (spec.radioGola <= 0) return
  // Echado el escudo se ve casi de canto: más chico y volcado sobre el lomo.
  const R = tendido ? spec.radioGola * 0.72 : spec.radioGola
  const fcx = cx - 4.5
  // A gola chica el disco baja para apoyar la punta en el lomo (no flota).
  const fcy = tendido ? cy - 2 : cy + 2 + Math.max(0, 12.1 - R) * 0.6
  const pts = [[fcx, fcy]]
  const n = 18
  for (let i = 0; i <= n; i++) {
    const a = spec.golaA0 + ((spec.golaA1 - spec.golaA0) * i) / n
    pts.push([fcx + Math.cos(a) * R, fcy - Math.sin(a) * R])
  }
  // Bisel de la punta inferior (que no quede un pico).
  const aB = spec.golaA1 + 0.16
  pts.push([fcx + Math.cos(aB) * (R - 1.8), fcy - Math.sin(aB) * (R - 1.8)])
  l.poligono(pts, ACENTO)

  // Vaina interior del escudo.
  const rim = []
  for (let a = spec.golaA0 + 0.12; a <= spec.golaA1 - 0.2; a += 0.16) {
    rim.push([fcx + Math.cos(a) * (R - 2.6), fcy - Math.sin(a) * (R - 2.6)])
  }
  l.trazo(rim, BORDE)

  // Puntas óseas del borde (styracosaurus).
  const nP = spec.puntasGola
  for (let i = 0; i < nP; i++) {
    const a = spec.golaA0 + 0.55 + ((spec.golaA1 - spec.golaA0 - 1.1) * i) / Math.max(1, nP - 1)
    const ux = Math.cos(a)
    const uy = -Math.sin(a)
    const bx = fcx + ux * (R - 0.5)
    const by = fcy + uy * (R - 0.5)
    l.tri(bx + uy * 1.6, by - ux * 1.6, bx - uy * 1.6, by + ux * 1.6, fcx + ux * (R + 3.2), fcy + uy * (R + 3.2), CUERNO)
  }
}

// Pico: cuña PICO corta y ganchuda al frente del hocico (ceratopsios). 'loro' la
// alza y redondea (psitacosaurio). `pose.boca` lo abre y deja caer la mandíbula.
function dibujarPico(l, cx, cy, spec, pose) {
  const alto = spec.pico === 'loro' ? 1.8 : 0
  l.poligono(
    [
      [cx + 5.8, cy + 0.4 - alto], // raíz, a la altura del ojo
      [cx + 9.6, cy + 2.6 - alto], // lomo del pico
      [cx + 10.6, cy + 4], // punta
      [cx + 9.8, cy + 6.2], // gancho
      [cx + 4.6, cy + 4.4], // comisura de la boca
    ],
    PICO
  )
  if (pose.boca > 0.5) {
    l.poligono(
      [
        [cx + 4.6, cy + 4.4],
        [cx + 10, cy + 5.2],
        [cx + 9.2, cy + 7.4],
        [cx + 4.6, cy + 6.4],
      ],
      BOCA
    )
    l.poligono(
      [
        [cx + 4.6, cy + 6.4],
        [cx + 9.4, cy + 6.8],
        [cx + 8.2, cy + 9.4],
        [cx + 4.4, cy + 8.6],
      ],
      PICO
    )
    if (spec.dientes !== 'ninguno') l.punto(cx + 6.4, cy + 5.4, DIENTE)
  } else {
    // Costura del pico: marca dónde cierra la mandíbula.
    l.linea(cx + 4.6, cy + 4.6, cx + 8, cy + 5, BORDE)
    l.linea(cx + 8, cy + 5, cx + 9.8, cy + 6.2, BORDE)
  }
}

function dibujarCuernos(l, cx, cy, spec, pose) {
  const giro = pose.inclina * 0.35 // en la embestida los cuernos bajan hacia delante
  if (spec.cuernos === 'bultos') {
    l.disco(cx + 2.2, cy - 6.6, 2.4, CUERNO) // bulto supraocular cercano
    l.disco(cx - 1.8, cy - 6.2, 2, CUERNO) // bulto supraocular lejano
    l.disco(cx + 6.6, cy - 2.6, 2, CUERNO) // bulto nasal
    return
  }
  if (spec.cuernos === 'ninguno') return
  const lB = spec.largoBrow
  if (lB > 0) {
    // Cuerno supraocular lejano: más atrás, casi vertical y más corto.
    const lF = lB * 0.82
    const aF = 1.5 - giro * 0.5
    l.segmento(cx - 2.2, cy - 5.6, cx - 2.2 + Math.cos(aF) * lF, cy - 5.6 - Math.sin(aF) * lF, 1, 0.3, CUERNO)
    // Cuerno supraocular cercano: sobre el ojo, inclinado hacia delante.
    const aC = 1.15 - giro
    l.segmento(cx + 2.8, cy - 6.4, cx + 2.8 + Math.cos(aC) * lB, cy - 6.4 - Math.sin(aC) * lB, 1.25, 0.35, CUERNO)
  }
  // Cuerno nasal recto hacia arriba, o en gancho hacia delante (einiosaurus).
  if (spec.cuernoGancho) {
    l.segmento(cx + 6.4, cy - 0.8, cx + 7.6, cy - 4.8, 1.5, 1, CUERNO)
    l.segmento(cx + 7.6, cy - 4.8, cx + 10, cy - 3.6, 1, 0.4, CUERNO)
  } else if (spec.largoNariz > 0) {
    l.segmento(cx + 6.8, cy - 1, cx + 7.2, cy - 1.2 - spec.largoNariz, 1.5, 0.55, CUERNO)
  }
}

function dibujarOjo(l, cx, cy, spec, pose) {
  const ancho = spec.ojoGrande ? 4 : 3
  const x = Math.round(cx + (spec.ojoGrande ? 1.4 : 2.2) * spec.factorCabeza)
  const y = Math.round(cy - 2.6 * spec.factorCabeza)
  if (pose.ojo === 'cerrado') return ojoCerrado(l, x, y + 1, 4)
  if (pose.ojo === 'feliz') return ojoFeliz(l, x, y + 1, ancho)
  if (pose.ojo === 'mareo') return ojoMareo(l, x, y + 1)
  // abierto | enfadado: hueso con pupila al frente (se pinta al final, nunca se tapa).
  l.rect(x, y, ancho, 3, OJO)
  l.rect(x + ancho - 1, y, 1, 3, PUPILA)
  if (pose.ojo === 'enfadado') ceja(l, x - 1, y - 2, 4, -1)
}

// Cabeza: gola → cráneo → hocico → pico → cuernos → detalle → ojo.
function dibujarCabeza(l, cx, cy, spec, pose) {
  const f = spec.factorCabeza
  const tendido = pose.doblada > 0.6 && pose.inclina > 0.6
  dibujarGola(l, cx, cy, spec, tendido)

  // Cráneo profundo y hocico macizo de ceratopsio.
  l.elipse(cx, cy, 8.4 * f, 7.6 * f, CUERPO)
  l.segmento(cx + 3.6 * f, cy + 0.4 * f, cx + 7.8 * f, cy + 1.8 * f, 4.4 * f, 3 * f, CUERPO)
  l.segmento(cx + 2.6 * f, cy + 4.6 * f, cx + 6.6 * f, cy + 5.2 * f, 3.2 * f, 2.4 * f, CUERPO)

  dibujarPico(l, cx, cy, spec, pose)
  dibujarCuernos(l, cx, cy, spec, pose)

  // Costura cráneo/gola: separación interna para que el escudo no sea una melena.
  const cosPts = []
  for (let a = 1.7; a <= 3.2; a += 0.19) {
    cosPts.push([cx + Math.cos(a) * (8.4 * f + 0.7), cy - Math.sin(a) * (7.6 * f + 0.7)])
  }
  l.trazo(cosPts, BORDE)
  dibujarOjo(l, cx, cy, spec, pose)
}

function dibujarCuadrupedo(l, pose, spec) {
  const doblada = pose.doblada
  const tendido = doblada > 0.6 && pose.inclina > 0.6
  const sentado = doblada > 0.6 && !tendido
  const dyDob = tendido ? 7.5 : sentado ? 7 : doblada * 7
  const dyT = -pose.bob + dyDob
  const inclina = pose.inclina
  const b = spec.anchoCuerpo
  const aplana = tendido ? 0.7 : sentado ? 0.94 : 1
  const dyCuerpo = tendido ? 0.8 : 0

  // Esqueleto: cuerpo compacto bajo una cabeza enorme (el retrato).
  const cadera = { x: 21, y: 43.5 + dyT }
  const hombro = { x: 33 + inclina * 2.2, y: 41 + dyT + inclina * 1.4 }
  let cabX = 40 + inclina * 3 + pose.cuello * 2
  let cabY = 26 + dyT * 0.8 + inclina * 2.6 - pose.cuello * 1.2 - pose.cabeza * 1.8
  if (sentado) {
    cabX -= 3
    cabY += 4
  }
  if (tendido) {
    cabX -= 2.5
    cabY += 16
  }
  cabX = Math.min(cabX, 49.5) // el pico nunca toca el borde
  const cabeza = { x: cabX, y: cabY }

  // Patas: cuatro apoyadas; cercanas con CUERPO, lejanas con TRASERO.
  // Marcha diagonal: delantera cercana y trasera lejana comparten fase.
  const paso = 2.8
  const liftDel = lift(pose.pataDel)
  const liftTra = lift(pose.pataTra)
  const pieTrasCer = tendido
    ? { x: 14, y: 60 }
    : sentado
      ? { x: 15, y: 60 }
      : { x: 19.5 + pose.pataTra * paso, y: 60 - liftTra }
  const pieDelCer = tendido
    ? { x: 42, y: 60 }
    : sentado
      ? { x: 36, y: 60 }
      : { x: 32.5 + pose.pataDel * paso, y: 60 - liftDel }
  const pieTrasLej = tendido
    ? { x: 16.5, y: 60 }
    : { x: 17 + pose.pataDel * paso * 0.85, y: 60 - liftDel * 0.85 }
  const pieDelLej = tendido
    ? { x: 38.5, y: 60 }
    : { x: 29.5 + pose.pataTra * paso * 0.85, y: 60 - liftTra * 0.85 }

  const caderaLej = { x: cadera.x - 1.8, y: cadera.y + 1.5 }
  const hombroLej = { x: hombro.x - 1.8, y: hombro.y + 2 }
  pata(l, caderaLej.x, caderaLej.y, pieTrasLej.x, pieTrasLej.y, {
    grosor: 3.8,
    v: TRASERO,
    pieRx: 2.6,
    pieRy: 1.4,
  })
  pata(l, hombroLej.x, hombroLej.y, pieDelLej.x, pieDelLej.y, {
    grosor: 3.6,
    v: TRASERO,
    pieRx: 2.6,
    pieRy: 1.4,
  })

  // Cola: corta, gruesa y caída (los ceratopsios la llevan así).
  const colaPts = curvaPuntos(
    cadera.x - 2,
    cadera.y - 1.5,
    8 + (tendido ? 1.5 : 0),
    (tendido || sentado ? 47 : 45) + dyT * 0.65 + spec.colaCaida,
    -1,
    sentado ? -1 : 2.5,
    7
  )
  for (let i = 0; i < colaPts.length; i++) {
    colaPts[i][1] += pose.cola * Math.sin((i / (colaPts.length - 1)) * Math.PI) * 2.2
  }
  cadena(l, colaPts, 4.4, 1.8, CUERPO)

  // Cuerpo macizo: grupa + barriga + pecho (aplanado en las poses bajas).
  l.elipse(cadera.x, cadera.y - 1.5 + dyCuerpo, 7.4 * b, 7.2 * b * aplana, CUERPO)
  l.elipse(26.5, 44 + dyT + dyCuerpo, 9 * b, 8.6 * b * aplana, CUERPO)
  l.elipse(hombro.x, hombro.y + 1.5 + dyCuerpo, 7.6 * b, 7.4 * b * aplana, CUERPO)

  // Cuello grueso y corto (la gola lo tapa en parte).
  const cuelloPts = curvaPuntos(hombro.x + 1, hombro.y - 3, cabeza.x - 4.5, cabeza.y + 4, 0.5, -2, 4)
  cadena(l, cuelloPts, 5.4, 4.6, CUERPO)

  dibujarCabeza(l, cabeza.x, cabeza.y, spec, pose)

  // Patas cercanas encima, con línea de separación y garritas.
  pata(l, cadera.x + 2.5, cadera.y + 1, pieTrasCer.x, pieTrasCer.y, {
    grosor: 4.2,
    pieRx: 3,
    pieRy: 1.8,
  })
  l.linea(pieTrasCer.x - 2.4, cadera.y + 2, pieTrasCer.x - 1.2, pieTrasCer.y - 2.5, BORDE)
  pata(l, hombro.x + 2.5, hombro.y + 1.5, pieDelCer.x, pieDelCer.y, {
    grosor: 4.2,
    pieRx: 3,
    pieRy: 1.8,
  })
  l.linea(pieDelCer.x - 2.4, hombro.y + 2.5, pieDelCer.x - 1.2, pieDelCer.y - 2.5, BORDE)
  garra(l, Math.round(pieTrasCer.x + 3), pieTrasCer.y - 2, 1, GARRA)
  garra(l, Math.round(pieDelCer.x + 3), pieDelCer.y - 2, 1, GARRA)
}

// Psitacosaurio: bípedo esbelto, sin gola, cola larga y pico de loro.
function dibujarBipedo(l, pose, spec) {
  const doblada = pose.doblada
  const tendido = doblada > 0.6 && pose.inclina > 0.6
  const sentado = doblada > 0.6 && !tendido
  const dyDob = tendido ? 8 : sentado ? 12 : doblada * 6
  const dyT = -pose.bob + dyDob
  const inclina = pose.inclina

  const cadera = { x: 25, y: 42 + dyT }
  const pecho = { x: 34 + inclina * 2.2, y: 33.5 + dyT + inclina * 1.4 }
  let cabX = 43 + inclina * 3.5 + pose.cuello * 2.5 - doblada * 2
  const cabY = 20.5 + dyT * 0.9 + inclina * 2.4 - pose.cuello * 2 + (tendido ? 17 : sentado ? 4 : 0)
  cabX = Math.min(cabX, 49.5) // el pico nunca toca el borde
  const cabeza = { x: cabX, y: cabY }

  // Patas de bípedo.
  const liftTra = lift(pose.pataTra)
  const liftDel = lift(pose.pataDel)
  const pieTra = tendido
    ? { x: 18, y: 60 }
    : sentado
      ? { x: 20, y: 60 }
      : { x: 22 + pose.pataTra * 3.4, y: 60 - liftTra }
  const pieDel = tendido
    ? { x: 41, y: 60 }
    : sentado
      ? { x: 34, y: 60 }
      : { x: 34 + pose.pataDel * 3.4, y: 60 - liftDel }
  pata(l, cadera.x - 2.5, sentado ? 48 : cadera.y + 2, pieTra.x, pieTra.y, {
    grosor: 3.6,
    v: TRASERO,
    pieRx: 2.4,
    pieRy: 1.4,
  })

  // Cola larga y fina, ligeramente alzada.
  const colaPts = curvaPuntos(
    cadera.x - 2,
    cadera.y - 1,
    6.5,
    (tendido || sentado ? 46 : 38) + dyT * 0.6 + spec.colaCaida,
    0,
    tendido || sentado ? 6 : -3.5,
    6
  )
  for (let i = 0; i < colaPts.length; i++) {
    colaPts[i][1] += pose.cola * Math.sin((i / (colaPts.length - 1)) * Math.PI) * 3
  }
  cadena(l, colaPts, 3.4, 1.2, CUERPO)

  // Cuerpo.
  l.elipse((cadera.x + pecho.x) / 2, (cadera.y + pecho.y) / 2 + dyDob * 0.12, 8.8, 9.6, CUERPO)
  l.elipse(pecho.x, pecho.y, 8, 7.6, CUERPO)
  l.elipse(cadera.x, cadera.y, 7.4, 7.2, CUERPO)

  // Brazos cortos con dos garritas (el cercano asoma del bulto de la barriga).
  mano(l, pecho.x - 0.5, pecho.y + 3, 5, 0.75, { v: TRASERO })
  mano(l, pecho.x + 1.5, pecho.y + 3.2, 5.4, 0.62, { garras: 2 })
  l.linea(pecho.x + 1, pecho.y + 4.8, pecho.x + 4.6, pecho.y + 6.2, BORDE)

  // Cuello.
  const cuelloPts = curvaPuntos(pecho.x + 1.5, pecho.y - 3, cabeza.x - 4.5, cabeza.y + 3, -0.5, -3, 4)
  cadena(l, cuelloPts, 4, 3.4, CUERPO)

  // Cabeza sin gola.
  dibujarCabeza(l, cabeza.x, cabeza.y, { ...spec, factorCabeza: spec.factorCabeza * 0.96 }, pose)

  // Pata cercana encima.
  pata(l, cadera.x + 2.5, sentado ? 48 : cadera.y + 1.5, pieDel.x, pieDel.y, {
    grosor: 4,
    pieRx: 2.8,
    pieRy: 1.8,
  })
  l.linea(cadera.x + 4.4, cadera.y + 3, pieDel.x + 1.4, pieDel.y - 3, BORDE)
  garra(l, Math.round(pieDel.x + 3), pieDel.y - 2, 1, GARRA)
}

export function dibujar(l, pose, spec, paleta) {
  if (spec.bipedo) dibujarBipedo(l, pose, spec)
  else dibujarCuadrupedo(l, pose, spec)
  void paleta
}
