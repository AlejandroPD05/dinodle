import type { HintResult, HintStatus } from '../../types/game';
import type { GuessRow } from '../../services/gameService';
import { DinoSprite } from './DinoSprite';

function dinoEmoji(diet: string): string {
  if (diet === 'Carnívoro') {
    return '🦖';
  }
  if (diet === 'Herbívoro') {
    return '🦕';
  }
  return '🦎';
}

function tileClass(status: HintStatus | undefined): string {
  if (status === 'correct') {
    return 'tile-correct';
  }
  if (status === undefined || status === 'incorrect') {
    return 'tile-incorrect';
  }
  return 'tile-partial';
}

function statusSymbol(status: HintStatus | undefined): string {
  if (status === 'correct') {
    return '✓';
  }
  if (status === undefined || status === 'incorrect') {
    return '✗';
  }
  return '≈';
}

function lengthArrow(status: HintStatus | undefined): string {
  if (status === 'higher') {
    return ' ↑';
  }
  if (status === 'lower') {
    return ' ↓';
  }
  return '';
}

function getHint(hints: HintResult[], attribute: string): HintResult | undefined {
  return hints.find((h) => h.attribute === attribute);
}

function GuessTile({
  icon,
  status,
  value,
  delay,
}: {
  icon: string;
  status: HintStatus | undefined;
  value: string;
  delay: number;
}) {
  return (
    <div className={`guess-tile ${tileClass(status)}`} style={{ animationDelay: `${delay}s` }}>
      <span className="guess-tile-icon" aria-hidden="true">{icon}</span>
      <span className="guess-tile-label">{value}</span>
      <span className="guess-tile-status" aria-hidden="true">{statusSymbol(status)}</span>
    </div>
  );
}

export function GuessBoard({ guesses }: { guesses: GuessRow[] }) {
  if (guesses.length === 0) {
    return null;
  }

  return (
    <div className="guess-board">
      <div className="guess-board-header">Dinosaurio</div>
      <div className="guess-board-header">Periodo</div>
      <div className="guess-board-header">Dieta</div>
      <div className="guess-board-header">Ubicación</div>
      <div className="guess-board-header">Longitud</div>

      {guesses.map((g, index) => {
        const hints = g.hints ?? [];
        const nameStatus = getHint(hints, 'name')?.status;
        const period = getHint(hints, 'period');
        const diet = getHint(hints, 'diet');
        const location = getHint(hints, 'location');
        const length = getHint(hints, 'length_m');

        return (
          <div className="guess-board-row" key={index}>
            <div className={`guess-tile ${tileClass(nameStatus)}`} style={{ animationDelay: '0s' }}>
              <span className="guess-tile-icon" aria-hidden="true">
                <DinoSprite slug={g.dinosaur.slug} fallback={dinoEmoji(g.dinosaur.diet)} />
              </span>
              <span className="guess-tile-label">{g.dinosaur.name}</span>
            </div>
            <GuessTile icon="⏳" status={period?.status} value={String(period?.guessedValue ?? '')} delay={0.1} />
            <GuessTile
              icon={dietEmoji(String(diet?.guessedValue ?? ''))}
              status={diet?.status}
              value={String(diet?.guessedValue ?? '')}
              delay={0.2}
            />
            <GuessTile
              icon="🌍"
              status={location?.status}
              value={Array.isArray(location?.guessedValue) ? location.guessedValue.join(', ') : ''}
              delay={0.3}
            />
            <GuessTile
              icon="📏"
              status={length?.status}
              value={`${length?.guessedValue ?? ''} m${lengthArrow(length?.status)}`}
              delay={0.4}
            />
          </div>
        );
      })}
    </div>
  );
}

function dietEmoji(diet: string): string {
  if (diet === 'Carnívoro') {
    return '🍖';
  }
  if (diet === 'Herbívoro') {
    return '🌿';
  }
  return '🍽️';
}