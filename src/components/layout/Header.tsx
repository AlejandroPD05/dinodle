import { Link, useNavigate } from 'react-router-dom';
import { signOut } from '../../services/authService';

export function Header() {
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <header className="app-header">
      <div className="app-header-bar" aria-hidden="true" />
      <div className="app-header-content">
        <Link to="/play" className="app-wordmark">DINODLE</Link>
        <nav>
          <Link to="/play">Jugar</Link>
          <Link to="/dinodex">DinoDex</Link>
          <Link to="/profile">Perfil</Link>
        </nav>
        <button onClick={handleLogout}>Salir</button>
      </div>
    </header>
  );
}