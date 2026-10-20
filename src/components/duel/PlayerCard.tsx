import type { DuelPlayer } from '../../types/duel';

export function PlayerCard({
  player,
  isMe,
  online,
  maxAttempts,
}: {
  player: DuelPlayer;
  isMe: boolean;
  online: boolean;
  maxAttempts: number;
}) {
  const solved = player.solved_at !== null;

  return (
    <article
      className={`duel-player${isMe ? ' duel-player-me' : ''}${solved ? ' duel-player-solved' : ''}`}
      aria-label={`${player.username}${isMe ? ', tú' : ''}: ${player.attempts} de ${maxAttempts} intentos`}
    >
      <div className="duel-player-top">
        <span
          className={`duel-presence${online ? ' is-online' : ' is-offline'}`}
          aria-hidden="true"
        />
        <span className="duel-player-name">
          {player.username}
          {isMe && <span className="duel-player-you"> (tú)</span>}
        </span>
        {solved && <span className="duel-player-badge">Acertó</span>}
      </div>

      <p className="duel-player-attempts">
        <strong>{player.attempts}</strong>
        <span> / {maxAttempts} intentos</span>
      </p>

      <p className="duel-player-state">
        {solved ? 'Dinosaurio encontrado' : online ? 'En línea' : 'Desconectado'}
      </p>
    </article>
  );
}
