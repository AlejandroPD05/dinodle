// Encoder PNG manual (solo built-ins de Node), portado de scripts/generar-sprites.mjs.
import { readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

function crc32(buf) {
  let crc = -1
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ -1) >>> 0
}

function trozo(tipo, datos) {
  const buf = Buffer.alloc(8 + datos.length + 4)
  buf.writeUInt32BE(datos.length, 0)
  buf.write(tipo, 4, 'ascii')
  datos.copy(buf, 8)
  const crc = crc32(Buffer.concat([Buffer.from(tipo, 'ascii'), datos]))
  buf.writeUInt32BE(crc, 8 + datos.length)
  return buf
}

export function escribirPngRGBA(ruta, ancho, alto, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const filas = []
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 4)
    Buffer.from(px.buffer, px.byteOffset + y * ancho * 4, ancho * 4).copy(fila, 1)
    filas.push(fila)
  }
  const idat = zlib.deflateSync(Buffer.concat(filas), { level: 9 })
  writeFileSync(
    ruta,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      trozo('IHDR', ihdr),
      trozo('IDAT', idat),
      trozo('IEND', Buffer.alloc(0)),
    ])
  )
}

// Lee ancho/alto de un PNG (IHDR) sin decodificarlo: {ancho, alto} o null.
export function dimensionesPng(ruta) {
  try {
    const buf = readFileSync(ruta)
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null
    return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20) }
  } catch {
    return null
  }
}
