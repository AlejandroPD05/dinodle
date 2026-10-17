import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { updatePassword, signOut } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export function ResetPassword() {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repeat) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    await signOut();
    setSaving(false);
    setDone(true);
  }

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (done) {
    return (
      <div className="dk-panel">
        <h1>Contraseña actualizada</h1>
        <p>Ya puedes entrar con tu nueva contraseña.</p>
        <p>
          <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="dk-panel">
        <h1>Enlace no válido</h1>
        <p>El enlace para restablecer la contraseña ha caducado o ya se ha usado.</p>
        <p>
          <Link to="/forgot-password">Pedir otro enlace</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="dk-panel">
      <form onSubmit={handleSubmit}>
        <h1>Nueva contraseña</h1>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <label htmlFor="repeat">Repite la contraseña</label>
        <input
          id="repeat"
          type="password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
          minLength={6}
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saving}>
          Guardar contraseña
        </button>
      </form>
    </div>
  );
}
