import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DinoDex } from './DinoDex';
import { getDinoDex } from '../../services/dinosaurService';
import type { UnlockedDinosaur } from '../../services/dinosaurService';

vi.mock('../../services/dinosaurService', () => ({
  getDinoDex: vi.fn(),
}));

function dino(id: string, name: string, unlocked: boolean): UnlockedDinosaur {
  return {
    id,
    name,
    scientific_name: null,
    slug: name.toLowerCase(),
    description: null,
    period: 'Cretácico',
    diet: 'Carnívoro',
    location: ['Norteamérica'],
    length_m: 10,
    height_m: null,
    weight_kg: null,
    image_url: null,
    sprite_url: null,
    rarity: 'común',
    unlocked,
  };
}

const sample = [dino('1', 'Allosaurus', true), dino('2', 'Triceratops', true), dino('3', 'Tarbosaurus', false)];

async function renderDinoDex() {
  vi.mocked(getDinoDex).mockResolvedValue(sample);
  render(
    <MemoryRouter>
      <DinoDex />
    </MemoryRouter>
  );
  await screen.findByText('Allosaurus');
}

describe('DinoDex', () => {
  it('cuenta los descubiertos en la barra de progreso', async () => {
    await renderDinoDex();

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3');
  });

  it('busca solo entre los descubiertos y nunca delata un bloqueado', async () => {
    const user = userEvent.setup();
    await renderDinoDex();

    await user.type(screen.getByLabelText('Buscar dinosaurio'), 'tar');

    expect(screen.queryAllByLabelText(/bloqueado/i)).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('Ningún dinosaurio descubierto coincide');
  });

  it('filtra por descubiertos y encuentra por nombre', async () => {
    const user = userEvent.setup();
    await renderDinoDex();

    await user.type(screen.getByLabelText('Buscar dinosaurio'), 'tri');

    expect(screen.getByText('Triceratops')).toBeInTheDocument();
    expect(screen.queryByText('Allosaurus')).not.toBeInTheDocument();
  });

  it('el filtro Bloqueados muestra solo bloqueados y desactiva el buscador', async () => {
    const user = userEvent.setup();
    await renderDinoDex();

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));

    expect(screen.getAllByLabelText(/bloqueado/i)).toHaveLength(1);
    expect(screen.queryByText('Allosaurus')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Buscar dinosaurio')).toBeDisabled();
  });
});