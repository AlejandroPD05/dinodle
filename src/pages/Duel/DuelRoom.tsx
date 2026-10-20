import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DinosaurAutocomplete } from '../../components/game/DinosaurAutocomplete';
import { GuessBoard } from '../../components/game/GuessBoard';
import { DuelClock } from '../../components/duel/DuelClock';
import { DuelResult } from '../../components/duel/DuelResult';
import { PlayerCard } from '../../components/duel/PlayerCard';
import { useDuel } from '../../hooks/useDuel';
import { duelAction, submitDuelGuess } from '../../services/duelService';
import { getAllDinosaurs } from '../../services/dinosaurService';
import type { GuessRow } from '../../services/gameService';
import type { Dinosaur } from '../../types/dinosaur';
import { attemptsLeft, canPlay } from '../../utils/duel';
import './duel.css';

export function DuelRoom() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <p className="duel-error">Duelo no válido.</p>;
  }

  // La `key` reinicia todo el estado (hook, reloj, formulario) al cambiar de sala.
  return <DuelRoomSession key={id} id={id} />;
}

function DuelRoomSession({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state, loading, error, refresh, onlineIds, remainingSeconds } = useDuel(id);

  const [dinosaurs, setDinosaurs] = useState<Dinosaur[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAllDinosaurs()
      .then(setDinosaurs)
      .catch((err: Error) => setActionError(err.message));
  }, []);

  // Si cualquiera crea la revancha, los dos jugadores van al duelo nuevo.
  useEffect(() => {
    if (state?.duel.rematch_id) {
      navigate(`/duelo/${state.duel.rematch_id}`, { replace: true });
    }
  }, [navigate, state?.duel.rematch_id]);

  const guessRows: GuessRow[] = useMemo(
    () =>
      (state?.guesses ?? []).map((guess) => ({
        dinosaur: guess.dinosaurs,
        hints: guess.hints,
      })),
    [state?.guesses]
  );

  const excludeIds = useMemo(
    () => new Set((state?.guesses ?? []).map((guess) => guess.dinosaur_id)),
    [state?.guesses]
  );

  async function handleGuess(dino: Dinosaur) {
    if (!id || submitting) {
      return;
    }
    setSubmitting(true);
    setActionError(null);

    try {
      await submitDuelGuess(id, dino.id);
      await refresh();
    } catch (err) {
      setActionError((err as Error).message);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!state) {
      return;
    }
    try {
      await navigator.clipboard.writeText(state.duel.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('No se pudo copiar el código. Hazlo a mano.');
    }
  }

  async function handleShare() {
    if (!state) {
      return;
    }
    const shareData = {
      title: 'DinoDuel',
      text: `Te reto a un DinoDuel. Código: ${state.duel.code}`,
      url: `${window.location.origin}/duelo`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} — ${shareData.url}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Cancelar el diálogo nativo no es un error para el jugador.
    }
  }

  async function handleCancel() {
    if (!id || actionBusy) {
      return;
    }
    setActionBusy(true);
    setActionError(null);

    try {
      await duelAction(id, 'cancel');
      navigate('/duelo');
    } catch (err) {
      setActionError((err as Error).message);
      await refresh();
    } finally {
      setActionBusy(false);
    }
  }

  async function handleForfeit() {
    if (!id || actionBusy) {
      return;
    }
    if (!window.confirm('¿Abandonar el duelo? Tu rival ganará.')) {
      return;
    }
    setActionBusy(true);
    setActionError(null);

    try {
      await duelAction(id, 'forfeit');
      await refresh();
    } catch (err) {
      setActionError((err as Error).message);
      await refresh();
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRematch() {
    if (!id || actionBusy) {
      return;
    }
    setActionBusy(true);
    setActionError(null);

    try {
      const result = await duelAction(id, 'rematch');
      navigate(`/duelo/${result.duelId}`, { replace: true });
    } catch (err) {
      setActionError((err as Error).message);
      setActionBusy(false);
    }
  }

  if (loading && !state) {
    return <p className="duel-loading">Cargando duelo…</p>;
  }

  if (error && !state) {
    return (
      <div className="dk-panel">
        <div className="dk-panel-header">No se pudo abrir el duelo</div>
        <p className="duel-error" role="alert">
          {error}
        </p>
        <Link to="/duelo" className="button-link">
          Volver al lobby
        </Link>
      </div>
    );
  }

  if (!state) {
    return null;
  }

  const { duel, players, me, targetDinosaur } = state;
  const mePlayer = players.find((player) => player.user_id === me);
  const sortedPlayers = players.slice().sort((a, b) => a.slot - b.slot);
  const rival = players.find((player) => player.user_id !== me) ?? null;
  const rivalMessage = rival
    ? rival.solved_at
      ? `${rival.username} ha acertado el dinosaurio.`
      : `${rival.username} lleva ${rival.attempts} de ${duel.max_attempts} intentos.`
    : 'Esperando a que entre el rival.';

  if (duel.status === 'finished' || duel.status === 'expired' || duel.status === 'cancelled') {
    return (
      <div className="duel-room">
        <DuelResult
          duel={duel}
          players={players}
          targetDinosaur={targetDinosaur}
          me={me}
          busy={actionBusy}
          error={actionError}
          onRematch={handleRematch}
        />
      </div>
    );
  }

  if (duel.status === 'open') {
    return (
      <div className="duel-room">
        <header className="duel-room-head">
          <Link to="/duelo" className="duel-back">
            ← Salir
          </Link>
          <span className="duel-status duel-status-open">Esperando rival</span>
        </header>

        <p className="duel-sr-only" aria-live="polite">
          {rivalMessage}
        </p>

        <section className="dk-panel duel-waiting">
          <div className="dk-panel-header">Sala privada</div>

          <p className="duel-panel-text">Comparte este código con tu rival:</p>
          <p className="duel-code" aria-label={`Código ${duel.code}`}>
            {duel.code}
          </p>

          <div className="duel-waiting-actions">
            <button type="button" className="button-link" onClick={handleCopy}>
              {copied ? '¡Copiado!' : 'Copiar código'}
            </button>
            <button type="button" className="button-link button-link-secondary" onClick={handleShare}>
              Compartir
            </button>
          </div>

          <p className="duel-help">La partida empieza sola en cuanto entre tu rival.</p>

          <div className="duel-scoreboard duel-scoreboard-single">
            {sortedPlayers.map((player) => (
              <PlayerCard
                key={player.user_id}
                player={player}
                isMe={player.user_id === me}
                online={onlineIds.has(player.user_id)}
                maxAttempts={duel.max_attempts}
              />
            ))}
          </div>

          {actionError && (
            <p className="duel-error" role="alert">
              {actionError}
            </p>
          )}

          <button type="button" className="duel-link-button" onClick={handleCancel} disabled={actionBusy}>
            {actionBusy ? 'Cancelando…' : 'Cancelar sala'}
          </button>
        </section>
      </div>
    );
  }

  const myAttempts = mePlayer?.attempts ?? 0;
  const playable = canPlay(duel, mePlayer);

  return (
    <div className="duel-room">
      <header className="duel-room-head">
        <Link to="/duelo" className="duel-back">
          ← Salir
        </Link>
        <span className="duel-room-code">Sala {duel.code}</span>
        <DuelClock seconds={remainingSeconds} />
      </header>

      <p className="duel-sr-only" aria-live="polite">
        {rivalMessage}
      </p>

      <div className="duel-scoreboard">
        {sortedPlayers.map((player) => (
          <PlayerCard
            key={player.user_id}
            player={player}
            isMe={player.user_id === me}
            online={onlineIds.has(player.user_id)}
            maxAttempts={duel.max_attempts}
          />
        ))}
      </div>

      <section className="dk-panel duel-play">
        <div className="dk-panel-header">Tu turno</div>

        <p className="duel-attempts-line">
          Quedan <strong>{attemptsLeft(duel.max_attempts, myAttempts)}</strong> intentos
          {rival && (
            <span className="duel-rival-line">
              {' '}
              · {rival.username}: {rival.attempts} / {duel.max_attempts}
            </span>
          )}
        </p>

        {!playable ? (
          <p className="duel-panel-text">
            {mePlayer?.solved_at
              ? 'Ya has acertado. Esperando a que termine el duelo…'
              : 'Has agotado tus intentos. Esperando a que termine el duelo…'}
          </p>
        ) : (
          <div className="guess-bar">
            <DinosaurAutocomplete
              dinosaurs={dinosaurs}
              excludeIds={excludeIds}
              disabled={submitting || !playable}
              onSelect={handleGuess}
            />
          </div>
        )}

        {actionError && (
          <p className="duel-error" role="alert">
            {actionError}
          </p>
        )}

        {remainingSeconds === 0 && (
          <p className="duel-help">Se acabó el tiempo. Actualizando el resultado…</p>
        )}
      </section>

      <section className="dk-panel duel-guesses">
        <div className="dk-panel-header">Tus intentos</div>
        {guessRows.length === 0 ? (
          <p className="duel-panel-text">Todavía no has probado ningún dinosaurio.</p>
        ) : (
          <GuessBoard guesses={guessRows} />
        )}
      </section>

      <button type="button" className="duel-link-button" onClick={handleForfeit} disabled={actionBusy}>
        {actionBusy ? 'Saliendo…' : 'Abandonar el duelo'}
      </button>
    </div>
  );
}
