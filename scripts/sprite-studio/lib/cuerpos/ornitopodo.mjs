// Ornitópodos: base, hadrosaurio (pico de pato + cresta), iguanodonte (pulgar),
// pequeno (corredor ligero), paquicefalo (cúpula) y vela (ouranosaurus).
// Bípedos elegantes y de cuerpo más masivo que los terópodos pequeños.
// Ver references/04-cuerpos-y-variantes.md.
import { ACENTO, BOCA, BORDE, CUERNO, CUERPO, PICO, TRASERO } from '../pixel.mjs'
import { boca, cadena, ceja, curvaPuntos, garra, mano, ojoAbierto, ojoCerrado, ojoFeliz, ojoMareo, pata } from '../rig.mjs'
import { clasificar } from '../taxonomia.mjs'

export function preparar(dino, rasgos, ale) {
  const variacion = ale()
  const { variante } = clasificar(dino)
  return {
    // El corredor ligero (hypsilophodon y parientes) va más esbelto y con la
    // cola rígida; la variante base mantiene el cuerpo de ornitópodo medio.
    corredor: variante === 'pequeno' ? 1 : 0,
    masivo: rasgos.pulgar ? 1 : 0,
    pico: rasgos.pico ?? 'ninguno',
    cresta: rasgos.cresta ?? 'ninguna',
    cupula: rasgos.cupula ? 1 : 0,
    pulgar: rasgos.pulgar ? 1 : 0,
    vela: rasgos.vela ?? 0,
    variacion,
  }
}

// Cuánto puede sobresalir el morro (pico incluido) a la derecha del centro de
// la cabeza, para que nada toque el borde del lienzo en la embestida.
function alcanceMorro(spec) {
  return spec.pico === 'pato' ? 10 : 7
}

function dibujarCabeza(l, cx, cy, spec, pose) {
  const f = spec.corredor ? 0.94 : 1
  const hocico = spec.corredor ? 5.4 : 6
  const rx = 6 * f
  const ry = 5.2 * f

  // Cráneo + hocico de herbívoro.
  l.elipse(cx, cy, rx, ry, CUERPO)
  l.segmento(cx + 2, cy - 0.6 * f, cx + hocico * 0.8, cy + 0.6 * f, 3.4 * f, 2.1 * f, CUERPO)
  l.elipse(cx + hocico * 0.8, cy + 0.7 * f, 2.1 * f, 1.9 * f, CUERPO)

  // Fosa nasal.
  l.punto(cx + hocico * 0.62, cy - 0.2 * f, BORDE)

  // Ojo.
  const ojoX = Math.round(cx - 0.5)
  const ojoY = Math.round(cy - 2.2 * f)
  if (pose.ojo === 'abierto') ojoAbierto(l, ojoX, ojoY, 3, 2)
  else if (pose.ojo === 'cerrado') ojoCerrado(l, ojoX, ojoY, 3)
  else if (pose.ojo === 'feliz') ojoFeliz(l, ojoX, ojoY, 3)
  else if (pose.ojo === 'mareo') ojoMareo(l, ojoX, ojoY)
  else if (pose.ojo === 'enfadado') {
    ojoAbierto(l, ojoX, ojoY, 3, 2)
    ceja(l, ojoX - 1, ojoY - 2, 4, -1)
  }

  // Cúpula del paquicefalo + collar de bultos en la nuca.
  if (spec.cupula) {
    l.elipse(cx - 1, cy - ry - 0.2, 4.2, 2.6, ACENTO)
    l.disco(cx - 4.5, cy + 1.5, 1.5, ACENTO)
    l.disco(cx - 6.2, cy + 3.4, 1.3, ACENTO)
    l.disco(cx - 2.6, cy - 0.4, 1.4, ACENTO)
  }

  // Crestas de hadrosaurio (tubo, casco, hacha, cuerno, pincho).
  if (spec.cresta === 'tubo') {
    // Parasaurolophus: tubo largo hacia atrás sobre el cuello.
    const pts = curvaPuntos(cx - 1.5, cy - ry + 1.2, cx - 10, cy - ry - 1, -2.5, -3.5, 5)
    cadena(l, pts, 2.3, 1.2, ACENTO)
    l.disco(cx - 10, cy - ry - 1, 1.4, ACENTO)
  } else if (spec.cresta === 'casco') {
    // Corythosaurus: casco redondeado que cae hacia la nuca.
    l.elipse(cx - 2, cy - ry + 0.6, 4.4, 3.2, ACENTO)
  } else if (spec.cresta === 'hacha') {
    // Lambeosaurus: hacha plana inclinada hacia atrás.
    l.poligono(
      [
        [cx - 0.5, cy - ry + 1.5],
        [cx - 3.5, cy - ry - 5],
        [cx - 7, cy - ry - 3.5],
        [cx - 4.5, cy - ry + 1.5],
      ],
      ACENTO
    )
  } else if (spec.cresta === 'cuerno') {
    // Tsintaosaurus: cuerno fino hacia arriba y adelante.
    l.segmento(cx - 0.5, cy - ry + 1, cx + 1.5, cy - ry - 5, 1.7, 0.9, ACENTO)
  } else if (spec.cresta === 'pincho') {
    // Saurolophus: pincho recto y fino hacia atrás.
    l.segmento(cx - 2, cy - ry + 1, cx - 4.5, cy - ry - 3.5, 1.6, 0.7, ACENTO)
  }

  // Pico de pato (hadrosaurios, iguanodonte, ouranosaurus) o boca simple.
  if (spec.pico === 'pato') {
    const bx = cx + hocico * 0.5
    l.segmento(bx, cy + 0.4 * f, bx + 4.4, cy + 1.3 * f, 2.7, 2.3, PICO)
    if (pose.boca) l.rect(bx - 1, Math.round(cy + 2.2 * f), 5, 2, BOCA)
    else l.linea(bx - 1, cy + 2.5 * f, bx + 3.8, cy + 2.8 * f, BORDE)
  } else {
    // Herbívoro sin pico marcado: boca cerrada o abierta, sin dientes.
    boca(l, cx + 2, cy + 2.3 * f, pose.boca, { ancho: Math.round(hocico * 0.7), alto: 2, dientes: 'ninguno' })
  }
}

function lift(fase) {
  return Math.max(0, 1 - Math.abs(fase) * 2.2) * 2
}

export function dibujar(l, pose, spec, paleta) {
  const doblada = pose.doblada
  const tendido = doblada > 0.6 && pose.inclina > 0.6
  const sentado = doblada > 0.6 && pose.inclina <= 0.6
  const dyDob = sentado ? doblada * 8 : tendido ? doblada * 10 : doblada * 6
  const dyT = -pose.bob + dyDob
  const inclina = pose.inclina
  const esb = spec.corredor
  const gordo = spec.masivo ? 0.9 : 0

  // Anclajes del esqueleto.
  const cadera = { x: 24, y: 42 + dyT }
  const pecho = { x: 36 + inclina * 1.5, y: 37 + dyT }
  const cabeza = {
    x: 47.5 + inclina * 4 + pose.cuello * 3 + pose.cabeza - doblada * 2,
    y:
      26 +
      dyT * 1.15 +
      inclina * 1.5 -
      pose.cuello * 2.5 +
      pose.cabeza * 1.6 +
      (tendido ? 4 : sentado ? 1.5 : 0),
  }
  cabeza.x = Math.min(cabeza.x, 58.5 - alcanceMorro(spec))

  // Cola: gruesa en la base y caída en curva; el corredor la lleva rígida.
  const colaBase = tendido || sentado ? { x: cadera.x - 1, y: cadera.y + 2 } : { x: cadera.x, y: cadera.y + 1 }
  const colaPts = curvaPuntos(
    colaBase.x,
    colaBase.y,
    esb ? 5.5 : 6.5,
    (tendido || sentado ? 54 : esb ? 38 : 33.5 + spec.variacion * 2) + dyT * 0.4,
    -4,
    tendido || sentado ? 3 : esb ? 4 : 8,
    7
  )
  for (let i = 0; i < colaPts.length; i++) {
    colaPts[i][1] += pose.cola * Math.sin((i / (colaPts.length - 1)) * Math.PI) * (esb ? 1.4 : 2.8)
  }
  cadena(l, colaPts, esb ? 3.6 : 4.4, esb ? 1.2 : 1.7, CUERPO)

  // Patas (más gruesas que en los terópodos, de herbívoro).
  const liftTra = lift(pose.pataTra)
  const liftDel = lift(pose.pataDel)
  const pieTra = tendido
    ? { x: 20, y: 60 }
    : sentado
      ? { x: 22.5, y: 60 }
      : { x: 20 + pose.pataTra * 3.6 - doblada * 2, y: 60 - liftTra }
  const pieDel = tendido
    ? { x: 40, y: 60 }
    : sentado
      ? { x: 35, y: 60 }
      : { x: 33.5 + pose.pataDel * 3.6 - doblada * 2, y: 60 - liftDel }
  const caderaTra = { x: cadera.x - 2.5, y: sentado ? cadera.y : tendido ? cadera.y - 1 : cadera.y + 2 }
  const caderaDel = { x: cadera.x + 5.5, y: sentado ? cadera.y - 1 : tendido ? cadera.y - 1 : cadera.y + 1.5 }

  pata(l, caderaTra.x, caderaTra.y, pieTra.x, pieTra.y, { grosor: esb ? 2.9 : 3.4 + gordo * 0.2, v: TRASERO })

  // Torso voluminoso (vientre + pecho + cadera).
  l.elipse(
    (cadera.x + pecho.x) / 2,
    (cadera.y + pecho.y) / 2 + dyDob * 0.1,
    esb ? 8.2 : 9.6 + gordo * 0.6,
    esb ? 6.9 : 7.6 + gordo * 0.4,
    CUERPO
  )
  l.elipse(pecho.x, pecho.y, esb ? 6.8 : 7.6 + gordo * 0.5, esb ? 6.2 : 7 + gordo * 0.4, CUERPO)
  l.elipse(cadera.x, cadera.y, esb ? 6 : 6.8 + gordo * 0.4, esb ? 6 : 6.8 + gordo * 0.4, CUERPO)

  // Pata cercana (delante del torso) con línea de separación.
  pata(l, caderaDel.x, caderaDel.y, pieDel.x, pieDel.y, {
    grosor: esb ? 3.2 : 3.8 + gordo * 0.3,
    pieRx: esb ? 2.5 : 2.9 + gordo * 0.2,
    pieRy: 1.6,
  })
  l.linea(caderaDel.x + 2.2, caderaDel.y + 1, pieDel.x + 2.2, pieDel.y - 3, BORDE)

  // Brazos (el iguanodonte lleva púa de pulgar en la mano cercana).
  const largoBrazo = esb ? 4.6 : 5.4
  const anguloBrazo = esb ? 0.85 : 0.75
  mano(l, pecho.x - 1, pecho.y + 2.5, largoBrazo * 0.7, anguloBrazo + 0.25, { v: TRASERO })
  mano(l, pecho.x + 1.5, pecho.y + 3, largoBrazo, anguloBrazo, { garras: 0 })
  if (spec.pulgar) {
    const hx = pecho.x + 1.5 + Math.cos(anguloBrazo) * largoBrazo
    const hy = pecho.y + 3 + Math.sin(anguloBrazo) * largoBrazo
    garra(l, Math.round(hx), Math.round(hy) - 1, 2, CUERNO)
  }

  // Cuello (más grueso y corto que el de un terópodo).
  const cuelloPts = curvaPuntos(
    pecho.x + 1,
    pecho.y - 2.5,
    cabeza.x - 5.5,
    cabeza.y + 2,
    -1,
    tendido ? -1 : -3,
    4
  )
  cadena(l, cuelloPts, esb ? 3.2 : 3.9, esb ? 2.6 : 3.1, CUERPO)

  // Vela dorsal (ouranosaurus): púas separadas que nacen del lomo.
  if (spec.vela > 0) {
    const n = 6
    for (let i = 0; i < n; i++) {
      const px = 22.5 + i * 3.3
      const py = 33.4 + dyT - i * 0.7
      const altura = (5.5 + Math.sin((i / (n - 1)) * Math.PI) * 7.5) * (0.55 + 0.45 * spec.vela)
      l.tri(px - 1.3, py + 1.8, px + 1.3, py + 1.8, px, py - altura, ACENTO)
    }
  }

  // Cabeza.
  dibujarCabeza(l, cabeza.x, cabeza.y, spec, pose)
  void paleta
}
