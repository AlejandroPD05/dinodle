import { describe, it, expect } from 'vitest';
import { getMonthDays } from '../../utils/calendar';

describe('getMonthDays', () => {
  it('devuelve el número correcto de días de un mes de 31 días', () => {
    const days = getMonthDays(2026, 9);
    expect(days).toHaveLength(31);
  });

  it('devuelve el número correcto de días de febrero en año bisiesto', () => {
    const days = getMonthDays(2024, 1);
    expect(days).toHaveLength(29);
  });

  it('el primer día generado es el día 1 del mes pedido', () => {
    const days = getMonthDays(2026, 9);
    expect(days[0].getDate()).toBe(1);
    expect(days[0].getMonth()).toBe(9);
  });
});