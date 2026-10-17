export type HintStatus = "correct" | "incorrect" | "higher" | "lower" | "partial";

export interface HintResult {
  attribute: string;
  status: HintStatus;
  guessedValue: unknown;
}

export interface DinosaurRow {
  id: string;
  name: string;
  period: string;
  diet: string;
  location: string[];
  length_m: number | null;
}

export function compareName(guess: DinosaurRow, target: DinosaurRow): HintResult {
  return { attribute: "name", status: guess.id === target.id ? "correct" : "incorrect", guessedValue: guess.name };
}

export function comparePeriod(guess: DinosaurRow, target: DinosaurRow): HintResult {
  return { attribute: "period", status: guess.period === target.period ? "correct" : "incorrect", guessedValue: guess.period };
}

export function compareDiet(guess: DinosaurRow, target: DinosaurRow): HintResult {
  return { attribute: "diet", status: guess.diet === target.diet ? "correct" : "incorrect", guessedValue: guess.diet };
}

export function compareLocation(guess: DinosaurRow, target: DinosaurRow): HintResult {
  const overlap = guess.location.some((loc) => target.location.includes(loc));
  const sameSet =
    guess.location.length === target.location.length &&
    guess.location.every((loc) => target.location.includes(loc));

  return {
    attribute: "location",
    status: sameSet ? "correct" : overlap ? "partial" : "incorrect",
    guessedValue: guess.location,
  };
}

export function compareLength(guess: DinosaurRow, target: DinosaurRow): HintResult {
  if (guess.length_m === null || target.length_m === null) {
    return { attribute: "length_m", status: "incorrect", guessedValue: guess.length_m };
  }

  let status: HintStatus;
  if (guess.length_m === target.length_m) {
    status = "correct";
  } else if (guess.length_m < target.length_m) {
    status = "higher";
  } else {
    status = "lower";
  }

  return { attribute: "length_m", status, guessedValue: guess.length_m };
}

export function buildHints(guess: DinosaurRow, target: DinosaurRow): HintResult[] {
  return [
    compareName(guess, target),
    comparePeriod(guess, target),
    compareDiet(guess, target),
    compareLocation(guess, target),
    compareLength(guess, target),
  ];
}