// Descarga el catálogo de dinosaurios desde Supabase y lo cachea en
// scripts/sprite-studio/data/dinos.json para que la generación de sprites sea
// reproducible sin red. Uso: node scripts/sprite-studio/fetch-dinos.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { clasificar } from './lib/taxonomia.mjs'

const RUTA_CACHE = new URL('./data/dinos.json', import.meta.url)

function leerEnvLocal() {
  const texto = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
  const url = /VITE_SUPABASE_URL=(.+)/.exec(texto)?.[1].trim().replace(/^"|"$/g, '')
  const clave = /VITE_SUPABASE_ANON_KEY=(.+)/.exec(texto)?.[1].trim().replace(/^"|"$/g, '')
  if (!url || !clave) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local')
  return { url, clave }
}

export async function cargarDinosaurios(forzar = false) {
  if (!forzar) {
    try {
      const cache = JSON.parse(readFileSync(RUTA_CACHE, 'utf8'))
      if (cache.dinos?.length === 288) return cache.dinos
    } catch {
      // sin caché: se descarga
    }
  }

  const { url, clave } = leerEnvLocal()
  const consulta =
    'name,slug,diet,period,length_m,height_m,weight_kg,rarity,location,description'
  const respuesta = await fetch(`${url}/rest/v1/dinosaurs?select=${consulta}&order=name`, {
    headers: { apikey: clave, Authorization: `Bearer ${clave}` },
  })
  if (!respuesta.ok) throw new Error(`Supabase respondió con ${respuesta.status}`)

  const dinos = await respuesta.json()
  mkdirSync(new URL('./data/', import.meta.url), { recursive: true })
  writeFileSync(
    RUTA_CACHE,
    JSON.stringify({ fetchedAt: new Date().toISOString(), dinos }, null, 1)
  )
  return dinos
}

// --- Análisis de clasificación (útil al desarrollar los cuerpos) ---
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dinos = await cargarDinosaurios(process.argv.includes('--refresh'))
  const porArquetipo = {}
  const porVariante = {}
  const sinGrupo = []
  for (const dino of dinos) {
    const { arquetipo, variante } = clasificar(dino)
    porArquetipo[arquetipo] = (porArquetipo[arquetipo] ?? 0) + 1
    const clave = `${arquetipo}/${variante}`
    porVariante[clave] = (porVariante[clave] ?? 0) + 1
    if (!/grupo de los/.test(dino.description ?? '')) sinGrupo.push(dino.slug)
  }
  console.log(`dinosaurios: ${dinos.length}`)
  console.log('\npor arquetipo:')
  for (const [k, v] of Object.entries(porArquetipo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${String(v).padStart(3)}`)
  }
  console.log('\npor variante:')
  for (const [k, v] of Object.entries(porVariante).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(34)} ${String(v).padStart(3)}`)
  }
  console.log(`\nsin "grupo de los" en la descripción (${sinGrupo.length}):`)
  console.log('  ' + sinGrupo.join(', '))
}
