import { Link } from 'react-router-dom';
import { DinoSprite } from '../game/DinoSprite';
import { duelOutcome } from '../../utils/duel';
import type { Duel, DuelPlayer } from '../../types/duel';
import type { Dinosaur } from '../../types/dinosaur';

function targetEmoji(diet: string | undefined): string {
  if (diet === 'Carnívoro') {
    return '🦖';
  }
  if (diet === 'Herbívoro') {
    return '🦕';
  }
  return '🦎';
}

export function DuelResult({
  duel,
  players,
  targetDinosaur,
  me,
  busy,
  error,
  onRematch,
}: {
  duel: Duel;
  players: DuelPlayer[];
  targetDinosaur: Dinosaur | null;
  me: string;
  busy: boolean;
  error: string | null;
  onRematch: () => void;
}) {
  const cancelled = duel.status === 'cancelled';
  const outcome = duelOutcome(duel, me);

  let title = 'Empate';
  if (cancelled) {
    title = 'Duelo cancelado';
  } else if (outcome === 'win') {
    title = '¡Has ganado!';
  } else if (outcome === 'lose') {
    title = 'Has perdido';
  } else if (duel.status === 'expired') {
    title = 'Nadie lo encontró';
  }

  return (
    <section className={`dk-panel duel-result${outcome === 'win' ? ' duel-result-win' : ''}`} aria-live="polite">
      <div className="dk-panel-header">Resultado</div>

      <h2 className="duel-result-title">{title}</h2>

      {targetDinosaur ? (
        <div className="duel-result-target">
          <span className="duel-result-sprite" aria-hidden="true">
            <DinoSprite slug={targetDinosaur.slug} fallback={targetEmoji(targetDinosaur.diet)} />
          </span>
          <div>
            <p className="duel-result-caption">
              {cancelled ? 'Era' : outcome === 'win' || outcome === 'lose' ? 'El dinosaurio secreto era' : 'Era'}
            </p>
            <p className="duel-result-name">{targetDinosaur.name}</p>
            <p className="duel-result-meta">
              {targetDinosaur.period} · {targetDinosaur.diet} ·{' '}
              {targetDinosaur.length_m !== null ? `${targetDinosaur.length_m} m` : 'longitud desconocida'}
            </p>
          </div>
        </div>
      ) : (
        <p className="duel-result-caption">
          {cancelled ? 'Nadie llegó a entrar en la sala.' : 'El dinosaurio secreto sigue a salvo.'}
        </p>
      )}

      <div className="duel-result-score">
        {players
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((player) => (
            <span key={player.user_id} className="duel-result-score-item">
              {player.username}: {player.attempts} intento{player.attempts === 1 ? '' : 's'}
              {player.solved_at && ' · acertó'}
            </span>
          ))}
      </div>

      {error && (
        <p className="duel-error" role="alert">
          {error}
        </p>
      )}

      <div className="duel-result-actions">
        {duel.rematch_id ? (
          <Link to={`/duelo/${duel.rematch_id}`} className="button-link">
            Ir a la revancha
          </Link>
        ) : (
          players.length >= 2 && (
            <button type="button" className="button-link" onClick={onRematch} disabled={busy}>
              {busy ? 'Creando…' : 'Revancha'}
            </button>
          )
        )}
        <Link to="/duelo" className="button-link button-link-secondary">
          Volver al lobby
        </Link>
      </div>
    </section>
  );
}
