import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpriteViewer } from './SpriteViewer';
import type { DinoSpriteEntry } from '../../types/sprite';

const ENTRY: DinoSpriteEntry = {
  nombre: 'Allosaurus',
  arquetipo: 'teropodo-grande',
  variante: 'carnosaurio',
  sheet: '/dinos/sprites/sheets/allosaurus.png',
  gifs: {},
  colores: ['#000', '#111', '#222', '#333', '#444', '#555', '#666', '#777'],
  anims: {
    idle: { row: 0, frames: 4, fps: 6 },
    walk: { row: 1, frames: 6, fps: 10 },
    attack: { row: 2, frames: 6, fps: 12 },
    hurt: { row: 3, frames: 2, fps: 12 },
    sleep: { row: 4, frames: 4, fps: 4 },
    faint: { row: 5, frames: 6, fps: 8 },
  },
};

function renderViewer(anim: 'idle' | 'hurt' = 'idle') {
  return render(<SpriteViewer entry={ENTRY} anim={anim} nombre="Allosaurus" />);
}

describe('SpriteViewer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('expone el canvas como imagen con la etiqueta de la animación', () => {
    renderViewer();

    const canvas = screen.getByRole('img', { name: 'Animación Reposo de Allosaurus' });
    expect(canvas.tagName).toBe('CANVAS');
    // Zoom por defecto 2× (64×64 → 128×128).
    expect(canvas).toHaveStyle({ width: '128px', height: '128px' });
  });

  it('alterna reproducción y pausa con aria-pressed', async () => {
    const user = userEvent.setup();
    renderViewer();

    const boton = screen.getByRole('button', { name: 'Pausar' });
    expect(boton).toHaveAttribute('aria-pressed', 'true');

    await user.click(boton);

    const pausado = screen.getByRole('button', { name: 'Reproducir' });
    expect(pausado).toHaveAttribute('aria-pressed', 'false');
  });

  it('no autoreproduce con prefers-reduced-motion: reduce y ofrece Reproducir', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const user = userEvent.setup();
    renderViewer();

    const boton = screen.getByRole('button', { name: 'Reproducir' });
    expect(boton).toHaveAttribute('aria-pressed', 'false');

    await user.click(boton);

    expect(screen.getByRole('button', { name: 'Pausar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cambia velocidad, zoom y fondo con aria-pressed', async () => {
    const user = userEvent.setup();
    renderViewer();

    expect(screen.getByRole('button', { name: 'Velocidad 1×' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'Velocidad 2×' }));
    expect(screen.getByRole('button', { name: 'Velocidad 2×' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Velocidad 1×' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    await user.click(screen.getByRole('button', { name: 'Zoom 4×' }));
    expect(screen.getByRole('img')).toHaveStyle({ width: '256px', height: '256px' });

    await user.click(screen.getByRole('button', { name: 'Fondo claro' }));
    expect(screen.getByRole('button', { name: 'Fondo claro' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Fondo oscuro' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
