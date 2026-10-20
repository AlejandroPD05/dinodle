import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createDuel, getCurrentDuel, joinDuel } from '../../services/duelService';
import { isValidDuelCode, sanitizeDuelCode } from '../../utils/duel';
import type { Duel } from '../../types/duel';
import './duel.css';

export function DuelLobby() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<Duel | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentDuel()
      .then(setCurrent)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingCurrent(false));
  }, []);

  async function handleCreate() {
    if (busy) {
      return;
    }
    setBusy('create');
    setError(null);

    try {
      const duel = await createDuel();
      navigate(`/duelo/${duel.duelId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !isValidDuelCode(code)) {
      return;
    }
    setBusy('join');
    setError(null);

    try {
      const duel = await joinDuel(code);
      navigate(`/duelo/${duel.duelId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="duel-lobby">
      <section className="duel-hero">
        <p className="duel-kicker">Modo versus</p>
        <h1 className="duel-title">DinoDuel</h1>
        <p className="duel-tagline">
          El mismo dinosaurio secreto para los dos. Gana quien lo acierte primero, con doce intentos y cinco
          minutos.
        </p>
      </section>

      {loadingCurrent ? (
        <p className="duel-loading">Buscando duelos abiertos…</p>
      ) : (
        current && (
          <section className="dk-panel duel-continue">
            <div className="dk-panel-header">Tienes un duelo pendiente</div>
            <p>
              Sala <strong className="duel-code-inline">{current.code}</strong> ·{' '}
              {current.status === 'open' ? 'esperando rival' : 'en curso'}
            </p>
            <Link to={`/duelo/${current.id}`} className="button-link">
              Continuar duelo
            </Link>
          </section>
        )
      )}

      <div className="duel-lobby-grid">
        <section className="dk-panel">
          <div className="dk-panel-header">Crear una sala</div>
          <p className="duel-panel-text">
            Se genera un código de seis caracteres. Compártelo con tu rival y empezad cuando entre.
          </p>
          <button type="button" className="button-link" onClick={handleCreate} disabled={busy !== null}>
            {busy === 'create' ? 'Creando…' : 'Crear sala'}
          </button>
        </section>

        <section className="dk-panel">
          <div className="dk-panel-header">Unirse con código</div>
          <form className="duel-join-form" onSubmit={handleJoin}>
            <label htmlFor="duel-code">Código del duelo</label>
            <input
              id="duel-code"
              className="duel-code-input"
              value={code}
              onChange={(event) => setCode(sanitizeDuelCode(event.target.value))}
              placeholder="ABC234"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="duel-code-help"
            />
            <p id="duel-code-help" className="duel-help">
              Seis caracteres, sin las letras I, O ni los números 0, 1. No se distingue entre mayúsculas y
              minúsculas.
            </p>
            <button type="submit" className="button-link" disabled={busy !== null || !isValidDuelCode(code)}>
              {busy === 'join' ? 'Entrando…' : 'Unirme'}
            </button>
          </form>
        </section>
      </div>

      {error && (
        <p className="duel-error" role="alert">
          {error}
        </p>
      )}

      <p className="duel-lobby-note">
        Los duelos caducan a los cinco minutos. Si tu rival no aparece, puedes cancelar la sala y crear otra.
      </p>
    </div>
  );
}
