// Verificación integral del resultado del estudio de sprites.
//   node scripts/sprite-studio/verificar.mjs [--muestra N]
//
// Comprueba el manifiesto (hoja, gifs, anims y colores), regenera los frames en
// memoria con componerDino (silueta, píxeles opacos y márgenes) y valida el
// determinismo sobre una muestra de slugs. Sale con código 1 si hay fallos.
import { existsSync, readFileSync } from 'node:fs'
import { ANIMACIONES, ORDEN_ANIMACIONES, pintarFx, poseDe } from './lib/animaciones.mjs'
import { CUERPOS } from './lib/cuerpos/index.mjs'
import { codificarGif } from './lib/gif.mjs'
import { componerDino } from './lib/hoja.mjs'
import { paletaDe } from './lib/paleta.mjs'
import { Lienzo } from './lib/pixel.mjs'
import { dimensionesPng } from './lib/png.mjs'
import { CELDA } from './lib/render.mjs'
import { rasgosDe } from './lib/taxonomia.mjs'
import { crearAleatorio, semillaDe } from './lib/util.mjs'

const RUTA_DINOS = new URL('./data/dinos.json', import.meta.url)
const RUTA_MANIFIESTO = new URL('../../public/dinos/sprites/manifest.json', import.meta.url)
const RAIZ_PUBLIC = new URL('../../public/', import.meta.url)

const ANCHO_HOJA = CELDA * 8
const ALTO_HOJA = CELDA * 6
const TOTAL_FRAMES = ORDEN_ANIMACIONES.reduce((s, a) => s + ANIMACIONES[a].frames, 0)
const MIN_IDLE = 300
const MIN_FRAME = 80
const HEX = /^#[0-9a-f]{6}$/i

const args = process.argv.slice(2)
const valorDe = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : null
}
const muestra = Number(valorDe('--muestra') ?? 8)
if (!Number.isInteger(muestra) || muestra < 1) {
  console.error('error: --muestra necesita un número entero ≥ 1 (por defecto 8)')
  process.exit(1)
}

console.log('dinodle · sprites:check')

// --- Lectura de datos ---------------------------------------------------------

if (!existsSync(RUTA_DINOS)) {
  console.error(`error: no existe ${RUTA_DINOS.pathname}`)
  console.error('       ejecuta antes: node scripts/sprite-studio/fetch-dinos.mjs')
  process.exit(1)
}
if (!existsSync(RUTA_MANIFIESTO)) {
  console.error(`error: no existe ${RUTA_MANIFIESTO.pathname}`)
  console.error('       ejecuta antes: npm run sprites')
  process.exit(1)
}

const catalogo = JSON.parse(readFileSync(RUTA_DINOS, 'utf8'))
const dinos = catalogo.dinos
if (!Array.isArray(dinos) || !dinos.length) {
  console.error('error: data/dinos.json no contiene la lista "dinos"')
  process.exit(1)
}
const manifiesto = JSON.parse(readFileSync(RUTA_MANIFIESTO, 'utf8'))
const entradas = manifiesto.dinos ?? {}
const slugs = Object.keys(entradas)
const porSlug = new Map(dinos.map((d) => [d.slug, d]))

console.log(`catálogo: ${dinos.length} dinosaurios · manifiesto: ${slugs.length} entradas`)
if (!slugs.length) {
  console.error('error: el manifiesto no tiene entradas')
  process.exit(1)
}

// --- Utilidades ---------------------------------------------------------------

let nOk = 0
let nFallos = 0

function ok(texto) {
  nOk++
  console.log(`  ok    ${texto}`)
}

function fallo(texto) {
  nFallos++
  console.log(`  fallo ${texto}`)
}

function rutaPublica(ruta) {
  try {
    return new URL(String(ruta).replace(/^\/+/, ''), RAIZ_PUBLIC)
  } catch {
    return null
  }
}

// Cuenta los píxeles del cuerpo (alpha 255). La sombra suave (alpha 90) no
// cuenta como opaca: es un efecto, no silueta.
function contarOpacos(rgba) {
  let n = 0
  for (let o = 3; o < rgba.length; o += 4) if (rgba[o] === 255) n++
  return n
}

// Márgenes de la MÁSCARA (limites() de lib/pixel.mjs) de todos los frames: el
// rectángulo envolvente debe quedar dentro del lienzo con ≥1px de margen. El
// contorno automático del render añade 1px, así que esto garantiza que el
// sprite nunca se corta. Devuelve la lista de frames fuera de margen.
function framesSinMargen(dino) {
  const { arquetipo, rasgos } = rasgosDe(dino)
  const cuerpo = CUERPOS[arquetipo]
  if (!cuerpo) throw new Error(`arquetipo desconocido: ${arquetipo}`)
  // Mismo orden de consumo del PRNG que componerDino (paleta → preparar).
  const ale = crearAleatorio(semillaDe(dino.slug))
  const paleta = paletaDe(dino, ale)
  const spec = cuerpo.preparar(dino, rasgos, ale)
  const fuera = []
  for (const anim of ORDEN_ANIMACIONES) {
    const n = ANIMACIONES[anim].frames
    for (let i = 0; i < n; i++) {
      const lienzo = new Lienzo(CELDA, CELDA)
      cuerpo.dibujar(lienzo, poseDe(anim, i), spec, paleta)
      pintarFx(lienzo, anim, i, n)
      const lim = lienzo.limites()
      if (!lim) fuera.push(`${anim}[${i}] vacío`)
      else if (lim.x0 < 1 || lim.y0 < 1 || lim.x1 > CELDA - 2 || lim.y1 > CELDA - 2)
        fuera.push(`${anim}[${i}] (${lim.x0},${lim.y0}..${lim.x1},${lim.y1})`)
    }
  }
  return fuera
}

function gifsDe(resultado) {
  const salida = {}
  for (const anim of ORDEN_ANIMACIONES) {
    const { lista, fps } = resultado.frames[anim]
    salida[anim] = Buffer.from(codificarGif(lista, { ancho: CELDA, alto: CELDA, fps }))
  }
  return salida
}

// --- 1) Manifiesto y artefactos ------------------------------------------------

const resultados = new Map()

for (const slug of slugs) {
  const entrada = entradas[slug]
  console.log(`\n${slug}`)

  // Hoja PNG 512×384.
  const rutaHoja = rutaPublica(entrada.sheet)
  const dimensiones = rutaHoja ? dimensionesPng(rutaHoja) : null
  if (!rutaHoja) fallo(`hoja: ruta inválida en el manifiesto (${entrada.sheet})`)
  else if (!dimensiones) fallo(`hoja: no existe o no es PNG (${entrada.sheet})`)
  else if (dimensiones.ancho !== ANCHO_HOJA || dimensiones.alto !== ALTO_HOJA)
    fallo(`hoja: mide ${dimensiones.ancho}×${dimensiones.alto}; se esperaba ${ANCHO_HOJA}×${ALTO_HOJA}`)
  else ok(`hoja ${ANCHO_HOJA}×${ALTO_HOJA} (${entrada.sheet})`)

  // Los 6 GIFs existen y empiezan por GIF89a.
  let gifsMal = 0
  for (const anim of ORDEN_ANIMACIONES) {
    const ruta = rutaPublica(entrada.gifs?.[anim])
    let cabecera = null
    if (ruta) {
      try {
        cabecera = readFileSync(ruta).subarray(0, 6).toString('latin1')
      } catch {
        cabecera = null
      }
    }
    if (cabecera !== 'GIF89a') {
      gifsMal++
      fallo(`gif ${anim}: no existe o no empieza por GIF89a (${entrada.gifs?.[anim] ?? 'sin ruta'})`)
    }
  }
  if (!gifsMal) ok(`gifs ${ORDEN_ANIMACIONES.length}/${ORDEN_ANIMACIONES.length} GIF89a`)

  // anims coherente con ANIMACIONES (frames/fps/fila).
  const anims = entrada.anims ?? {}
  const claves = Object.keys(anims)
  const esperadas = Object.keys(ANIMACIONES)
  const faltan = esperadas.filter((a) => !(a in anims))
  const sobran = claves.filter((a) => !(a in ANIMACIONES))
  const distintas = esperadas.filter((a) => {
    const e = anims[a]
    return e && (e.frames !== ANIMACIONES[a].frames || e.fps !== ANIMACIONES[a].fps)
  })
  const filaMal = esperadas.filter((a) => anims[a] && anims[a].row !== ORDEN_ANIMACIONES.indexOf(a))
  if (faltan.length || sobran.length || distintas.length || filaMal.length) {
    if (faltan.length) fallo(`anims: faltan ${faltan.join(', ')}`)
    if (sobran.length) fallo(`anims: sobran ${sobran.join(', ')}`)
    if (distintas.length)
      fallo(
        `anims: frames/fps no coinciden con ANIMACIONES en ${distintas.join(', ')} (ej. ${distintas[0]}: ${JSON.stringify(anims[distintas[0]])} vs ${JSON.stringify(ANIMACIONES[distintas[0]])})`
      )
    if (filaMal.length) fallo(`anims: fila incorrecta en ${filaMal.join(', ')}`)
  } else {
    ok(`anims ${esperadas.length}/${esperadas.length} (frames/fps/fila)`)
  }

  // 8 colores hex.
  const colores = entrada.colores
  if (!Array.isArray(colores) || colores.length !== 8 || !colores.every((c) => HEX.test(c))) {
    fallo(`colores: se esperaban 8 hex válidos; hay ${JSON.stringify(colores)}`)
  } else {
    ok('colores 8 hex válidos')
  }

  // 2) Regeneración en memoria.
  const dino = porSlug.get(slug)
  if (!dino) {
    fallo('no está en data/dinos.json (¿catálogo desactualizado?)')
    continue
  }

  let resultado
  try {
    resultado = componerDino(dino)
  } catch (error) {
    fallo(`regenerar frames: ${error.message}`)
    continue
  }
  resultados.set(slug, resultado)

  // Frame 0 de idle = retrato.
  const opacosIdle = contarOpacos(resultado.frames.idle.lista[0])
  if (opacosIdle >= MIN_IDLE) ok(`idle[0]: ${opacosIdle} píxeles opacos (≥${MIN_IDLE})`)
  else fallo(`idle[0]: solo ${opacosIdle} píxeles opacos (<${MIN_IDLE}); el retrato sale vacío`)

  // Ningún frame del conjunto por debajo del mínimo.
  let minimo = Infinity
  let peor = null
  for (const anim of ORDEN_ANIMACIONES) {
    resultado.frames[anim].lista.forEach((rgba, i) => {
      const n = contarOpacos(rgba)
      if (n < minimo) {
        minimo = n
        peor = `${anim}[${i}]`
      }
    })
  }
  if (minimo >= MIN_FRAME) ok(`frames: mínimo ${minimo} píxeles opacos en ${peor} (≥${MIN_FRAME})`)
  else fallo(`frames: ${peor} tiene ${minimo} píxeles opacos (<${MIN_FRAME})`)

  // Margen ≥ 1px de la máscara en todos los frames.
  try {
    const fuera = framesSinMargen(dino)
    if (!fuera.length) ok(`márgenes: ≥1px en los ${TOTAL_FRAMES} frames (máscara)`)
    else
      fallo(
        `márgenes: ${fuera.length}/${TOTAL_FRAMES} frames tocan el borde (${fuera.slice(0, 3).join(', ')}${fuera.length > 3 ? '…' : ''})`
      )
  } catch (error) {
    fallo(`márgenes: no se pudo regenerar la máscara (${error.message})`)
  }
}

// --- 3) Determinismo sobre una muestra -----------------------------------------

const cantidad = Math.min(muestra, slugs.length)
const paso = Math.max(1, Math.ceil(slugs.length / muestra))
const elegidos = []
for (let i = 0; i < slugs.length && elegidos.length < cantidad; i += paso) elegidos.push(slugs[i])

console.log(`\ndeterminismo (muestra de ${elegidos.length} de ${slugs.length}, paso ${paso}):`)
for (const slug of elegidos) {
  const dino = porSlug.get(slug)
  const primero = resultados.get(slug)
  if (!dino || !primero) {
    fallo(`${slug}: sin resultado previo; no se puede comprobar`)
    continue
  }
  try {
    const segundo = componerDino(dino)
    if (Buffer.compare(Buffer.from(primero.hoja), Buffer.from(segundo.hoja)) !== 0) {
      fallo(`${slug}: la hoja difiere entre dos ejecuciones`)
      continue
    }
    const gifsA = gifsDe(primero)
    const gifsB = gifsDe(segundo)
    const distintos = ORDEN_ANIMACIONES.filter((anim) => !gifsA[anim].equals(gifsB[anim]))
    if (distintos.length) fallo(`${slug}: los gifs difieren entre dos ejecuciones (${distintos.join(', ')})`)
    else ok(`${slug}: hoja y 6 gifs idénticos en dos ejecuciones`)
  } catch (error) {
    fallo(`${slug}: ${error.message}`)
  }
}

// --- Resumen -------------------------------------------------------------------

const sinGenerar = dinos.filter((d) => !(d.slug in entradas)).length
console.log(
  `\nresumen: ${nOk} comprobaciones ok · ${nFallos} fallos · ${sinGenerar} dinos del catálogo aún sin generar`
)
if (nFallos) {
  console.log('sprites:check FALLA (revisa las líneas "fallo")')
  process.exitCode = 1
} else {
  console.log('sprites:check en verde')
}
