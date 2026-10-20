import { describe, expect, it } from 'vitest';
import {
  attemptsLeft,
  canPlay,
  duelOutcome,
  formatClock,
  isValidDuelCode,
  normalizeDuelCode,
  sanitizeDuelCode,
  secondsUntil,
} from './duel';
import type { Duel, DuelPlayer } from '../types/duel';

function duel(overrides: Partial<Duel> = {}): Duel {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'ABC234',
    status: 'active',
    created_by: 'user-a',
    created_at: '2026-10-20T10:00:00.000Z',
    started_at: '2026-10-20T10:00:00.000Z',
    ends_at: '2026-10-20T10:05:00.000Z',
    finished_at: null,
    winner_id: null,
    rematch_id: null,
    duration_s: 300,
    max_attempts: 12,
    ...overrides,
  };
}

function player(overrides: Partial<DuelPlayer> = {}): DuelPlayer {
  return {
    user_id: 'user-a',
    username: 'Ana',
    slot: 1,
    attempts: 0,
    solved_at: null,
    joined_at: '2026-10-20T10:00:00.000Z',
    last_seen_at: null,
    ...overrides,
  };
}

describe('códigos de sala', () => {
  it('normaliza minúsculas, espacios y guiones', () => {
    expect(normalizeDuelCode(' abc-234 ')).toBe('ABC234');
    expect(normalizeDuelCode('abc 234')).toBe('ABC234');
  });

  it('acepta un código de seis caracteres del alfabeto', () => {
    expect(isValidDuelCode('ABC234')).toBe(true);
    expect(isValidDuelCode('abc234')).toBe(true);
  });

  it('rechaza longitudes incorrectas o caracteres ambiguos', () => {
    expect(isValidDuelCode('ABC23')).toBe(false);
    expect(isValidDuelCode('ABC2345')).toBe(false);
    expect(isValidDuelCode('ABI234')).toBe(false);
    expect(isValidDuelCode('AB0234')).toBe(false);
  });

  it('sanea la entrada quitando lo que no pertenece al alfabeto', () => {
    expect(sanitizeDuelCode('a-b c!2 3 4')).toBe('ABC234');
    expect(sanitizeDuelCode('AB0I234')).toBe('AB234');
    expect(sanitizeDuelCode('ABC23499')).toBe('ABC234');
  });
});

describe('reloj', () => {
  it('formatea minutos y segundos con dos dígitos', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(300)).toBe('5:00');
  });

  it('nunca muestra tiempos negativos', () => {
    expect(formatClock(-12)).toBe('0:00');
  });

  it('calcula los segundos restantes con el reloj del servidor', () => {
    const now = Date.parse('2026-10-20T10:00:00.000Z');
    expect(secondsUntil('2026-10-20T10:05:00.000Z', now)).toBe(300);
    expect(secondsUntil('2026-10-20T10:04:58.500Z', now)).toBe(299);
    expect(secondsUntil('2026-10-20T09:59:00.000Z', now)).toBe(0);
    expect(secondsUntil(null, now)).toBeNull();
  });
});

describe('intentos', () => {
  it('descuenta hasta cero sin negativos', () => {
    expect(attemptsLeft(12, 0)).toBe(12);
    expect(attemptsLeft(12, 11)).toBe(1);
    expect(attemptsLeft(12, 12)).toBe(0);
    expect(attemptsLeft(12, 15)).toBe(0);
  });

  it('permite jugar solo con el duelo activo, sin resolver y con intentos', () => {
    const d = duel();
    expect(canPlay(d, player({ attempts: 11 }))).toBe(true);
    expect(canPlay(d, player({ attempts: 12 }))).toBe(false);
    expect(canPlay(d, player({ solved_at: '2026-10-20T10:01:00.000Z' }))).toBe(false);
    expect(canPlay(duel({ status: 'finished' }), player())).toBe(false);
    expect(canPlay(d, undefined)).toBe(false);
  });
});

describe('resultado del duelo', () => {
  const me = 'user-a';

  it('mantiene los estados previos al resultado', () => {
    expect(duelOutcome(duel({ status: 'open' }), me)).toBe('open');
    expect(duelOutcome(duel({ status: 'active' }), me)).toBe('active');
    expect(duelOutcome(duel({ status: 'cancelled' }), me)).toBe('cancelled');
  });

  it('resuelve victoria, derrota y empate', () => {
    expect(duelOutcome(duel({ status: 'finished', winner_id: me }), me)).toBe('win');
    expect(duelOutcome(duel({ status: 'finished', winner_id: 'user-b' }), me)).toBe('lose');
    expect(duelOutcome(duel({ status: 'finished', winner_id: null }), me)).toBe('draw');
    expect(duelOutcome(duel({ status: 'expired', winner_id: null }), me)).toBe('draw');
  });
});
