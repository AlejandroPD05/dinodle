import { describe, it, expect } from 'vitest';
import { compareDiet, compareLocation, compareLength, comparePeriod, compareName } from './hints.ts';
import type { DinosaurRow } from './hints.ts';

const trex: DinosaurRow = {
  id: '1',
  name: 'Tyrannosaurus Rex',
  period: 'Cretácico',
  diet: 'Carnívoro',
  location: ['Norteamérica'],
  length_m: 12.3,
};

const brachiosaurus: DinosaurRow = {
  id: '2',
  name: 'Brachiosaurus',
  period: 'Jurásico',
  diet: 'Herbívoro',
  location: ['Norteamérica'],
  length_m: 21,
};

describe('compareName', () => {
  it('marca correcto cuando el id coincide', () => {
    expect(compareName(trex, trex).status).toBe('correct');
  });

  it('marca incorrecto cuando el id no coincide', () => {
    expect(compareName(brachiosaurus, trex).status).toBe('incorrect');
  });
});

describe('comparePeriod', () => {
  it('detecta mismo periodo', () => {
    expect(comparePeriod(trex, trex).status).toBe('correct');
  });

  it('detecta periodo distinto', () => {
    expect(comparePeriod(brachiosaurus, trex).status).toBe('incorrect');
  });
});

describe('compareDiet', () => {
  it('detecta misma dieta', () => {
    expect(compareDiet(trex, trex).status).toBe('correct');
  });

  it('detecta dieta distinta', () => {
    expect(compareDiet(brachiosaurus, trex).status).toBe('incorrect');
  });
});

describe('compareLocation', () => {
  it('marca correcto cuando la ubicación es exactamente la misma', () => {
    expect(compareLocation(trex, trex).status).toBe('correct');
  });

  it('marca parcial cuando comparten solo algún continente', () => {
    const asia: DinosaurRow = { ...trex, id: '3', location: ['Asia', 'Norteamérica'] };
    expect(compareLocation(asia, trex).status).toBe('partial');
  });

  it('marca incorrecto cuando no comparten ningún continente', () => {
    const africa: DinosaurRow = { ...trex, id: '4', location: ['África'] };
    expect(compareLocation(africa, trex).status).toBe('incorrect');
  });
});

describe('compareLength', () => {
  it('marca correcto cuando la longitud es idéntica', () => {
    expect(compareLength(trex, trex).status).toBe('correct');
  });

  it('marca higher cuando el intento es más corto que el objetivo', () => {
    expect(compareLength(trex, brachiosaurus).status).toBe('higher');
  });

  it('marca lower cuando el intento es más largo que el objetivo', () => {
    expect(compareLength(brachiosaurus, trex).status).toBe('lower');
  });
});