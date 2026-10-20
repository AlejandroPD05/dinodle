import { FunctionRegion } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type {
  CreateDuelResponse,
  DuelAction,
  DuelActionResponse,
  DuelStateResponse,
  Duel,
  JoinDuelResponse,
  SubmitDuelGuessResponse,
} from '../types/duel';

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

const REGION = FunctionRegion.EuWest1;

export async function createDuel(): Promise<CreateDuelResponse> {
  const { data, error } = await supabase.functions.invoke('create-duel', {
    body: {},
    region: REGION,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

export async function getCurrentDuel(): Promise<Duel | null> {
  const { data, error } = await supabase.functions.invoke('duel-current', {
    body: {},
    region: REGION,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data?.duel ?? null;
}

export async function joinDuel(code: string): Promise<JoinDuelResponse> {
  const { data, error } = await supabase.functions.invoke('join-duel', {
    body: { code },
    region: REGION,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

export async function getDuelState(duelId: string): Promise<DuelStateResponse> {
  const { data, error } = await supabase.functions.invoke('duel-state', {
    body: { duelId },
    region: REGION,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

export async function submitDuelGuess(
  duelId: string,
  dinosaurId: string
): Promise<SubmitDuelGuessResponse> {
  const { data, error } = await supabase.functions.invoke('submit-duel-guess', {
    body: { duelId, dinosaurId },
    region: REGION,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

export async function duelAction(duelId: string, action: DuelAction): Promise<DuelActionResponse> {
  const { data, error } = await supabase.functions.invoke('duel-action', {
    body: { duelId, action },
    region: REGION,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}
