import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Dinosaur } from '../../types/dinosaur';

export function DinosaurAutocomplete({
  dinosaurs,
  excludeIds,
  disabled,
  onSelect,
}: {
  dinosaurs: Dinosaur[];
  excludeIds: Set<string>;
  disabled: boolean;
  onSelect: (dino: Dinosaur) => void;
}) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const query = value.trim().toLowerCase();

  const matches = query
    ? dinosaurs
        .filter((d) => d.name.toLowerCase().includes(query) && !excludeIds.has(d.id))
        .sort(
          (a, b) =>
            Number(b.name.toLowerCase().startsWith(query)) - Number(a.name.toLowerCase().startsWith(query))
        )
        .slice(0, 8)
    : [];

  function handleSelect(dino: Dinosaur) {
    onSelect(dino);
    setValue('');
    setOpen(false);
    setHighlighted(0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => (prev + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => (prev - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(matches[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="autocomplete">
      <label htmlFor="dino-guess-input">Adivina un dinosaurio</label>
      <input
        id="dino-guess-input"
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        placeholder="Escribe el nombre de un dinosaurio..."
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls="dino-guess-listbox"
        aria-activedescendant={open && matches.length > 0 ? `dino-option-${matches[highlighted]?.id}` : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      {open && matches.length > 0 && (
        <ul id="dino-guess-listbox" role="listbox" className="autocomplete-list">
          {matches.map((dino, index) => (
            <li
              key={dino.id}
              id={`dino-option-${dino.id}`}
              role="option"
              aria-selected={index === highlighted}
              className={index === highlighted ? 'autocomplete-active' : undefined}
              style={{ animationDelay: `${index * 0.03}s` }}
              onMouseDown={() => handleSelect(dino)}
              onMouseEnter={() => setHighlighted(index)}
            >
              {dino.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}