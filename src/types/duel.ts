import type { Dinosaur } from './dinosaur';
import type { HintResult } from './game';

export type DuelStatus = 'open' | 'active' | 'finished' | 'expired' | 'cancelled';

export interface Duel {
  id: string;
  code: string;
  status: DuelStatus;
  created_by: string;
  created_at: string;
  started_at: string | null;
  ends_at: string | null;
  finished_at: string | null;
  winner_id: string | null;
  rematch_id: string | null;
  duration_s: number;
  max_attempts: number;
}

export interface DuelPlayer {
  user_id: string;
  username: string;
  slot: 1 | 2;
  attempts: number;
  solved_at: string | null;
  joined_at: string;
  last_seen_at: string | null;
}

export interface DuelGuess {
  id: string;
  dinosaur_id: string;
  attempt_number: number;
  hints: HintResult[];
  created_at: string;
  dinosaurs: Dinosaur;
}

export interface DuelStateResponse {
  duel: Duel;
  players: DuelPlayer[];
  me: string;
  guesses: DuelGuess[];
  targetDinosaur: Dinosaur | null;
  serverNow: string;
}

export interface CreateDuelResponse {
  duelId: string;
  code: string;
  status: DuelStatus;
  created: boolean;
}

export interface JoinDuelResponse {
  duelId: string;
  code: string;
  status: DuelStatus;
}

export interface SubmitDuelGuessResponse {
  hints: HintResult[];
  attempts: number;
  solved: boolean;
  status: DuelStatus;
  winnerId: string | null;
}

export type DuelAction = 'forfeit' | 'cancel' | 'rematch';

export interface DuelActionResponse {
  duelId: string;
  code?: string;
  status: DuelStatus;
  winnerId?: string | null;
  rematchId?: string;
}
