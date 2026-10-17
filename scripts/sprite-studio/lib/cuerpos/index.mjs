// Índice de cuerpos por arquetipo. Los agentes implementan cada módulo
// manteniendo exportadas las funciones preparar() y dibujar().

import * as teropodoGrande from './teropodo-grande.mjs'
import * as teropodoPequeno from './teropodo-pequeno.mjs'
import * as sauropodo from './sauropodo.mjs'
import * as ornitopodo from './ornitopodo.mjs'
import * as acorazado from './acorazado.mjs'
import * as ceratopsio from './ceratopsio.mjs'

export const CUERPOS = {
  'teropodo-grande': teropodoGrande,
  'teropodo-pequeno': teropodoPequeno,
  sauropodo,
  ornitopodo,
  acorazado,
  ceratopsio,
}
