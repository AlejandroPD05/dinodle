import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDinoDex } from '../../services/dinosaurService';
import type { UnlockedDinosaur } from '../../services/dinosaurService';
import { DinoSprite } from '../../components/game/DinoSprite';

type Filter = 'all' | 'unlocked' | 'locked';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unlocked', label: 'Descubiertos' },
  { value: 'locked', label: 'Bloqueados' },
];

function dinoEmoji(diet: string): string {
  if (diet === 'Carnívoro') {
    return '🦖';
  }
  if (diet === 'Herbívoro') {
    return '🦕';
  }
  return '🦎';
}

function rarityStars(rarity: string | null): string {
  if (rarity === 'raro') {
    return '★★★';
  }
  if (rarity === 'poco común') {
    return '★★';
  }
  return '★';
}

export function DinoDex() {
  const [dinosaurs, setDinosaurs] = useState<UnlockedDinosaur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    getDinoDex()
      .then(setDinosaurs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return <p role="alert">{error}</p>;
  }

  const total = dinosaurs.length;
  const unlockedCount = dinosaurs.filter((d) => d.unlocked).length;
  const percent = total === 0 ? 0 : Math.round((unlockedCount / total) * 100);

  const normalizedQuery = query.trim().toLowerCase();
  const searching = filter !== 'locked' && normalizedQuery !== '';

  const visible = dinosaurs.filter((dino) => {
    if (searching) {
      return dino.unlocked && dino.name.toLowerCase().includes(normalizedQuery);
    }
    if (filter === 'unlocked') {
      return dino.unlocked;
    }
    if (filter === 'locked') {
      return !dino.unlocked;
    }
    return true;
  });

  return (
    <div className="dk-panel">
      <div className="dk-panel-header">DinoDex</div>

      <p className="dinodex-counter">
        Descubiertos: <strong>{unlockedCount}</strong> / {total} ({percent}%)
      </p>
      <div
        className="dinodex-progress"
        role="progressbar"
        aria-label="Dinosaurios descubiertos"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={unlockedCount}
      >
        <div className="dinodex-progress-bar" style={{ width: `${percent}%` }} />
      </div>

      <div className="dinodex-toolbar">
        <div className="dinodex-search">
          <label htmlFor="dinodex-search-input">Buscar dinosaurio</label>
          <input
            id="dinodex-search-input"
            type="search"
            maxLength={60}
            value={query}
            disabled={filter === 'locked'}
            placeholder="Solo entre los descubiertos..."
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-group" role="group" aria-label="Filtrar dinosaurios">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="filter-button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>Cargando...</p>}

      {!loading && visible.length === 0 && (
        <p role="status">
          {searching
            ? `Ningún dinosaurio descubierto coincide con "${query.trim()}". Los bloqueados no se pueden buscar.`
            : 'No hay dinosaurios que mostrar con este filtro.'}
        </p>
      )}

      <div className="dinodex-grid">
        {visible.map((dino) =>
          dino.unlocked ? (
            <Link to={`/dinodex/${dino.slug}`} key={dino.id} className="dinodex-card unlocked">
              <div className="dinodex-card-emoji" aria-hidden="true">
                <DinoSprite slug={dino.slug} fallback={dinoEmoji(dino.diet)} />
              </div>
              <strong>{dino.name}</strong>
              <div className="dinodex-card-stars" aria-label={`Rareza: ${dino.rarity ?? 'común'}`}>
                {rarityStars(dino.rarity)}
              </div>
            </Link>
          ) : (
            <div key={dino.id} className="dinodex-card locked" aria-label="Dinosaurio bloqueado, todavía no descubierto">
              <div className="dinodex-card-emoji" aria-hidden="true">🔒</div>
              <strong>???</strong>
            </div>
          )
        )}
      </div>
    </div>
  );
}