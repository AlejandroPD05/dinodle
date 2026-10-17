import { supabase } from '../lib/supabaseClient';
import type { Dinosaur } from '../types/dinosaur';

export interface UnlockedDinosaur extends Dinosaur {
  unlocked: boolean;
}

export async function getAllDinosaurs(): Promise<Dinosaur[]> {
  const { data, error } = await supabase
    .from('dinosaurs')
    .select('*')
    .order('name');

  if (error) {
    throw error;
  }

  return data;
}

export async function getDinosaurBySlug(slug: string): Promise<Dinosaur | null> {
  const { data, error } = await supabase
    .from('dinosaurs')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDinoDex(): Promise<UnlockedDinosaur[]> {
  const [{ data: dinosaurs, error: dinoError }, { data: unlocked, error: unlockedError }] = await Promise.all([
    supabase.from('dinosaurs').select('*').order('name'),
    supabase.from('user_dinosaurs').select('dinosaur_id'),
  ]);

  if (dinoError) {
    throw dinoError;
  }

  if (unlockedError) {
    throw unlockedError;
  }

  const unlockedIds = new Set((unlocked ?? []).map((row) => row.dinosaur_id));

  return (dinosaurs ?? []).map((dino) => ({
    ...dino,
    unlocked: unlockedIds.has(dino.id),
  }));
}

export async function isDinosaurUnlocked(dinosaurId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_dinosaurs')
    .select('dinosaur_id')
    .eq('dinosaur_id', dinosaurId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}