import { useCallback, useEffect, useRef, useState } from 'react';
import { SPRITE_ANIM_LABELS } from './animations';
import type { DinoSpriteEntry, SpriteAnimName } from '../../types/sprite';

/** Celda de la hoja: 512×384 = 8 columnas × 6 filas de 64px (ref. 01). */
const CELDA = 64;

type Fondo = 'oscuro' | 'claro' | 'cuadros';

const FONDOS: { value: Fondo; text: string; label: string }[] = [
  { value: 'oscuro', text: 'Oscuro', label: 'Fondo oscuro' },
  { value: 'claro', text: 'Claro', label: 'Fondo claro' },
  { value: 'cuadros', text: 'Cuadros', label: 'Fondo de cuadros' },
];

const VELOCIDADES = [0.5, 1, 2] as const;
const ZOOMS = [1, 2, 3, 4] as const;

/** hurt y faint se reproducen una vez y congelan el último frame (ref. 03). */
function esBucle(anim: SpriteAnimName): boolean {
  return anim !== 'hurt' && anim !== 'faint';
}

function prefiereMovimientoReducido(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface SpriteViewerProps {
  entry: DinoSpriteEntry;
  anim: SpriteAnimName;
  /** Nombre visible del dinosaurio (para el aria-label del canvas). */
  nombre: string;
}

/**
 * Visor del sprite: canvas 64×64 escalado por zoom, una sola requestAnimationFrame,
 * play/pausa, velocidad y fondo. Con prefers-reduced-motion no autoreproduce y
 * ofrece el botón "Reproducir".
 */
export function SpriteViewer({ entry, anim, nombre }: SpriteViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagenRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<SpriteAnimName>(anim);
  const frameRef = useRef(0);
  /** Marca temporal en la que arrancó el frame 0 del segmento actual. */
  const inicioRef = useRef(0);

  /**
   * Estado explícito de reproducción para una animación concreta. Si la animación
   * actual no tiene entrada, se aplica el defecto: autoreproducir (salvo reducido).
   */
  const [estado, setEstado] = useState<{ anim: SpriteAnimName; playing: boolean } | null>(null);
  const [speed, setSpeed] = useState<(typeof VELOCIDADES)[number]>(1);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(2);
  const [fondo, setFondo] = useState<Fondo>('oscuro');

  const playing = estado?.anim === anim ? estado.playing : !prefiereMovimientoReducido();

  const dibujar = useCallback(
    (frame: number) => {
      const canvas = canvasRef.current;
      const imagen = imagenRef.current;
      if (!canvas || !imagen || imagen.naturalWidth === 0) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      const { row } = entry.anims[animRef.current];
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CELDA, CELDA);
      ctx.drawImage(imagen, frame * CELDA, row * CELDA, CELDA, CELDA, 0, 0, CELDA, CELDA);
    },
    [entry]
  );

  // Carga de la hoja: al terminar, pinta el frame actual (con movimiento reducido,
  // el retrato estático) sin arrancar ningún estado.
  useEffect(() => {
    const imagen = new Image();
    imagen.src = entry.sheet;
    imagenRef.current = imagen;

    const alCargar = () => dibujar(frameRef.current);
    imagen.addEventListener('load', alCargar);

    return () => {
      imagen.removeEventListener('load', alCargar);
      imagenRef.current = null;
    };
  }, [entry.sheet, dibujar]);

  // Cambio de animación: vuelve al primer frame (refs + canvas son sistema externo).
  useEffect(() => {
    animRef.current = anim;
    frameRef.current = 0;
    inicioRef.current = performance.now();
    dibujar(0);
  }, [anim, dibujar]);

  // Cambio de velocidad: reajusta el reloj para no saltar de frame.
  useEffect(() => {
    const { fps } = entry.anims[animRef.current];
    inicioRef.current = performance.now() - frameRef.current * (1000 / (fps * speed));
  }, [speed, entry]);

  // Única requestAnimationFrame del visor: avanza frames mientras se reproduce.
  useEffect(() => {
    if (!playing) {
      return;
    }

    let raf = 0;
    const paso = (tiempo: number) => {
      const actual = animRef.current;
      const { frames, fps } = entry.anims[actual];
      const duracionFrame = 1000 / (fps * speed);
      const crudo = Math.floor((tiempo - inicioRef.current) / duracionFrame);

      if (esBucle(actual)) {
        frameRef.current = ((crudo % frames) + frames) % frames;
        dibujar(frameRef.current);
        raf = requestAnimationFrame(paso);
        return;
      }

      frameRef.current = Math.min(crudo, frames - 1);
      dibujar(frameRef.current);
      if (frameRef.current >= frames - 1) {
        setEstado({ anim: actual, playing: false }); // congela el último frame
        return;
      }
      raf = requestAnimationFrame(paso);
    };

    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [playing, entry, anim, speed, dibujar]);

  function alternarReproduccion() {
    if (playing) {
      setEstado({ anim, playing: false });
      return;
    }
    const { frames, fps } = entry.anims[anim];
    if (!esBucle(anim) && frameRef.current >= frames - 1) {
      // Repetir una animación de un solo tiro: desde el principio.
      frameRef.current = 0;
      dibujar(0);
    }
    inicioRef.current = performance.now() - frameRef.current * (1000 / (fps * speed));
    setEstado({ anim, playing: true });
  }

  return (
    <div className="sprites-viewer">
      <div className={`sprites-stage sprites-fondo-${fondo}`}>
        <canvas
          ref={canvasRef}
          className="sprites-canvas"
          width={CELDA}
          height={CELDA}
          role="img"
          aria-label={`Animación ${SPRITE_ANIM_LABELS[anim]} de ${nombre}`}
          style={{ width: `${CELDA * zoom}px`, height: `${CELDA * zoom}px` }}
        />
      </div>

      <div className="sprites-viewer-controls">
        <button
          type="button"
          className="sprites-control-button sprites-play-button"
          aria-pressed={playing}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={alternarReproduccion}
        >
          {playing ? 'Pausar' : 'Reproducir'}
        </button>

        <div className="sprites-control-group" role="group" aria-label="Velocidad">
          <span className="sprites-control-label" aria-hidden="true">
            Velocidad
          </span>
          {VELOCIDADES.map((valor) => (
            <button
              key={valor}
              type="button"
              className="sprites-control-button"
              aria-pressed={speed === valor}
              aria-label={`Velocidad ${valor}×`}
              onClick={() => setSpeed(valor)}
            >
              {valor}×
            </button>
          ))}
        </div>

        <div className="sprites-control-group" role="group" aria-label="Zoom">
          <span className="sprites-control-label" aria-hidden="true">
            Zoom
          </span>
          {ZOOMS.map((valor) => (
            <button
              key={valor}
              type="button"
              className="sprites-control-button"
              aria-pressed={zoom === valor}
              aria-label={`Zoom ${valor}×`}
              onClick={() => setZoom(valor)}
            >
              {valor}×
            </button>
          ))}
        </div>

        <div className="sprites-control-group" role="group" aria-label="Fondo">
          <span className="sprites-control-label" aria-hidden="true">
            Fondo
          </span>
          {FONDOS.map((opcion) => (
            <button
              key={opcion.value}
              type="button"
              className="sprites-control-button"
              aria-pressed={fondo === opcion.value}
              aria-label={opcion.label}
              onClick={() => setFondo(opcion.value)}
            >
              {opcion.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
