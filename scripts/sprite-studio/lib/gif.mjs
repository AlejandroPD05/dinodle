// Encoder GIF89a escrito a mano (LZW propio, sin dependencias externas).
// Contrato: codificarGif(frames, { ancho, alto, fps, bucle = 0 }) → Uint8Array
//
// - `frames`: array de Uint8Array RGBA (ancho*alto*4) tal y como los produce
//   `renderizarFrame` (lib/render.mjs).
// - Paleta GLOBAL construida con los colores exactos usados en los frames, en
//   orden de primera aparición (determinista). Máximo 255 colores distintos.
// - Píxeles con alpha === 0 → índice transparente (transparencia de 1 bit).
//   Píxeles con 0 < alpha < 255 → opacos con su RGB: la sombra suave del render
//   es (11,10,7) = #0b0a07, así que queda opaca como ese color.
// - Delay por frame = round(100 / fps); bucle infinito por defecto (NETSCAPE2.0).
import { colorDe } from './util.mjs'

const MAX_COLORES = 255
const MAX_ENTRADAS_LZW = 4096
const COLOR_HUECO = colorDe('#0b0a07') // relleno/paleta del índice transparente
const NEGRO = [0, 0, 0]

// LZW de GIF: códigos de tamaño variable (tamMinimo+1 .. 12 bits), tabla que se
// reinicia con un código de limpieza cuando se llena (4096 entradas).
function codificarLzw(indices, tamMinimo) {
  const limpieza = 1 << tamMinimo
  const fin = limpieza + 1
  const bytes = []
  let acumulador = 0
  let nBits = 0
  let tamCodigo = tamMinimo + 1
  let siguiente = fin + 1
  let dicc = new Map()

  const escribeCodigo = (codigo) => {
    acumulador |= codigo << nBits
    nBits += tamCodigo
    while (nBits >= 8) {
      bytes.push(acumulador & 0xff)
      acumulador >>>= 8
      nBits -= 8
    }
  }

  const reiniciar = () => {
    dicc = new Map()
    siguiente = fin + 1
    tamCodigo = tamMinimo + 1
  }

  escribeCodigo(limpieza)
  let prefijo = indices[0]
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]
    const clave = (prefijo << 8) | k
    const encontrado = dicc.get(clave)
    if (encontrado !== undefined) {
      prefijo = encontrado
      continue
    }
    escribeCodigo(prefijo)
    if (siguiente < MAX_ENTRADAS_LZW) {
      // El código que estamos a punto de crear ya no cabe en tamCodigo bits:
      // se crece antes de asignarlo (el decodificador, una entrada por detrás,
      // crece justo después de añadir la entrada anterior).
      if (siguiente >= 1 << tamCodigo) tamCodigo++
      dicc.set(clave, siguiente++)
    } else {
      escribeCodigo(limpieza)
      reiniciar()
    }
    prefijo = k
  }
  escribeCodigo(prefijo)
  escribeCodigo(fin)
  if (nBits > 0) bytes.push(acumulador & 0xff)
  return bytes
}

// Los datos LZW van en sub-bloques de hasta 255 bytes terminados en 0.
function escribirSubBloques(salida, datos) {
  for (let i = 0; i < datos.length; i += 255) {
    const fin = Math.min(i + 255, datos.length)
    salida.push(fin - i)
    for (let j = i; j < fin; j++) salida.push(datos[j])
  }
  salida.push(0)
}

export function codificarGif(frames, { ancho, alto, fps, bucle = 0 } = {}) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error('gif: se necesita al menos un frame')
  }
  if (!Number.isInteger(ancho) || !Number.isInteger(alto) || ancho <= 0 || alto <= 0) {
    throw new Error(`gif: dimensiones inválidas (${ancho}×${alto})`)
  }
  if (!(fps > 0)) throw new Error(`gif: fps inválido (${fps})`)

  const tamFrame = ancho * alto * 4
  const listaColores = []
  const indicePorColor = new Map()
  let hayTransparente = false

  // 1) Paleta global: colores exactos usados, en orden de primera aparición.
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f]
    if (!(frame instanceof Uint8Array) || frame.length !== tamFrame) {
      throw new Error(
        `gif: el frame ${f} mide ${frame?.length ?? 'nada'}; se esperaban ${tamFrame} bytes (${ancho}×${alto} RGBA)`
      )
    }
    for (let o = 0; o < frame.length; o += 4) {
      if (frame[o + 3] === 0) {
        hayTransparente = true
        continue
      }
      const clave = (frame[o] << 16) | (frame[o + 1] << 8) | frame[o + 2]
      if (!indicePorColor.has(clave)) {
        indicePorColor.set(clave, listaColores.length)
        listaColores.push([frame[o], frame[o + 1], frame[o + 2]])
      }
    }
  }
  if (listaColores.length > MAX_COLORES) {
    throw new Error(
      `gif: ${listaColores.length} colores distintos (máximo ${MAX_COLORES}); revisa la paleta del render`
    )
  }

  const indiceTransparente = hayTransparente ? listaColores.length : 0
  const nEntradas = listaColores.length + (hayTransparente ? 1 : 0)
  let bitsPaleta = 1
  while (1 << bitsPaleta < nEntradas) bitsPaleta++
  const tamPaleta = 1 << bitsPaleta
  const tamMinimoLzw = Math.max(2, bitsPaleta)
  const retardo = Math.round(100 / fps)
  const repeticiones = Math.max(0, Math.min(0xffff, Math.round(bucle)))

  const salida = []
  const u16 = (v) => salida.push(v & 0xff, (v >> 8) & 0xff)
  const texto = (s) => {
    for (let i = 0; i < s.length; i++) salida.push(s.charCodeAt(i) & 0xff)
  }

  // 2) Encabezado + descriptor de pantalla lógica.
  texto('GIF89a')
  u16(ancho)
  u16(alto)
  // Tabla global (0x80) | resolución de color 7 | tamaño 2^bitsPaleta.
  salida.push(0x80 | 0x70 | (bitsPaleta - 1))
  salida.push(hayTransparente ? indiceTransparente : 0) // color de fondo
  salida.push(0) // proporción de píxel

  // 3) Paleta global: colores usados, hueco transparente y relleno a potencia de 2.
  for (let i = 0; i < tamPaleta; i++) {
    if (i < listaColores.length) {
      const [r, g, b] = listaColores[i]
      salida.push(r, g, b)
    } else if (hayTransparente && i === indiceTransparente) {
      salida.push(COLOR_HUECO[0], COLOR_HUECO[1], COLOR_HUECO[2])
    } else {
      salida.push(NEGRO[0], NEGRO[1], NEGRO[2])
    }
  }

  // 4) Extensión de aplicación NETSCAPE2.0: bucle (0 = infinito).
  salida.push(0x21, 0xff, 0x0b)
  texto('NETSCAPE2.0')
  salida.push(0x03, 0x01)
  u16(repeticiones)
  salida.push(0)

  // 5) Frames: control gráfico + descriptor de imagen + LZW.
  const indices = new Uint8Array(ancho * alto)
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f]
    for (let p = 0, o = 0; p < indices.length; p++, o += 4) {
      if (frame[o + 3] === 0) {
        indices[p] = indiceTransparente
      } else {
        indices[p] = indicePorColor.get((frame[o] << 16) | (frame[o + 1] << 8) | frame[o + 2])
      }
    }

    // Extensión de control gráfico: disposal 2 (restaurar fondo) + transparencia.
    salida.push(0x21, 0xf9, 0x04)
    salida.push((2 << 2) | (hayTransparente ? 1 : 0))
    u16(retardo)
    salida.push(hayTransparente ? indiceTransparente : 0)
    salida.push(0)

    // Descriptor de imagen (sin tabla local ni entrelazado).
    salida.push(0x2c)
    u16(0)
    u16(0)
    u16(ancho)
    u16(alto)
    salida.push(0)

    salida.push(tamMinimoLzw)
    escribirSubBloques(salida, codificarLzw(indices, tamMinimoLzw))
  }

  salida.push(0x3b) // terminador
  return Uint8Array.from(salida)
}
