import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Countdown } from './Countdown';

describe('Countdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el tiempo restante y baja cada segundo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T22:59:58Z'));
    render(<Countdown />);

    expect(screen.getByRole('timer')).toHaveTextContent('01:00:02');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole('timer')).toHaveTextContent('01:00:01');
  });
});