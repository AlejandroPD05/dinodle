import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DINO_MANIFEST } from '../../data/sprites';
import { getAllDinosaurs } from '../../services/dinosaurService';
import { useAuth } from '../../context/AuthContext';
import { AnimationTabs } from '../../components/sprites/AnimationTabs';
import { SPRITE_ANIM_LABELS } from '../../components/sprites/animations';
import { SpriteViewer } from '../../components/sprites/SpriteViewer';
import type { DinoSpriteEntry, SpriteAnimName } from '../../types/sprite';
import type { Dinosaur } from '../../types/dinosaur';
import './sprites.css';

/** Emoji de dieta (mismo criterio que DinoDex/GuessBoard). */
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

/**
 * Visor público de un sprite: canvas animado, pestañas, descargas y ficha del dinosaurio.
 * Funciona solo con el manifiesto; el catálogo enriquece la ficha (y la navegación).
 */
export function SpriteDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const [anim, setAnim] = useState<SpriteAnimName>('idle');
  const [dinosaurs, setDinosaurs] = useState<Dinosaur[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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
  }, []);

  const entry: DinoSpriteEntry | undefined = DINO_MANIFEST[slug];

  // Orden alfabético: intersección catálogo+manifiesto; sin catálogo, el manifiesto.
  const siblings = useMemo(() => {
    const enCatalogo = (dinosaurs ?? [])
      .filter((dino) => DINO_MANIFEST[dino.slug] !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const usaCatalogo = enCatalogo.some((dino) => dino.slug === slug);
    const orden = usaCatalogo
      ? enCatalogo.map((dino) => ({ slug: dino.slug, nombre: dino.name }))
      : Object.keys(DINO_MANIFEST)
          .sort((a, b) => DINO_MANIFEST[a].nombre.localeCompare(DINO_MANIFEST[b].nombre, 'es'))
          .map((s) => ({ slug: s, nombre: DINO_MANIFEST[s].nombre }));

    const indice = orden.findIndex((o) => o.slug === slug);
    return {
      prev: indice > 0 ? orden[indice - 1] : null,
      next: indice >= 0 && indice < orden.length - 1 ? orden[indice + 1] : null,
    };
  }, [dinosaurs, slug]);

  async function copiarEnlace() {
    const url = `${window.location.origin}/sprites/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback silencioso: si el portapapeles no está disponible, no pasa nada.
    }
  }

  if (!entry) {
    return (
      <div className="sprites-page">
        <header className="sprites-header">
          <div className="sprites-header-top">
            <Link to="/" className="sprites-wordmark">
              Dinodle
            </Link>
            <nav className="sprites-header-nav" aria-label="Enlaces de la galería">
              <Link to="/sprites" className="sprites-nav-link">
                ← Volver a la galería
              </Link>
            </nav>
          </div>
        </header>
        <div className="dk-panel sprites-notfound">
          <h1 className="sprites-notfound-title">Sprite no encontrado</h1>
          <p>No hay ningún sprite con el identificador «{slug}».</p>
          <Link to="/sprites" className="button-link">
            Volver a la galería
          </Link>
        </div>
      </div>
    );
  }

  const dino = dinosaurs?.find((d) => d.slug === slug) ?? null;
  const nombre = dino?.name ?? entry.nombre;
  const idBase = `sprites-visor-${slug}`;
  const gifActual = entry.gifs[anim];

  return (
    <div className="sprites-page">
      <header className="sprites-header">
        <div className="sprites-header-top">
          <Link to="/" className="sprites-wordmark">
            Dinodle
          </Link>
          <nav className="sprites-header-nav" aria-label="Enlaces de la galería">
            <Link to="/sprites" className="sprites-nav-link">
              ← Volver a la galería
            </Link>
          </nav>
        </div>
        <div className="sprites-detail-titlebar">
          <div>
            <p className="sprites-eyebrow">Galería de sprites</p>
            <h1 className="sprites-title">{nombre}</h1>
          </div>
          <div className="sprites-detail-siblings">
            {siblings.prev && (
              <Link
                to={`/sprites/${siblings.prev.slug}`}
                className="sprites-nav-link"
                aria-label={`Anterior: ${siblings.prev.nombre}`}
              >
                ← Anterior
              </Link>
            )}
            {siblings.next && (
              <Link
                to={`/sprites/${siblings.next.slug}`}
                className="sprites-nav-link"
                aria-label={`Siguiente: ${siblings.next.nombre}`}
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="sprites-detail-layout">
        <section className="dk-panel sprites-viewer-panel" aria-label={`Visor de ${nombre}`}>
          <AnimationTabs anim={anim} onChange={setAnim} idBase={idBase} />

          <div
            className="sprites-tabpanel"
            role="tabpanel"
            id={`${idBase}-panel`}
            aria-labelledby={`${idBase}-tab-${anim}`}
          >
            <SpriteViewer entry={entry} anim={anim} nombre={nombre} />
          </div>

          <div className="sprites-downloads">
            <a href={entry.sheet} download className="button-link">
              Descargar hoja PNG
            </a>
            {gifActual && (
              <a href={gifActual} download className="button-link button-link-secondary">
                Descargar GIF ({SPRITE_ANIM_LABELS[anim]})
              </a>
            )}
            <button type="button" onClick={copiarEnlace}>
              {copiado ? 'Copiado ✓' : 'Copiar enlace'}
            </button>
          </div>

          <p className="sprites-detail-credit">
            Sprite generado proceduralmente · <Link to="/sprites#creditos">ver créditos</Link>
          </p>
        </section>

        <aside className="dk-panel sprites-ficha" aria-label={`Ficha de ${nombre}`}>
          <h2 className="sprites-ficha-title">{nombre}</h2>
          {dino?.scientific_name && (
            <p className="sprites-ficha-scientific">{dino.scientific_name}</p>
          )}

          {error && (
            <p className="sprites-ficha-status" role="alert">
              No se pudo cargar la ficha: {error}
            </p>
          )}

          {!dino && !error && <p className="sprites-ficha-status">Cargando ficha…</p>}

          {dino && (
            <dl className="sprites-ficha-list">
              <div className="sprites-ficha-row">
                <dt>Período</dt>
                <dd>{dino.period}</dd>
              </div>
              <div className="sprites-ficha-row">
                <dt>Dieta</dt>
                <dd>
                  <span aria-hidden="true">{dinoEmoji(dino.diet)}</span> {dino.diet}
                </dd>
              </div>
              {dino.length_m !== null && (
                <div className="sprites-ficha-row">
                  <dt>Longitud</dt>
                  <dd>{dino.length_m} m</dd>
                </div>
              )}
              {dino.location.length > 0 && (
                <div className="sprites-ficha-row">
                  <dt>Ubicación</dt>
                  <dd>{dino.location.join(', ')}</dd>
                </div>
              )}
              <div className="sprites-ficha-row">
                <dt>Rareza</dt>
                <dd>
                  <span aria-label={`Rareza: ${dino.rarity ?? 'común'}`}>
                    {rarityStars(dino.rarity)}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          {dino?.description && <p className="sprites-ficha-description">{dino.description}</p>}

          {session && dino && (
            <Link
              to={`/dinodex/${dino.slug}`}
              className="button-link button-link-secondary sprites-ficha-link"
            >
              Ver ficha en el DinoDex
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
