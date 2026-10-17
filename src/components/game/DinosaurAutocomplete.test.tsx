import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DinosaurAutocomplete } from './DinosaurAutocomplete';
import type { Dinosaur } from '../../types/dinosaur';

const dinosaurs: Dinosaur[] = [
  { id: '1', name: 'Tyrannosaurus Rex', scientific_name: null, slug: 't-rex', description: null, period: 'Cretácico', diet: 'Carnívoro', location: ['Norteamérica'], length_m: 12, height_m: null, weight_kg: null, image_url: null, sprite_url: null, rarity: null },
  { id: '2', name: 'Triceratops', scientific_name: null, slug: 'triceratops', description: null, period: 'Cretácico', diet: 'Herbívoro', location: ['Norteamérica'], length_m: 9, height_m: null, weight_kg: null, image_url: null, sprite_url: null, rarity: null },
];

describe('DinosaurAutocomplete', () => {
  it('muestra solo los dinosaurios que coinciden con el texto escrito', async () => {
    const user = userEvent.setup();
    render(<DinosaurAutocomplete dinosaurs={dinosaurs} excludeIds={new Set()} disabled={false} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Adivina un dinosaurio'), 'tri');

    expect(screen.getByText('Triceratops')).toBeInTheDocument();
    expect(screen.queryByText('Tyrannosaurus Rex')).not.toBeInTheDocument();
  });

  it('no muestra los dinosaurios ya excluidos', async () => {
    const user = userEvent.setup();
    render(<DinosaurAutocomplete dinosaurs={dinosaurs} excludeIds={new Set(['2'])} disabled={false} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Adivina un dinosaurio'), 't');

    expect(screen.queryByText('Triceratops')).not.toBeInTheDocument();
  });

  it('llama a onSelect con Enter tras navegar con el teclado', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DinosaurAutocomplete dinosaurs={dinosaurs} excludeIds={new Set()} disabled={false} onSelect={onSelect} />);

    const input = screen.getByLabelText('Adivina un dinosaurio');
    await user.type(input, 't');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('recupera el foco cuando el campo se reactiva tras un intento', () => {
    const { rerender } = render(
      <DinosaurAutocomplete dinosaurs={dinosaurs} excludeIds={new Set()} disabled onSelect={vi.fn()} />
    );
    const input = screen.getByLabelText('Adivina un dinosaurio');
    expect(input).not.toHaveFocus();

    rerender(<DinosaurAutocomplete dinosaurs={dinosaurs} excludeIds={new Set()} disabled={false} onSelect={vi.fn()} />);

    expect(input).toHaveFocus();
  });
});