import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { SPRITE_ANIMS } from '../../types/sprite';
import type { SpriteAnimName } from '../../types/sprite';
import { SPRITE_ANIM_LABELS } from './animations';

interface AnimationTabsProps {
  /** Animación activa. */
  anim: SpriteAnimName;
  onChange: (anim: SpriteAnimName) => void;
  /** Prefijo para los ids de pestaña y panel (aria-controls / aria-labelledby). */
  idBase: string;
}

/**
 * Pestañas de animación con patrón ARIA tabs (role=tablist/tab, teclado ←/→, Home/End).
 * La activación es automática: mover el foco cambia la animación.
 */
export function AnimationTabs({ anim, onChange, idBase }: AnimationTabsProps) {
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function activar(indice: number) {
    const destino = SPRITE_ANIMS[indice];
    onChange(destino);
    tabsRef.current[indice]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const actual = SPRITE_ANIMS.indexOf(anim);

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      activar((actual + 1) % SPRITE_ANIMS.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      activar((actual - 1 + SPRITE_ANIMS.length) % SPRITE_ANIMS.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      activar(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      activar(SPRITE_ANIMS.length - 1);
    }
  }

  return (
    <div className="sprites-tabs" role="tablist" aria-label="Animaciones" onKeyDown={handleKeyDown}>
      {SPRITE_ANIMS.map((nombre, indice) => (
        <button
          key={nombre}
          ref={(el) => {
            tabsRef.current[indice] = el;
          }}
          type="button"
          role="tab"
          id={`${idBase}-tab-${nombre}`}
          className="sprites-tab"
          aria-selected={nombre === anim}
          aria-controls={`${idBase}-panel`}
          tabIndex={nombre === anim ? 0 : -1}
          onClick={() => onChange(nombre)}
        >
          {SPRITE_ANIM_LABELS[nombre]}
        </button>
      ))}
    </div>
  );
}
