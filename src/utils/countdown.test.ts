import { describe, it, expect } from 'vitest';
import { formatCountdown, msUntilNextUtcMidnight } from './countdown';

describe('msUntilNextUtcMidnight', () => {
  it('queda un segundo a las 23:59:59 UTC', () => {
    expect(msUntilNextUtcMidnight(new Date('2026-10-10T23:59:59Z'))).toBe(1000);
  });

  it('queda un día entero justo a medianoche UTC', () => {
    expect(msUntilNextUtcMidnight(new Date('2026-10-10T00:00:00Z'))).toBe(86_400_000);
  });

  it('cruza bien el cambio de año', () => {
    expect(msUntilNextUtcMidnight(new Date('2026-12-31T23:00:00Z'))).toBe(3_600_000);
  });
});

describe('formatCountdown', () => {
  it('formatea horas, minutos y segundos con dos dígitos', () => {
    expect(formatCountdown(3_661_000)).toBe('01:01:01');
  });

  it('nunca muestra valores negativos', () => {
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });
});