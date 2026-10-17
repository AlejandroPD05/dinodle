import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SpritesPage } from './SpritesPage';
import { getAllDinosaurs } from '../../services/dinosaurService';
import type { Dinosaur } from '../../types/dinosaur';

const { MANIFEST } = vi.hoisted(() => {
  const anims = {
    idle: { row: 0, frames: 4, fps: 6 },
    walk: { row: 1, frames: 6, fps: 10 },
    attack: { row: 2, frames: 6, fps: 12 },
    hurt: { row: 3, frames: 2, fps: 12 },
    sleep: { row: 4, frames: 4, fps: 4 },
    faint: { row: 5, frames: 6, fps: 8 },
  };

  const entry = (nombre: string, slug: string) => ({
    nombre,
    arquetipo: 'teropodo-grande',
    variante: 'base',
    sheet: `/dinos/sprites/sheets/${slug}.png`,
    gifs: { idle: `/dinos/sprites/gifs/${slug}-idle.gif` },
    colores: ['#000', '#111', '#222', '#333', '#444', '#555', '#666', '#777'],
    anims,
  });

  return {
    MANIFEST: {
      allosaurus: entry('Allosaurus', 'allosaurus'),
      triceratops: entry('Triceratops', 'triceratops'),
      // En el manifiesto pero no en el catálogo: no debe contarse.
      spinosaurus: entry('Spinosaurus', 'spinosaurus'),
    },
  };
});

vi.mock('../../data/sprites', () => ({ DINO_MANIFEST: MANIFEST }));

vi.mock('../../services/dinosaurService', () => ({
  getAllDinosaurs: vi.fn(),
}));

function dino(overrides: Partial<Dinosaur> & { name: string; slug: string }): Dinosaur {
  return {
    id: overrides.slug,
    scientific_name: null,
    description: null,
    period: 'Cretácico',
    diet: 'Carnívoro',
    location: ['Norteamérica'],
    length_m: 9,
    height_m: null,
    weight_kg: null,
    image_url: null,
    sprite_url: null,
    rarity: 'común',
    ...overrides,
  };
}

const CATALOGO: Dinosaur[] = [
  dino({ name: 'Allosaurus', slug: 'allosaurus', period: 'Jurásico', diet: 'Carnívoro' }),
  dino({ name: 'Triceratops', slug: 'triceratops', period: 'Cretácico', diet: 'Herbívoro' }),
  // En el catálogo pero sin entrada del manifiesto: no aparece en la galería.
  dino({ name: 'Stegosaurus', slug: 'stegosaurus', period: 'Jurásico', diet: 'Herbívoro' }),
];

function renderGaleria() {
  vi.mocked(getAllDinosaurs).mockResolvedValue(CATALOGO);
  render(
    <MemoryRouter>
      <SpritesPage />
    </MemoryRouter>
  );
}

async function renderGaleriaLista() {
  renderGaleria();
  await screen.findByRole('link', { name: /allosaurus/i });
}

describe('SpritesPage', () => {
  it('cuenta solo la intersección entre catálogo y manifiesto', async () => {
    await renderGaleriaLista();

    expect(screen.getByText('2 dinosaurios')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 2 de 2');
    expect(screen.queryByRole('link', { name: /stegosaurus/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /spinosaurus/i })).not.toBeInTheDocument();
  });

  it('la búsqueda filtra por nombre y actualiza el contador de resultados', async () => {
    const user = userEvent.setup();
    await renderGaleriaLista();

    await user.type(screen.getByLabelText('Buscar sprite'), 'tric');

    expect(screen.getByRole('link', { name: /triceratops/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /allosaurus/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 2');
  });

  it('el filtro de dieta filtra la rejilla', async () => {
    const user = userEvent.setup();
    await renderGaleriaLista();

    await user.click(screen.getByRole('button', { name: 'Carnívoro' }));

    expect(screen.getByRole('link', { name: /allosaurus/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /triceratops/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Herbívoro' }));

    expect(screen.getByRole('link', { name: /triceratops/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /allosaurus/i })).not.toBeInTheDocument();
  });

  it('el filtro de período filtra la rejilla', async () => {
    const user = userEvent.setup();
    await renderGaleriaLista();

    await user.click(screen.getByRole('button', { name: 'Jurásico' }));

    expect(screen.getByRole('link', { name: /allosaurus/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /triceratops/i })).not.toBeInTheDocument();
  });

  it('avisa con role=alert si el catálogo falla', async () => {
    vi.mocked(getAllDinosaurs).mockRejectedValue(new Error('sin conexión'));
    render(
      <MemoryRouter>
        <SpritesPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('sin conexión');
  });
});
