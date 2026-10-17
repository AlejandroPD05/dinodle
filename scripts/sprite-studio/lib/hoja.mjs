// Composición de hojas de animación, escritura de PNG/GIF y manifiesto.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ANIMACIONES, ORDEN_ANIMACIONES, pintarFx, poseDe } from './animaciones.mjs'
import { CUERPOS } from './cuerpos/index.mjs'
import { codificarGif } from './gif.mjs'
import { paletaDe } from './paleta.mjs'
import { Lienzo } from './pixel.mjs'
import { escribirPngRGBA } from './png.mjs'
import { CELDA, renderizarFrame } from './render.mjs'
import { rasgosDe } from './taxonomia.mjs'
import { crearAleatorio, escalaPorLongitud, semillaDe } from './util.mjs'

export const COLCHAS = 8
export const FILAS = 6
const RAIZ_SALIDAS = new URL('../../../public/dinos/sprites/', import.meta.url)
const RUTA_MANIFIESTO = new URL('manifest.json', RAIZ_SALIDAS)
const RUTA_TS = new URL('../../../src/data/sprites.ts', import.meta.url)

export const CREDITO =
  'Sprites generados proceduralmente por el estudio de sprites de Dinodle (inspirado en PMD Collab; sin relación con Nintendo ni Chunsoft).'

function pegarEnHoja(hoja, rgba, x0, y0) {
  const anchoHoja = COLCHAS * CELDA
  for (let y = 0; y < CELDA; y++) {
    const destino = ((y0 + y) * anchoHoja + x0) * 4
    hoja.set(rgba.subarray(y * CELDA * 4, (y + 1) * CELDA * 4), destino)
  }
}

// Genera máscaras, frames RGBA, hoja completa y entrada de manifiesto de un dino.
export function componerDino(dino) {
  const { arquetipo, variante, rasgos } = rasgosDe(dino)
  const cuerpo = CUERPOS[arquetipo]
  if (!cuerpo) throw new Error(`arquetipo desconocido: ${arquetipo}`)

  const ale = crearAleatorio(semillaDe(dino.slug))
  const paleta = paletaDe(dino, ale)
  const spec = cuerpo.preparar(dino, rasgos, ale)
  const escala = escalaPorLongitud(dino.length_m)

  const hoja = new Uint8Array(COLCHAS * CELDA * FILAS * CELDA * 4)
  const frames = {}
  const anims = {}

  ORDEN_ANIMACIONES.forEach((anim, fila) => {
    const { fps, frames: n } = ANIMACIONES[anim]
    const lista = []
    for (let i = 0; i < n; i++) {
      const lienzo = new Lienzo(CELDA, CELDA)
      cuerpo.dibujar(lienzo, poseDe(anim, i), spec, paleta)
      pintarFx(lienzo, anim, i, n)
      const rgba = renderizarFrame(lienzo, {
        paleta,
        semillaPatron: paleta.semillaPatron,
        escala,
      })
      lista.push(rgba)
      pegarEnHoja(hoja, rgba, i * CELDA, fila * CELDA)
    }
    frames[anim] = { lista, fps, n }
    anims[anim] = { row: fila, frames: n, fps }
  })

  const entrada = {
    nombre: dino.name,
    arquetipo,
    variante,
    sheet: `/dinos/sprites/sheets/${dino.slug}.png`,
    gifs: {},
    colores: paleta.colores,
    anims,
  }
  for (const anim of ORDEN_ANIMACIONES) {
    entrada.gifs[anim] = `/dinos/sprites/gifs/${dino.slug}-${anim}.gif`
  }

  return { entrada, hoja, frames }
}

export function escribirDino(dino, resultado, { gifs = true } = {}) {
  mkdirSync(new URL('sheets/', RAIZ_SALIDAS), { recursive: true })
  escribirPngRGBA(new URL(`sheets/${dino.slug}.png`, RAIZ_SALIDAS), COLCHAS * CELDA, FILAS * CELDA, resultado.hoja)
  if (!gifs) return 0
  mkdirSync(new URL('gifs/', RAIZ_SALIDAS), { recursive: true })
  let bytes = 0
  for (const anim of ORDEN_ANIMACIONES) {
    const { lista, fps } = resultado.frames[anim]
    const gif = codificarGif(lista, { ancho: CELDA, alto: CELDA, fps })
    bytes += gif.length
    writeFileSync(new URL(`gifs/${dino.slug}-${anim}.gif`, RAIZ_SALIDAS), gif)
  }
  return bytes
}

export function leerManifiesto() {
  if (!existsSync(RUTA_MANIFIESTO)) return null
  return JSON.parse(readFileSync(RUTA_MANIFIESTO, 'utf8'))
}

export function escribirManifiesto(entradas, { fusionar = false } = {}) {
  let dinos = entradas
  if (fusionar) {
    const previo = leerManifiesto()
    dinos = { ...(previo?.dinos ?? {}), ...entradas }
  }
  const manifiesto = {
    version: 1,
    celda: CELDA,
    colchas: COLCHAS,
    filas: FILAS,
    animaciones: ORDEN_ANIMACIONES,
    credito: CREDITO,
    dinos,
  }
  mkdirSync(RAIZ_SALIDAS, { recursive: true })
  writeFileSync(RUTA_MANIFIESTO, JSON.stringify(manifiesto, null, 1))

  const ts = `// GENERADO por scripts/sprite-studio/index.mjs — no editar a mano.
import type { DinoSpriteEntry } from '../types/sprite';

export const SPRITE_CELDA = ${CELDA};
export const SPRITE_COLCHAS = ${COLCHAS};
export const SPRITE_FILAS = ${FILAS};

export const DINO_MANIFEST: Record<string, DinoSpriteEntry> = ${JSON.stringify(dinos, null, 2)};
`
  mkdirSync(new URL('../../../src/data/', import.meta.url), { recursive: true })
  writeFileSync(RUTA_TS, ts)
  return manifiesto
}

// Rejilla HTML de vista previa para revisión interna (animaciones CSS steps).
export function escribirVista(dinos) {
  const figuras = dinos
    .map(
      (d) => `      <figure class="dino" style="--sheet: url('../../../public/dinos/sprites/sheets/${d.slug}.png')">
        <span class="anim" title="${d.name}"></span>
        <figcaption>${d.name}</figcaption>
      </figure>`
    )
    .join('\n')
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Sprites animados · ${dinos.length} dinosaurios</title>
<style>
  body { background: #15160f; color: #d9cfb3; font-family: system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 20px; color: #e0ab5c; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 12px; }
  .dino { margin: 0; background: #22241a; border: 1px solid #3a3b2c; padding: 8px; text-align: center; }
  .anim {
    display: inline-block; width: 128px; height: 128px; image-rendering: pixelated;
    background-image: var(--sheet);
    background-repeat: no-repeat; background-size: 800% auto;
    background-position-x: 0%; background-position-y: 0%;
    animation: dino-idle 0.6667s infinite;
  }
  @keyframes dino-idle {
    0%, 24.99% { background-position-x: 0%; }
    25%, 49.99% { background-position-x: 14.2857%; }
    50%, 74.99% { background-position-x: 28.5714%; }
    75%, 100% { background-position-x: 42.8571%; }
  }
  figcaption { font-size: 12px; color: #8a816c; margin-top: 6px; }
</style>
</head>
<body>
<h1>Sprites animados · ${dinos.length} dinosaurios (idle)</h1>
<div class="grid">
${figuras}
</div>
</body>
</html>
`
  // Herramienta interna de revisión: vive en _qc/ (ignorado por git y fuera
  // de public/, para que no viaje al build).
  mkdirSync(new URL('../_qc/', import.meta.url), { recursive: true })
  writeFileSync(new URL('../_qc/vista.html', import.meta.url), html)
  return html.length
}
