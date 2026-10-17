// Utilidad interna: imprime slugs representativos por variante (para QC y reparto de trabajo).
import { readFileSync } from 'node:fs'
import { clasificar } from './lib/taxonomia.mjs'

const { dinos } = JSON.parse(readFileSync(new URL('./data/dinos.json', import.meta.url), 'utf8'))
const mapa = {}
for (const dino of dinos) {
  const c = clasificar(dino)
  const clave = `${c.arquetipo}/${c.variante}`
  ;(mapa[clave] ??= []).push(dino.slug)
}
for (const clave of Object.keys(mapa).sort()) {
  console.log(`${clave} :: ${mapa[clave].slice(0, 4).join(', ')}`)
}
