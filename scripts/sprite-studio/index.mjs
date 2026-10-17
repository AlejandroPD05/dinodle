// CLI orquestador del estudio de sprites.
//   node scripts/sprite-studio/index.mjs [--refresh] [--solo a,b] [--qc] [--vista] [--no-gifs]
import { cargarDinosaurios } from './fetch-dinos.mjs'
import { componerDino, escribirDino, escribirManifiesto, escribirVista } from './lib/hoja.mjs'
import { escribirQcContacto, escribirQcDino } from './lib/qc.mjs'
import { rasgosDe } from './lib/taxonomia.mjs'

const args = process.argv.slice(2)
const tiene = (flag) => args.includes(flag)
const valorDe = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : null
}

const refrescar = tiene('--refresh')
const conQc = tiene('--qc')
const conVista = tiene('--vista')
const sinGifs = tiene('--no-gifs')
const soloRaw = valorDe('--solo')
const solo = soloRaw ? new Set(soloRaw.split(',').map((s) => s.trim()).filter(Boolean)) : null

const inicio = Date.now()
const dinos = await cargarDinosaurios(refrescar)
const lista = solo ? dinos.filter((d) => solo.has(d.slug)) : dinos

if (solo) {
  const encontrados = new Set(lista.map((d) => d.slug))
  const faltan = [...solo].filter((s) => !encontrados.has(s))
  if (faltan.length) console.warn(`aviso: slugs no encontrados en el catálogo: ${faltan.join(', ')}`)
  if (!lista.length) {
    console.error('error: --solo no coincide con ningún slug')
    process.exit(1)
  }
}

const entradas = {}
const porArquetipo = {}
const errores = []

for (const dino of lista) {
  try {
    const resultado = componerDino(dino)
    escribirDino(dino, resultado, { gifs: !sinGifs })
    if (conQc) {
      escribirQcDino(dino, resultado)
      const { arquetipo } = rasgosDe(dino)
      ;(porArquetipo[arquetipo] ??= []).push({ dino, resultado })
    }
    entradas[dino.slug] = resultado.entrada
    console.log(`ok  ${dino.slug} (${resultado.entrada.arquetipo}/${resultado.entrada.variante})`)
  } catch (error) {
    errores.push({ slug: dino.slug, mensaje: error.message })
    console.warn(`x   ${dino.slug}: ${error.message}`)
  }
}

if (conQc) {
  for (const [arquetipo, l] of Object.entries(porArquetipo)) {
    escribirQcContacto(arquetipo, l)
    console.log(`qc  contacto-${arquetipo}.png (${l.length})`)
  }
}

if (Object.keys(entradas).length) {
  escribirManifiesto(entradas, { fusionar: solo != null })
}

if (conVista) {
  const manifiesto = (await import('./lib/hoja.mjs')).leerManifiesto()
  const generados = new Set(Object.keys(manifiesto?.dinos ?? {}))
  const paraVista = dinos.filter((d) => generados.has(d.slug))
  const bytes = escribirVista(paraVista)
  console.log(`vista scripts/sprite-studio/_qc/vista.html (${paraVista.length} dinos, ${bytes} bytes)`)
}

const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
console.log(`\n${Object.keys(entradas).length}/${lista.length} sprites en ${segundos}s`)
if (errores.length) {
  console.log(`fallos (${errores.length}):`)
  for (const e of errores.slice(0, 20)) console.log(`  ${e.slug}: ${e.mensaje}`)
  if (!solo) process.exit(1)
}
