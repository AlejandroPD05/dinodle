import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DinosaurAutocomplete } from './components/game/DinosaurAutocomplete';
import { GuessBoard } from './components/game/GuessBoard';
import { Countdown } from './components/game/Countdown';
import { Home } from './pages/Home/Home';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { ForgotPassword } from './pages/ForgotPassword/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword/ResetPassword';
import { DinoDex } from './pages/DinoDex/DinoDex';
import { DinosaurPage } from './pages/Dinosaur/Dinosaur';
import { Profile } from './pages/Profile/Profile';
import { SpritesPage } from './pages/Sprites/SpritesPage';
import { SpriteDetailPage } from './pages/Sprites/SpriteDetailPage';
import { DuelLobby } from './pages/Duel/DuelLobby';
import { DuelRoom } from './pages/Duel/DuelRoom';
import { getTodayChallenge, submitGuess, getGameStatus, getGuessHistory } from './services/gameService';
import { getAllDinosaurs } from './services/dinosaurService';
import type { DailyChallenge } from './types/dailyChallenge';
import type { Dinosaur } from './types/dinosaur';
import type { GuessRow } from './services/gameService';

function Play() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [dinosaurs, setDinosaurs] = useState<Dinosaur[]>([]);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [status, setStatus] = useState<'playing' | 'won'>('playing');
  const [showResult, setShowResult] = useState(false);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTodayChallenge()
      .then((c) => {
        setChallenge(c);
        return Promise.all([getGuessHistory(c.id), getGameStatus(c.id)]);
      })
      .then(([history, gameStatus]) => {
        setGuesses(history);
        if (gameStatus) {
          setStatus('won');
          setShowResult(true);
          if (gameStatus.targetDinosaur) {
            setTargetName(gameStatus.targetDinosaur.name);
          }
        }
      })
      .catch((err: Error) => setError(err.message));

    getAllDinosaurs().then(setDinosaurs).catch((err: Error) => setError(err.message));
  }, []);

  async function handleGuess(dino: Dinosaur) {
    if (!challenge || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitGuess(challenge.id, dino.id);
      setGuesses((prev) => [...prev, { dinosaur: dino, hints: response.hints }]);
      if (response.status === 'won') {
        setStatus('won');
        if (response.targetDinosaur) {
          setTargetName(response.targetDinosaur.name);
        }
        setTimeout(() => setShowResult(true), 800);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!challenge) {
    return <p>Cargando...</p>;
  }

  const excludeIds = new Set(guesses.map((g) => g.dinosaur.id));

  return (
    <div className="dk-panel">
      {status === 'playing' && (
        <div className="guess-bar">
          <DinosaurAutocomplete
            dinosaurs={dinosaurs}
            excludeIds={excludeIds}
            disabled={submitting}
            onSelect={handleGuess}
          />
        </div>
      )}

      <p>Reto de hoy: {challenge.date} — Intentos: {guesses.length}</p>

      <GuessBoard guesses={guesses} />

      {status === 'won' && showResult && (
        <>
          <h2 className="victory-message">¡Lo has conseguido! Era el {targetName}</h2>
          <p className="countdown-line">
            Próximo dinosaurio en <Countdown />
          </p>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sprites" element={<SpritesPage />} />
          <Route path="/sprites/:slug" element={<SpriteDetailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/play" element={<Play />} />
            <Route path="/dinodex" element={<DinoDex />} />
            <Route path="/dinodex/:slug" element={<DinosaurPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/duelo" element={<DuelLobby />} />
            <Route path="/duelo/:id" element={<DuelRoom />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}