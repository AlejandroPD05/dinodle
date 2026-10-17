import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Countdown } from '../../components/game/Countdown';
import { GuessBoard } from '../../components/game/GuessBoard';
import type { GuessRow } from '../../services/gameService';

const EXAMPLE_GUESS: GuessRow = {
  dinosaur: {
    id: 'example',
    name: 'Allosaurus',
    scientific_name: null,
    slug: 'allosaurus',
    description: null,
    period: 'Jurásico',
    diet: 'Carnívoro',
    location: ['Norteamérica'],
    length_m: 8.5,
    height_m: null,
    weight_kg: null,
    image_url: null,
    sprite_url: null,
    rarity: null,
  },
  hints: [
    { attribute: 'name', status: 'incorrect', guessedValue: 'Allosaurus' },
    { attribute: 'period', status: 'incorrect', guessedValue: 'Jurásico' },
    { attribute: 'diet', status: 'incorrect', guessedValue: 'Carnívoro' },
    { attribute: 'location', status: 'correct', guessedValue: ['Norteamérica'] },
    { attribute: 'length_m', status: 'higher', guessedValue: 8.5 },
  ],
};

const STEPS = [
  'Escribe el nombre de un dinosaurio y elígelo de la lista. Los intentos son ilimitados, pero no puedes repetir.',
  'Cada casilla compara tu dinosaurio con el secreto: verde si coincide, ámbar si te acercas y rojo si fallas. Las flechas indican si el secreto es más largo (↑) o más corto (↓).',
  'Cuando lo descubras, entra en tu DinoDex y sube tu racha. Mañana te espera uno nuevo.',
];

export function Home() {
  const { session, loading } = useAuth();

  return (
    <div className="home">
      <section className="home-hero">
        <h1 className="home-title">Dinodle</h1>
        <p className="home-tagline">Un dinosaurio secreto cada día. ¿Puedes descubrirlo?</p>

        {!loading && (
          <div className="home-actions">
            {session ? (
              <>
                <Link to="/play" className="button-link">Jugar</Link>
                <Link to="/dinodex" className="button-link button-link-secondary">DinoDex</Link>
                <Link to="/profile" className="button-link button-link-secondary">Perfil</Link>
                <Link to="/sprites" className="button-link button-link-secondary">Galería de sprites</Link>
              </>
            ) : (
              <>
                <Link to="/register" className="button-link">Crear cuenta</Link>
                <Link to="/login" className="button-link button-link-secondary">Entrar</Link>
                <Link to="/sprites" className="button-link button-link-secondary">Galería de sprites</Link>
              </>
            )}
          </div>
        )}

        <p className="countdown-line">
          Próximo dinosaurio en <Countdown />
        </p>
      </section>

      <section className="dk-panel">
        <div className="dk-panel-header">Cómo se juega</div>

        <ol className="home-steps">
          {STEPS.map((text, index) => (
            <li key={text} style={{ animationDelay: `${0.15 + index * 0.12}s` }}>
              <span className="home-step-number" aria-hidden="true">{index + 1}</span>
              <p>{text}</p>
            </li>
          ))}
        </ol>

        <GuessBoard guesses={[EXAMPLE_GUESS]} />
        <p className="home-example-caption">
          Ejemplo: el dinosaurio secreto es más largo que un Allosaurus y vive en el mismo continente, pero ni su
          periodo ni su dieta coinciden.
        </p>
      </section>
    </div>
  );
}