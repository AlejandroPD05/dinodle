import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  DUEL_MESSAGES,
  fail,
  generateCode,
  getUserId,
  isUuid,
  json,
  pickDuelDinosaur,
  serviceClient,
} from "../_shared/duel.ts";

type Action = "forfeit" | "cancel" | "rematch";

function isAction(value: unknown): value is Action {
  return value === "forfeit" || value === "cancel" || value === "rematch";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const userId = getUserId(req);
  if (!userId) {
    return fail("No autenticado", 401, "unauthorized");
  }

  const body = (await req.json().catch(() => null)) as { duelId?: unknown; action?: unknown } | null;
  const duelId = body?.duelId;
  const action = body?.action;

  if (!isUuid(duelId) || !isAction(action)) {
    return fail("Datos no válidos", 400, "invalid_payload");
  }

  const supabase = serviceClient();

  if (action === "rematch") {
    const dinosaurId = await pickDuelDinosaur(supabase);
    if (!dinosaurId) {
      return fail("No hay dinosaurios disponibles", 500, "no_dinosaurs");
    }

    for (let intento = 0; intento < 5; intento++) {
      const { data, error } = await supabase.rpc("duel_rematch", {
        p_duel_id: duelId,
        p_user_id: userId,
        p_code: generateCode(),
        p_dinosaur_id: dinosaurId,
      });

      if (!error) {
        const row = data?.[0];
        if (!row) {
          return fail("No se pudo crear la revancha", 500, "rematch_failed");
        }
        if (row.error) {
          const status =
            row.error === "not_found" ? 404 : row.error === "not_player" ? 403 : 409;
          return fail(DUEL_MESSAGES[row.error] ?? "No se pudo crear la revancha", status, row.error);
        }

        return json({ duelId: row.duel_id, code: row.code, status: row.status, rematchId: row.duel_id });
      }

      if (error.code !== "23505") {
        return fail("No se pudo crear la revancha", 500, "rematch_failed");
      }
    }

    return fail("No se pudo generar un código libre", 503, "code_exhausted");
  }

  const { data, error } = await supabase.rpc("duel_forfeit", {
    p_duel_id: duelId,
    p_user_id: userId,
  });

  if (error) {
    return fail("No se pudo cerrar el duelo", 500, "action_failed");
  }

  const row = data?.[0];
  if (!row) {
    return fail("No se pudo cerrar el duelo", 500, "action_failed");
  }

  if (row.status === "not_found") {
    return fail(DUEL_MESSAGES.not_found, 404, "not_found");
  }

  if (row.status === "not_player") {
    return fail(DUEL_MESSAGES.not_player, 403, "not_player");
  }

  if (action === "cancel" && row.status !== "cancelled") {
    return fail("El duelo ya ha empezado", 409, "duel_started");
  }

  return json({ duelId, status: row.status, winnerId: row.winner_id ?? null });
});
