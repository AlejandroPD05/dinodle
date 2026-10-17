// Las 6 animaciones del catálogo. poseDe es analítica: sin azar, mismos valores
// para todos los dinosaurios (ver references/03-animaciones.md).
import { BORDE, OJO } from './pixel.mjs'

export const ORDEN_ANIMACIONES = ['idle', 'walk', 'attack', 'hurt', 'sleep', 'faint']

export const ANIMACIONES = {
  idle: { fps: 6, frames: 4 },
  walk: { fps: 10, frames: 6 },
  attack: { fps: 12, frames: 6 },
  hurt: { fps: 12, frames: 2 },
  sleep: { fps: 4, frames: 4 },
  faint: { fps: 8, frames: 6 },
}

function pose(extra = {}) {
  return {
    bob: 0,
    inclina: 0,
    cuello: 0,
    cabeza: 0,
    cola: 0,
    pataDel: 0,
    pataTra: 0,
    doblada: 0,
    boca: 0,
    ojo: 'abierto',
    ...extra,
  }
}

const PASOS_WALK_DEL = [0.8, 0.24, -0.6, -0.8, -0.24, 0.6]
const PASOS_WALK_TRA = [-0.8, -0.24, 0.6, 0.8, 0.24, -0.6]
const BOB_WALK = [0, 0.7, 1, 0, 0.7, 1]

export function poseDe(anim, i) {
  switch (anim) {
    case 'idle':
      if (i === 1) return pose({ bob: 1, cuello: 0.15, cola: 0.4 })
      if (i === 3) return pose({ bob: -1, cola: -0.4, ojo: 'cerrado' })
      return pose()

    case 'walk':
      return pose({
        bob: BOB_WALK[i],
        pataDel: PASOS_WALK_DEL[i],
        pataTra: PASOS_WALK_TRA[i],
        cola: [0.35, 0, -0.35, 0.35, 0, -0.35][i],
        cuello: [0.12, 0, -0.12, 0.12, 0, -0.12][i],
      })

    case 'attack': {
      const poses = [
        pose(),
        pose({ inclina: -0.5, bob: -1, boca: 1, cola: -0.5 }),
        pose({ inclina: 0.8, bob: 1, cuello: 0.5, boca: 1, cola: 0.6 }),
        pose({ inclina: 1, cabeza: -0.3, boca: 1, cola: 0.4, pataDel: 0.4 }),
        pose({ inclina: 0.3, boca: 0, cola: -0.2 }),
        pose({ inclina: 0.1 }),
      ]
      return poses[i]
    }

    case 'hurt':
      return i === 0
        ? pose({ inclina: -0.6, bob: -1, cola: 0.5, ojo: 'cerrado', boca: 1 })
        : pose({ inclina: -0.2, bob: 0.5, ojo: 'cerrado' })

    case 'sleep':
      return pose({
        doblada: 1,
        bob: [0, -0.5, 0, -0.5][i],
        ojo: 'cerrado',
        cola: [0.2, 0, -0.2, 0][i],
      })

    case 'faint': {
      const tendido = pose({ doblada: 1, inclina: 1, bob: -2, ojo: 'mareo', cola: -0.4 })
      const poses = [
        pose({ inclina: -0.3, ojo: 'mareo' }),
        pose({ doblada: 0.5, inclina: 0.5, cola: 0.2 }),
        tendido,
        tendido,
        tendido,
        tendido,
      ]
      return poses[i]
    }

    default:
      return pose()
  }
}

function zeta(l, cx, cy, tam = 3) {
  l.linea(cx, cy, cx + tam, cy, OJO)
  l.linea(cx + tam, cy, cx, cy + tam, OJO)
  l.linea(cx, cy + tam, cx + tam, cy + tam, OJO)
}

function estrella(l, cx, cy) {
  l.linea(cx - 1, cy, cx + 1, cy, OJO)
  l.linea(cx, cy - 1, cx, cy + 1, OJO)
}

// Efectos sobre la máscara ya dibujada (el contorno automático del render
// se encarga de perfilarlos al flotar sobre vacío).
export function pintarFx(l, anim, i) {
  if (anim === 'sleep' && i >= 1) {
    zeta(l, 47 - i * 2, 22 - i * 4, 2 + (i > 2 ? 1 : 0))
    if (i >= 2) zeta(l, 54, 12 - (i - 2) * 3, 2)
  }
  if (anim === 'hurt' && i === 0) {
    l.linea(53, 30, 56, 27, BORDE)
    l.linea(54, 34, 58, 32, BORDE)
  }
  if (anim === 'faint' && i >= 3) {
    const angulo = (i - 3) * 2.1
    estrella(l, Math.round(50 + Math.cos(angulo) * 6), Math.round(14 + Math.sin(angulo) * 4))
    if (i >= 4) {
      estrella(l, Math.round(56 + Math.cos(-angulo) * 4), Math.round(20 + Math.sin(angulo) * 3))
    }
  }
}
