import { useState } from 'react';
import type { FormEvent } from 'react';
import { resetPassword } from '../../services/authService';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="dk-panel">
        <p>Te hemos enviado un email para restablecer la contraseña.</p>
      </div>
    );
  }

  return (
    <div className="dk-panel">
      <form onSubmit={handleSubmit}>
        <h1>Recuperar contraseña</h1>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" maxLength={254} />
        {error && <p role="alert">{error}</p>}
        <button type="submit">Enviar enlace</button>
      </form>
    </div>
  );
}