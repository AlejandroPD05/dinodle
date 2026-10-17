import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home', () => {
  it('ofrece crear cuenta y entrar a quien no tiene sesión', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false });
    renderHome();

    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Jugar' })).not.toBeInTheDocument();
  });

  it('lleva a jugar a quien ya tiene sesión', () => {
    vi.mocked(useAuth).mockReturnValue({ session: {} as never, loading: false });
    renderHome();

    expect(screen.getByRole('link', { name: 'Jugar' })).toHaveAttribute('href', '/play');
    expect(screen.getByRole('link', { name: 'DinoDex' })).toHaveAttribute('href', '/dinodex');
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('no muestra botones mientras se comprueba la sesión', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: true });
    renderHome();

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Jugar' })).not.toBeInTheDocument();
  });

  it('enseña un ejemplo real del tablero y el temporizador', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false });
    renderHome();

    expect(screen.getByRole('heading', { level: 1, name: 'Dinodle' })).toBeInTheDocument();
    expect(screen.getByText('Allosaurus')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('enlaza a la galería pública de sprites con y sin sesión', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false });
    const { unmount } = renderHome();
    expect(screen.getByRole('link', { name: 'Galería de sprites' })).toHaveAttribute('href', '/sprites');

    unmount();
    vi.mocked(useAuth).mockReturnValue({ session: {} as never, loading: false });
    renderHome();
    expect(screen.getByRole('link', { name: 'Galería de sprites' })).toHaveAttribute('href', '/sprites');
  });
});