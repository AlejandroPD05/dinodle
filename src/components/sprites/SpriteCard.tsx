import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { DinoSpriteEntry } from '../../types/sprite';
import type { Dinosaur } from '../../types/dinosaur';

/** Emoji de dieta (mismo criterio que DinoDex/GuessBoard). */
function dinoEmoji(diet: string): string {
  if (diet === 'Carnívoro') {
    return '🦖';
  }
  if (diet === 'Herbívoro') {
    return '🦕';
  }
  return '🦎';
}

interface SpriteCardProps {
  dinosaur: Dinosaur;
  entry: DinoSpriteEntry;
}

/**
 * Tarjeta de la rejilla: preview del idle animado solo con CSS steps sobre la hoja
 * (nada de canvas: la rejilla puede tener 288 tarjetas), nombre y dieta/período.
 */
export function SpriteCard({ dinosaur, entry }: SpriteCardProps) {
  const idle = entry.anims.idle;
  const estilo = {
    '--sprites-idle-duration': `${idle.frames / idle.fps}s`,
    '--sprites-card-accent': entry.colores[3],
  } as CSSProperties;

  return (
    <Link to={`/sprites/${dinosaur.slug}`} className="sprites-card" style={estilo}>
      <span className="sprites-card-stage" aria-hidden="true">
        <span
          className="sprites-card-sprite"
          style={{ backgroundImage: `url(${entry.sheet})` }}
        />
      </span>
      <span className="sprites-card-name">{dinosaur.name}</span>
      <span className="sprites-card-meta">
        <span aria-hidden="true">{dinoEmoji(dinosaur.diet)}</span> {dinosaur.diet} · {dinosaur.period}
      </span>
    </Link>
  );
}
