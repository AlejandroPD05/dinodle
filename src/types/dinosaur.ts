export type DinoPeriod = 'Triásico' | 'Jurásico' | 'Cretácico';
export type DinoDiet = 'Carnívoro' | 'Herbívoro' | 'Omnívoro';

export interface Dinosaur {
  id: string;
  name: string;
  scientific_name: string | null;
  slug: string;
  description: string | null;
  period: DinoPeriod;
  diet: DinoDiet;
  location: string[];
  length_m: number | null;
  height_m: number | null;
  weight_kg: number | null;
  image_url: string | null;
  sprite_url: string | null;
  rarity: string | null;
}