import { DINO_MANIFEST } from '../../data/sprites';
import type { SpriteAnimName } from '../../types/sprite';

interface DinoSpriteProps {
  slug: string;
  /** Emoji u otro texto si el dinosaurio no tiene sprite generado. */
  fallback?: string;
  /** Animación mostrada; en el juego solo `idle` se reproduce (CSS). */
  anim?: SpriteAnimName;
}

export function DinoSprite({ slug, fallback, anim = 'idle' }: DinoSpriteProps) {
  const entrada = DINO_MANIFEST[slug];
  const info = entrada?.anims[anim];
  if (!entrada || !info) {
    return <>{fallback ?? null}</>;
  }

  return (
    <span
      aria-hidden="true"
      className="dino-sprite"
      data-anim={anim}
      style={{
        backgroundImage: `url(${entrada.sheet})`,
        backgroundPositionY: `${info.row * 20}%`,
        animation: anim === 'idle' ? undefined : 'none',
      }}
    />
  );
}
