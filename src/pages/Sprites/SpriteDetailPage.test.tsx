import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SpriteDetailPage } from './SpriteDetailPage';
import { getAllDinosaurs } from '../../services/dinosaurService';
import { useAuth } from '../../context/AuthContext';
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

  return {
    MANIFEST: {
      allosaurus: {
        nombre: 'Allosaurus',
        arquetipo: 'teropodo-grande',
        variante: 'carnosaurio',
        sheet: '/dinos/sprites/sheets/allosaurus.png',
        // A propósito sin attack/sleep/faint: su botón de GIF debe ocultarse.
        gifs: {
          idle: '/dinos/sprites/gifs/allosaurus-idle.gif',
          walk: '/dinos/sprites/gifs/allosaurus-walk.gif',
        },
        colores: ['#000', '#111', '#222', '#333', '#444', '#555', '#666', '#777'],
        anims,
      },
      triceratops: {
        nombre: 'Triceratops',
        arquetipo: 'ceratopsio',
        variante: 'ceratopsido',
        sheet: '/dinos/sprites/sheets/triceratops.png',
        gifs: { idle: '/dinos/sprites/gifs/triceratops-idle.gif' },
        colores: ['#000', '#111', '#222', '#333', '#444', '#555', '#666', '#777'],
        anims,
      },
    },
  };
});

vi.mock('../../data/sprites', () => ({ DINO_MANIFEST: MANIFEST }));

vi.mock('../../services/dinosaurService', () => ({
  getAllDinosaurs: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const CATALOGO: Dinosaur[] = [
  {
    id: 'dino-1',
    name: 'Allosaurus',
    scientific_name: 'Allosaurus fragilis',
    slug: 'allosaurus',
    description: 'Un terópodo jurásico.',
    period: 'Jurásico',
    diet: 'Carnívoro',
    location: ['Norteamérica', 'Europa'],
    length_m: 12,
    height_m: null,
    weight_kg: null,
    image_url: null,
    sprite_url: null,
    rarity: 'poco común',
  },
  {
    id: 'dino-2',
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
    rarity: 'raro',
  },
];

function renderDetalle(ruta = '/sprites/allosaurus') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/sprites/:slug" element={<SpriteDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SpriteDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getAllDinosaurs).mockResolvedValue(CATALOGO);
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false });
  });

  it('cambia de pestaña: aria-selected y aria-label del canvas', async () => {
    const user = userEvent.setup();
    renderDetalle();

    const canvas = await screen.findByRole('img', { name: 'Animación Reposo de Allosaurus' });
    const tabCaminar = screen.getByRole('tab', { name: 'Caminar' });

    await user.click(tabCaminar);

    expect(tabCaminar).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Reposo' })).toHaveAttribute('aria-selected', 'false');
    expect(canvas).toHaveAccessibleName('Animación Caminar de Allosaurus');

    // Teclado: ←/→ mueven la pestaña activa.
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Ataque' })).toHaveAttribute('aria-selected', 'true');
    expect(canvas).toHaveAccessibleName('Animación Ataque de Allosaurus');
  });

  it('los botones de descarga apuntan a la hoja y al GIF de la animación actual', async () => {
    const user = userEvent.setup();
    renderDetalle();

    const hoja = await screen.findByRole('link', { name: /Descargar hoja PNG/ });
    expect(hoja).toHaveAttribute('href', '/dinos/sprites/sheets/allosaurus.png');
    expect(hoja).toHaveAttribute('download');

    expect(screen.getByRole('link', { name: 'Descargar GIF (Reposo)' })).toHaveAttribute(
      'href',
      '/dinos/sprites/gifs/allosaurus-idle.gif'
    );

    await user.click(screen.getByRole('tab', { name: 'Caminar' }));
    expect(screen.getByRole('link', { name: 'Descargar GIF (Caminar)' })).toHaveAttribute(
      'href',
      '/dinos/sprites/gifs/allosaurus-walk.gif'
    );

    // Sin GIF generado para esa animación: el botón desaparece, la hoja sigue.
    await user.click(screen.getByRole('tab', { name: 'Ataque' }));
    expect(screen.queryByRole('link', { name: /Descargar GIF/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar hoja PNG/ })).toBeInTheDocument();
  });

  it('navega en orden alfabético con anterior/siguiente', async () => {
    renderDetalle();

    const siguiente = await screen.findByRole('link', { name: 'Siguiente: Triceratops' });
    expect(siguiente).toHaveAttribute('href', '/sprites/triceratops');
    expect(screen.queryByRole('link', { name: /Anterior/ })).not.toBeInTheDocument();
  });

  it('muestra "Sprite no encontrado" con enlace de vuelta si el slug no existe', async () => {
    renderDetalle('/sprites/no-existe');

    expect(await screen.findByText('Sprite no encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la galería' })).toHaveAttribute(
      'href',
      '/sprites'
    );
  });

  it('muestra la ficha del dinosaurio sin enlace al DinoDex si no hay sesión', async () => {
    renderDetalle();

    await screen.findByRole('heading', { name: 'Allosaurus', level: 2 });
    expect(screen.getByText('Allosaurus fragilis')).toBeInTheDocument();
    expect(screen.getByText('Un terópodo jurásico.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver ficha en el DinoDex' })).not.toBeInTheDocument();
  });

  it('enlaza a /dinodex/:slug solo si hay sesión', async () => {
    vi.mocked(useAuth).mockReturnValue({ session: {} as never, loading: false });
    renderDetalle();

    const enlace = await screen.findByRole('link', { name: 'Ver ficha en el DinoDex' });
    expect(enlace).toHaveAttribute('href', '/dinodex/allosaurus');
  });
});
