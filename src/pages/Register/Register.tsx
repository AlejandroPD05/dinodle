import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { signUp } from '../../services/authService';

export function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await signUp(email, password, username);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="dk-panel">
        <p>Revisa tu email para confirmar la cuenta.</p>
      </div>
    );
  }

  return (
    <div className="dk-panel">
      <form onSubmit={handleSubmit}>
        <h1>Crear cuenta</h1>
        <label htmlFor="username">Nombre de usuario</label>
        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" maxLength={30} />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" maxLength={254} />
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} autoComplete="new-password" />
        {error && <p role="alert">{error}</p>}
        <button type="submit">Crear cuenta</button>
        <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </form>
    </div>
  );
}