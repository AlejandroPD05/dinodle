import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildHints } from "../_shared/hints.ts";
import type { DinosaurRow } from "../_shared/hints.ts";
import {
  attemptStatusToHttp,
  corsHeaders,
  DUEL_MESSAGES,
  fail,
  getUserId,
  isUuid,
  json,
  serviceClient,
} from "../_shared/duel.ts";

const DINO_FIELDS = "id, name, period, diet, location, length_m";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const userId = getUserId(req);
  if (!userId) {
    return fail("No autenticado", 401, "unauthorized");
  }

  const body = (await req.json().catch(() => null)) as { duelId?: unknown; dinosaurId?: unknown } | null;
  const duelId = body?.duelId;
  const dinosaurId = body?.dinosaurId;

  if (!isUuid(duelId) || !isUuid(dinosaurId)) {
    return fail("Datos no válidos", 400, "invalid_payload");
  }

  const supabase = serviceClient();

  const { data, error } = await supabase.rpc("duel_register_attempt", {
    p_duel_id: duelId,
    p_user_id: userId,
    p_dinosaur_id: dinosaurId,
  });

  if (error) {
    return fail("No se pudo registrar el intento", 500, "attempt_failed");
  }

  const attempt = data?.[0];
  if (!attempt) {
    return fail("No se pudo registrar el intento", 500, "attempt_failed");
  }

  if (attempt.status !== "ok") {
    return fail(
      DUEL_MESSAGES[attempt.status] ?? "No se pudo registrar el intento",
      attemptStatusToHttp(attempt.status),
      attempt.status,
      { attempts: attempt.attempts }
    );
  }

  const { data: dinos } = await supabase
    .from("dinosaurs")
    .select(DINO_FIELDS)
    .in("id", [dinosaurId, attempt.target_dinosaur_id]);

  const guessed = (dinos ?? []).find((d) => d.id === dinosaurId) as DinosaurRow | undefined;
  const target = (dinos ?? []).find((d) => d.id === attempt.target_dinosaur_id) as DinosaurRow | undefined;

  if (!guessed || !target) {
    return fail("Dinosaurio no válido", 400, "invalid_dinosaur");
  }

  const hints = buildHints(guessed, target);

  await supabase.from("duel_guesses").update({ hints }).eq("id", attempt.guess_id);

  const solved = guessed.id === target.id;

  if (solved) {
    await supabase.rpc("duel_solve", { p_duel_id: duelId, p_user_id: userId });
  } else {
    const { data: duel } = await supabase
      .from("duels")
      .select("max_attempts")
      .eq("id", duelId)
      .maybeSingle();

    if (duel && attempt.attempts >= duel.max_attempts) {
      // Si ambos están agotados, el duelo se cierra como empate.
      await supabase.rpc("duel_close_stale");
    }
  }

  const { data: finalDuel } = await supabase
    .from("duels")
    .select("status, winner_id")
    .eq("id", duelId)
    .maybeSingle();

  return json({
    hints,
    attempts: attempt.attempts,
    solved,
    status: finalDuel?.status ?? "active",
    winnerId: finalDuel?.winner_id ?? null,
  });
});
