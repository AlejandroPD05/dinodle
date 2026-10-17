// Rampas de color, patrones y rampa de acento. Portado de scripts/generar-sprites.mjs.
import { colorDe, semillaDe } from './util.mjs'

// 16 rampas de 4 tonos (oscuro → claro), validado sobre el catálogo actual.
export const RAMPAS = [
  ['#1c2a17', '#33502f', '#4f7a46', '#7fa66a'],
  ['#2a2c16', '#4a4d24', '#6f7336', '#9c9e57'],
  ['#232b18', '#3d4a28', '#5d6e3c', '#87985f'],
  ['#2b1f12', '#4f3a20', '#77603a', '#a68c5c'],
  ['#2f2410', '#56431c', '#7f6a2e', '#b09a54'],
  ['#33291a', '#5c4c31', '#8a7752', '#bda77c'],
  ['#2e1a10', '#5c321c', '#8a5430', '#b87f52'],
  ['#2c1511', '#57291f', '#834536', '#b06e56'],
  ['#122722', '#22453c', '#3a6e5e', '#5f9a86'],
  ['#161c26', '#2b3746', '#48596e', '#72879e'],
  ['#1e1e1a', '#3a3a32', '#5c5a4c', '#8a866f'],
  ['#221626', '#3d2a45', '#5f4469', '#8a6a92'],
  ['#2e1b19', '#573330', '#855048', '#b07a6c'],
  ['#2e2008', '#5c4214', '#8a6a24', '#bd9c4a'],
  ['#142a1c', '#254a30', '#3d7048', '#63a071'],
  ['#302a1c', '#544a30', '#7d7050', '#a89a76'],
]

const RAMPAS_HERBIVORO = [0, 1, 2, 3, 5, 6, 10, 11, 14, 15]
const RAMPAS_CARNIVORO = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14]
const RAMPAS_OMNIVORO = [2, 3, 5, 9, 11, 14, 15]

// Colores fijos de la máscara (códigos 2..12).
export const FIJOS = {
  2: '#0d0c0a', // BORDE
  3: '#efe9d4', // OJO
  4: '#0d0c0a', // PUPILA
  5: '#e6dfc6', // DIENTE
  6: '#d8cfae', // GARRA
  7: '#c9a45f', // PICO
  9: '#401d16', // BOCA
  12: '#d9cfb3', // CUERNO
}

export function elegirRampa(diet, ale) {
  const lista =
    diet === 'Herbívoro' ? RAMPAS_HERBIVORO : diet === 'Carnívoro' ? RAMPAS_CARNIVORO : RAMPAS_OMNIVORO
  return RAMPAS[lista[Math.floor(ale() * lista.length)]]
}

export function elegirPatron(ale) {
  const r = ale()
  if (r < 0.45) return 'lisa'
  if (r < 0.65) return 'franjas'
  if (r < 0.85) return 'manchas'
  return 'banda'
}

function hexAHsl(hex) {
  const [r, g, b] = colorDe(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslAHex([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return (
    '#' +
    [f(0), f(8), f(4)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  )
}

// Rampa de acento: misma luminosidad que la del cuerpo, tono rotado y algo más saturado.
export function rampaAcento(rampa, ale) {
  const signo = ale() < 0.5 ? -1 : 1
  const delta = signo * (40 + ale() * 45)
  return rampa.map((hex) => {
    const [h, s, l] = hexAHsl(hex)
    const nh = (((h + delta / 360) % 1) + 1) % 1
    return hslAHex([nh, Math.min(1, s * 1.35), l])
  })
}

// Paleta completa de un dinosaurio. Orden de consumo de `ale` FIJO (ver skill).
export function paletaDe(dino, ale) {
  const rampa = elegirRampa(dino.diet, ale)
  const patron = elegirPatron(ale)
  const acento = rampaAcento(rampa, ale)
  return {
    rampa,
    acento,
    patron,
    semillaPatron: semillaDe(dino.slug) % 97,
    colores: [...rampa, ...acento],
  }
}
