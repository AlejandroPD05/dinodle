import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDinosaurBySlug, isDinosaurUnlocked } from '../../services/dinosaurService';
import type { Dinosaur } from '../../types/dinosaur';
import { DinoSprite } from '../../components/game/DinoSprite';

export function DinosaurPage() {
  const { slug } = useParams<{ slug: string }>();
  const [dinosaur, setDinosaur] = useState<Dinosaur | null>(null);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }

    getDinosaurBySlug(slug)
      .then((dino) => {
        if (!dino) {
          setError('Dinosaurio no encontrado');
          return;
        }
        setDinosaur(dino);
        return isDinosaurUnlocked(dino.id).then(setUnlocked);
      })
      .catch((err: Error) => setError(err.message));
  }, [slug]);

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!dinosaur || unlocked === null) {
    return <p>Cargando...</p>;
  }

  if (!unlocked) {
    return <p>Todavía no has descubierto este dinosaurio.</p>;
  }

  return (
    <div className="dk-panel">
      <div className="dk-panel-header">{dinosaur.name}</div>
      <div className="dinosaur-hero" aria-hidden="true">
        <DinoSprite slug={dinosaur.slug} />
      </div>
      <p>{dinosaur.scientific_name}</p>
      <p>{dinosaur.description}</p>
      <p>Periodo: {dinosaur.period}</p>
      <p>Dieta: {dinosaur.diet}</p>
      <p>Ubicación: {dinosaur.location.join(', ')}</p>
      {dinosaur.length_m && <p>Longitud: {dinosaur.length_m} m</p>}
      {dinosaur.height_m && <p>Altura: {dinosaur.height_m} m</p>}
      {dinosaur.weight_kg && <p>Peso: {dinosaur.weight_kg} kg</p>}
      <p className="dinosaur-gallery-line">
        <Link to={`/sprites/${dinosaur.slug}`} className="button-link button-link-secondary">
          Ver en la galería de sprites
        </Link>
      </p>
    </div>
  );
}