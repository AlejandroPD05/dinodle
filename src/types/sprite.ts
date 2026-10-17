// Contrato de los sprites animados (consumido por la galería /sprites y el juego).
// Los datos llegan desde src/data/sprites.ts (generado por scripts/sprite-studio).

export type SpriteAnimName = 'idle' | 'walk' | 'attack' | 'hurt' | 'sleep' | 'faint';

export const SPRITE_ANIMS: SpriteAnimName[] = [
  'idle',
  'walk',
  'attack',
  'hurt',
  'sleep',
  'faint',
];

export interface SpriteAnimInfo {
  /** Fila de la animación dentro de la hoja (idle = 0 ... faint = 5). */
  row: number;
  frames: number;
  fps: number;
}

export interface DinoSpriteEntry {
  nombre: string;
  arquetipo: string;
  variante: string;
  /** Ruta pública de la hoja 512×384 (8×6 celdas de 64px). */
  sheet: string;
  /** GIF por animación (puede faltar alguna si se generó con --no-gifs). */
  gifs: Partial<Record<SpriteAnimName, string>>;
  /** [tono0..tono3, acento0..acento3] en hex, para theming de UI. */
  colores: string[];
  anims: Record<SpriteAnimName, SpriteAnimInfo>;
}
