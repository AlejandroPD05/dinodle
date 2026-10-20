import { formatClock } from '../../utils/duel';

export function DuelClock({ seconds }: { seconds: number | null }) {
  if (seconds === null) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const label = formatClock(seconds);

  return (
    <div
      className={`duel-clock${seconds <= 60 ? ' duel-clock-warning' : ''}`}
      role="timer"
      aria-label={`Quedan ${minutes} minutos y ${rest} segundos`}
    >
      <span className="duel-clock-label">Tiempo</span>
      <span className="duel-clock-value">{label}</span>
    </div>
  );
}
