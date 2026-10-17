import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DinosaurPage } from './Dinosaur';
import { getDinosaurBySlug, isDinosaurUnlocked } from '../../services/dinosaurService';
import type { Dinosaur } from '../../types/dinosaur';

vi.mock('../../services/dinosaurService', () => ({
  getDinosaurBySlug: vi.fn(),
  isDinosaurUnlocked: vi.fn(),
}));

const triceratops: Dinosaur = {
  id: 'dino-1',
  name: 'Triceratops',
  scientific_name: 'Triceratops horridus',
  slug: 'triceratops',
  description: 'Un ceratopsio de tres cuernos.',
  period: 'Cretácico',
  diet: 'Herbívoro',
  location: ['Norteamérica'],
  length_m: 9,
  height_m: null,
  weight_kg: null,
  image_url: null,
  sprite_url: null,
  rarity: 'común',
};

function renderFicha(initialEntry = '/dinodex/triceratops') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dinodex/:slug" element={<DinosaurPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DinosaurPage', () => {
  it('muestra la ficha descubierta y enlaza a su sprite en la galería', async () => {
    vi.mocked(getDinosaurBySlug).mockResolvedValue(triceratops);
    vi.mocked(isDinosaurUnlocked).mockResolvedValue(true);
    renderFicha();

    expect(await screen.findByText('Triceratops')).toBeInTheDocument();
    expect(screen.getByText('Triceratops horridus')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en la galería de sprites' })).toHaveAttribute(
      'href',
      '/sprites/triceratops'
    );
  });

  it('avisa cuando el dinosaurio no existe', async () => {
    vi.mocked(getDinosaurBySlug).mockResolvedValue(null);
    renderFicha('/dinodex/no-existe');

    expect(await screen.findByRole('alert')).toHaveTextContent('Dinosaurio no encontrado');
  });

  it('no desvela nada si el dinosaurio sigue bloqueado', async () => {
    vi.mocked(getDinosaurBySlug).mockResolvedValue(triceratops);
    vi.mocked(isDinosaurUnlocked).mockResolvedValue(false);
    renderFicha();

    expect(await screen.findByText('Todavía no has descubierto este dinosaurio.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver en la galería de sprites' })).not.toBeInTheDocument();
  });
});
