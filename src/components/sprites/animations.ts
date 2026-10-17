import type { SpriteAnimName } from '../../types/sprite';

/** Etiquetas en español de las 6 animaciones (en el orden de las filas de la hoja). */
export const SPRITE_ANIM_LABELS: Record<SpriteAnimName, string> = {
  idle: 'Reposo',
  walk: 'Caminar',
  attack: 'Ataque',
  hurt: 'Herido',
  sleep: 'Dormido',
  faint: 'Desmayo',
};
