import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
};

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function fail(message: string, status: number, code: string, extra: Record<string, unknown> = {}) {
  return json({ error: message, code, ...extra }, status);
}

export function getUserId(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") ?? "";

  try {
    const token = authHeader.replace("Bearer ", "");
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) {
      return null;
    }
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Sin I, O, 0 ni 1: los códigos se dictan por teléfono sin ambigüedad. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const code = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== 6) {
    return null;
  }
  for (const char of code) {
    if (!CODE_ALPHABET.includes(char)) {
      return null;
    }
  }
  return code;
}

export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

type Supabase = ReturnType<typeof serviceClient>;

export async function getUsername(supabase: Supabase, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();

  if (data?.username) {
    return data.username;
  }

  return `Jugador ${userId.slice(0, 4).toUpperCase()}`;
}

/**
 * Dinosaurio para un duelo nuevo: excluye el reto diario y los usados en
 * duelos de los últimos 30 días. Si el filtro deja el catálogo vacío, usa
 * cualquier dinosaurio.
 */
export async function pickDuelDinosaur(supabase: Supabase): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();

  const [{ data: daily }, { data: recentDuels }] = await Promise.all([
    supabase.from("daily_challenges").select("dinosaur_id").eq("date", today).maybeSingle(),
    supabase
      .from("duel_secrets")
      .select("dinosaur_id, duels!inner(created_at)")
      .gte("duels.created_at", since),
  ]);

  const excluded = new Set<string>();
  if (daily?.dinosaur_id) {
    excluded.add(daily.dinosaur_id);
  }
  for (const row of (recentDuels ?? []) as { dinosaur_id: string }[]) {
    excluded.add(row.dinosaur_id);
  }

  let query = supabase.from("dinosaurs").select("id");
  if (excluded.size > 0) {
    query = query.not("id", "in", `(${[...excluded].join(",")})`);
  }

  const { data: candidates } = await query;

  if (candidates && candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  const { data: all } = await supabase.from("dinosaurs").select("id");
  if (!all || all.length === 0) {
    return null;
  }

  return all[Math.floor(Math.random() * all.length)].id;
}

export async function getDuelMaxAttempts(supabase: Supabase, duelId: string): Promise<number> {
  const { data } = await supabase.from("duels").select("max_attempts").eq("id", duelId).maybeSingle();
  return data?.max_attempts ?? 12;
}

export const DUEL_MESSAGES: Record<string, string> = {
  not_found: "Ese código no existe",
  not_player: "No participas en este duelo",
  duel_full: "El duelo ya está completo",
  duel_finished: "El duelo ya ha terminado",
  duel_expired: "El tiempo del duelo ha terminado",
  finished: "El duelo ya ha terminado",
  expired: "El tiempo del duelo ha terminado",
  cancelled: "El duelo ha sido cancelado",
  open: "El duelo aún no ha empezado",
  no_attempts: "No te quedan intentos",
  duplicate: "Ya has probado ese dinosaurio",
  already_solved: "Ya has resuelto este duelo",
  own_duel: "No puedes unirte a tu propio duelo",
  already_in_duel: "Ya tienes otro duelo abierto",
  duel_active: "El duelo sigue activo",
  no_rival: "No hay rival para la revancha",
  invalid_code: "El código no es válido",
};

/** Estados de intento que son culpa del jugador (409) frente a errores internos. */
export function attemptStatusToHttp(status: string): number {
  switch (status) {
    case "not_found":
      return 404;
    case "not_player":
      return 403;
    case "already_solved":
    case "no_attempts":
    case "duplicate":
    case "duel_finished":
    case "duel_expired":
    case "finished":
    case "expired":
    case "cancelled":
    case "open":
      return 409;
    default:
      return 400;
  }
}
