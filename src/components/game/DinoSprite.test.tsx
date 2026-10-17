import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DinoSprite } from './DinoSprite';

vi.mock('../../data/sprites', () => ({
  DINO_MANIFEST: {
    triceratops: {
      nombre: 'Triceratops',
      arquetipo: 'ceratopsio',
      variante: 'ceratopsido',
      sheet: '/dinos/sprites/sheets/triceratops.png',
      gifs: {},
      colores: ['#2f2410', '#56431c', '#7f6a2e', '#b09a54', '#17340b', '#276012', '#368d20', '#5ac044'],
      anims: {
        idle: { row: 0, frames: 4, fps: 6 },
        walk: { row: 1, frames: 6, fps: 10 },
        attack: { row: 2, frames: 6, fps: 12 },
        hurt: { row: 3, frames: 2, fps: 12 },
        sleep: { row: 4, frames: 4, fps: 4 },
        faint: { row: 5, frames: 6, fps: 8 },
      },
    },
  },
}));

describe('DinoSprite', () => {
  it('pinta un span con la hoja del manifiesto', () => {
    const { container } = render(<DinoSprite slug="triceratops" />);
    const span = container.querySelector<HTMLSpanElement>('span.dino-sprite');

    expect(span).not.toBeNull();
    expect(span?.style.backgroundImage).toContain('/dinos/sprites/sheets/triceratops.png');
  });

  it('usa el emoji de reserva y no pinta span si el slug no está en el manifiesto', () => {
    const { container } = render(<DinoSprite slug="desconocido" fallback="🦎" />);

    expect(screen.getByText('🦎')).toBeInTheDocument();
    expect(container.querySelector('span')).toBeNull();
  });

  it('la prop anim coloca la fila correspondiente en background-position-y', () => {
    const { container, unmount } = render(<DinoSprite slug="triceratops" anim="attack" />);
    expect(container.querySelector<HTMLSpanElement>('span.dino-sprite')?.style.backgroundPositionY).toBe('40%');

    unmount();

    const { container: containerFaint } = render(<DinoSprite slug="triceratops" anim="faint" />);
    expect(containerFaint.querySelector<HTMLSpanElement>('span.dino-sprite')?.style.backgroundPositionY).toBe('100%');
  });
});
