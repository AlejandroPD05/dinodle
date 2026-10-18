import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DINO_MANIFEST } from '../../data/sprites';
import { getAllDinosaurs } from '../../services/dinosaurService';
import { SpriteCard } from '../../components/sprites/SpriteCard';
import type { DinoDiet, DinoPeriod, Dinosaur } from '../../types/dinosaur';
import './sprites.css';

type DietFilter = 'todas' | DinoDiet;
type PeriodFilter = 'todos' | DinoPeriod;

const DIET_FILTERS: { value: DietFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'Herbívoro', label: 'Herbívoro' },
  { value: 'Carnívoro', label: 'Carnívoro' },
  { value: 'Omnívoro', label: 'Omnívoro' },
];

const PERIOD_FILTERS: { value: PeriodFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'Triásico', label: 'Triásico' },
  { value: 'Jurásico', label: 'Jurásico' },
  { value: 'Cretácico', label: 'Cretácico' },
];

/** Búsqueda insensible a mayúsculas y acentos. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Galería pública de sprites (estilo sprites.pmdcollab.org).
 * "Disponibles" = intersección entre el catálogo y el manifiesto generado.
 */
export function SpritesPage() {
  const [dinosaurs, setDinosaurs] = useState<Dinosaur[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState<DietFilter>('todas');
  const [period, setPeriod] = useState<PeriodFilter>('todos');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getAllDinosaurs()
      .then((list) => {
        if (active) {
          setDinosaurs(list);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function reintentar() {
    setError(null);
    setDinosaurs(null);
    setReloadKey((k) => k + 1);
  }

  const available = useMemo(() => {
    return (dinosaurs ?? [])
      .filter((dino) => DINO_MANIFEST[dino.slug] !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [dinosaurs]);

  const normalizedQuery = normalize(query.trim());
  const visible = available.filter((dino) => {
    if (diet !== 'todas' && dino.diet !== diet) {
      return false;
    }
    if (period !== 'todos' && dino.period !== period) {
      return false;
    }
    if (normalizedQuery !== '' && !normalize(dino.name).includes(normalizedQuery)) {
      return false;
    }
    return true;
  });

  const cargando = dinosaurs === null && !error;

  return (
    <div className="sprites-page">
      <header className="sprites-header">
        <div className="sprites-header-top">
          <Link to="/" className="sprites-wordmark">
            Dinodle
          </Link>
          <nav className="sprites-header-nav" aria-label="Enlaces de la galería">
            <a href="#creditos" className="sprites-nav-link">
              Créditos
            </a>
            <Link to="/" className="sprites-nav-link">
              ← Volver al inicio
            </Link>
          </nav>
        </div>
        <p className="sprites-eyebrow">Galería pública</p>
        <h1 className="sprites-title">Sprites</h1>
        <p className="sprites-counter">
          {error
            ? '—'
            : cargando
              ? 'Cargando…'
              : `${available.length} ${available.length === 1 ? 'dinosaurio' : 'dinosaurios'}`}
        </p>
      </header>

      <div className="sprites-toolbar">
        <div className="sprites-search">
          <label htmlFor="sprites-search-input">Buscar sprite</label>
          <input
            id="sprites-search-input"
            type="search"
            maxLength={60}
            value={query}
            placeholder="Buscar por nombre…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="sprites-filters">
          <div className="filter-group" role="group" aria-label="Filtrar por dieta">
            {DIET_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="filter-button"
                aria-pressed={diet === f.value}
                onClick={() => setDiet(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="filter-group" role="group" aria-label="Filtrar por período">
            {PERIOD_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="filter-button"
                aria-pressed={period === f.value}
                onClick={() => setPeriod(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="sprites-error" role="alert">
          <p>No se pudo cargar la galería: {error}</p>
          <button type="button" onClick={reintentar}>
            Reintentar
          </button>
        </div>
      )}

      {cargando && <p>Cargando...</p>}

      {!cargando && !error && (
        <p className="sprites-results" role="status">
          {visible.length === 0
            ? 'Ningún sprite coincide con la búsqueda o los filtros.'
            : `Mostrando ${visible.length} de ${available.length}`}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="sprites-grid" aria-label="Sprites disponibles">
          {visible.map((dino) => (
            <li key={dino.id}>
              <SpriteCard dinosaur={dino} entry={DINO_MANIFEST[dino.slug]} />
            </li>
          ))}
        </ul>
      )}

      <footer id="creditos" className="dk-panel sprites-credits">
        <h2 className="sprites-credits-title">Créditos</h2>
        <p>
          Sprites generados proceduralmente por el estudio de sprites de Dinodle (inspirado en el
          proyecto PMD Collab de la comunidad; sin relación con Nintendo ni Chunsoft).
        </p>
        <p className="sprites-credits-note">
          Los sprites se publican para uso libre con atribución y no comercial.
        </p>
      </footer>
    </div>
  );
}
