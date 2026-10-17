export type HintStatus = 'correct' | 'incorrect' | 'higher' | 'lower' | 'partial';

export interface HintResult {
  attribute: string;
  status: HintStatus;
  guessedValue: unknown;
}

export interface SubmitGuessResponse {
  hints: HintResult[];
  attempts: number;
  status: 'playing' | 'won';
  targetDinosaur: { id: string; name: string } | null;
}