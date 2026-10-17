import { supabase } from '../lib/supabaseClient';
import { FunctionRegion } from '@supabase/supabase-js';
import type { DailyChallenge } from '../types/dailyChallenge';
import type { SubmitGuessResponse, HintResult } from '../types/game';
import type { Dinosaur } from '../types/dinosaur';

export interface GuessRow {
  dinosaur: Dinosaur;
  hints: HintResult[];
}

async function extractFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.json();
        if (body?.error) {
          return body.error;
        }
      } catch {
        // El cuerpo de la respuesta no era JSON: se usa el mensaje por defecto.
      }
    }
  }
  return error instanceof Error ? error.message : 'Error desconocido';
}

export async function getTodayChallenge(): Promise<DailyChallenge> {
  const { data, error } = await supabase.functions.invoke('get-daily-challenge', {
    region: FunctionRegion.EuWest1,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

export async function submitGuess(dailyChallengeId: string, dinosaurId: string): Promise<SubmitGuessResponse> {
  const { data, error } = await supabase.functions.invoke('submit-guess', {
    body: { daily_challenge_id: dailyChallengeId, dinosaur_id: dinosaurId },
    region: FunctionRegion.EuWest1,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

export async function getGameStatus(dailyChallengeId: string): Promise<SubmitGuessResponse | null> {
  const { data, error } = await supabase.rpc('get_game_status', {
    p_daily_challenge_id: dailyChallengeId,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0 || !data[0].completed_at) {
    return null;
  }

  const row = data[0];

  return {
    hints: [],
    attempts: row.attempts,
    status: 'won',
    targetDinosaur: row.target_name ? { id: '', name: row.target_name } : null,
  };
}

export async function getGuessHistory(dailyChallengeId: string): Promise<GuessRow[]> {
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('daily_challenge_id', dailyChallengeId)
    .maybeSingle();

  if (!game) {
    return [];
  }

  const { data, error } = await supabase
    .from('guesses')
    .select('hints, dinosaurs(id, name, scientific_name, slug, description, period, diet, location, length_m, height_m, weight_kg, image_url, sprite_url, rarity)')
    .eq('game_id', game.id)
    .order('attempt_number');

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as { hints: HintResult[]; dinosaurs: Dinosaur }[];

  return rows.map((row) => ({
    dinosaur: row.dinosaurs,
    hints: row.hints,
  }));
}