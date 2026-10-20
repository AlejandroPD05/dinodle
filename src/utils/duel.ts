import type { Duel, DuelPlayer } from '../types/duel';

/** Mismo alfabeto que `_shared/duel.ts`: sin I, O, 0 ni 1. */
export const DUEL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeDuelCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '');
}

/** Deja solo caracteres válidos, en mayúsculas y como máximo seis. */
export function sanitizeDuelCode(raw: string): string {
  return [...normalizeDuelCode(raw)]
    .filter((char) => DUEL_CODE_ALPHABET.includes(char))
    .join('')
    .slice(0, 6);
}

export function isValidDuelCode(raw: string): boolean {
  const code = normalizeDuelCode(raw);
  return code.length === 6 && [...code].every((char) => DUEL_CODE_ALPHABET.includes(char));
}

/** `300` → `5:00`; los negativos se recortan a cero. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Segundos de reloj entre `endsAt` y un instante de servidor en milisegundos. */
export function secondsUntil(endsAt: string | null, serverNowMs: number): number | null {
  if (!endsAt) {
    return null;
  }
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) {
    return null;
  }
  return Math.max(0, Math.ceil((end - serverNowMs) / 1000));
}

export function attemptsLeft(maxAttempts: number, attempts: number): number {
  return Math.max(0, maxAttempts - attempts);
}

export function canPlay(
  duel: Pick<Duel, 'status' | 'max_attempts'>,
  player: Pick<DuelPlayer, 'attempts' | 'solved_at'> | undefined
): boolean {
  return (
    duel.status === 'active' &&
    player !== undefined &&
    player.solved_at === null &&
    player.attempts < duel.max_attempts
  );
}

export type DuelOutcome = 'open' | 'active' | 'win' | 'lose' | 'draw' | 'cancelled';

export function duelOutcome(
  duel: Pick<Duel, 'status' | 'winner_id'>,
  me: string
): DuelOutcome {
  if (duel.status === 'open') {
    return 'open';
  }
  if (duel.status === 'active') {
    return 'active';
  }
  if (duel.status === 'cancelled') {
    return 'cancelled';
  }
  if (duel.status === 'expired' || duel.winner_id === null) {
    return 'draw';
  }
  return duel.winner_id === me ? 'win' : 'lose';
}
