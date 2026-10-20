import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  fail,
  generateCode,
  getUserId,
  getUsername,
  json,
  pickDuelDinosaur,
  serviceClient,
} from "../_shared/duel.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const userId = getUserId(req);
  if (!userId) {
    return fail("No autenticado", 401, "unauthorized");
  }

  const supabase = serviceClient();
  const [username, dinosaurId] = await Promise.all([
    getUsername(supabase, userId),
    pickDuelDinosaur(supabase),
  ]);

  if (!dinosaurId) {
    return fail("No hay dinosaurios disponibles", 500, "no_dinosaurs");
  }

  // El código puede chocar con uno existente: se reintenta con otro.
  for (let intento = 0; intento < 5; intento++) {
    const { data, error } = await supabase.rpc("duel_create", {
      p_user_id: userId,
      p_username: username,
      p_code: generateCode(),
      p_dinosaur_id: dinosaurId,
    });

    if (!error) {
      const row = data?.[0];
      if (!row) {
        return fail("No se pudo crear el duelo", 500, "create_failed");
      }

      return json({
        duelId: row.duel_id,
        code: row.code,
        status: row.status,
        created: row.created,
      });
    }

    // 23505 = unique_violation. Solo se reintenta en ese caso.
    if (error.code !== "23505") {
      return fail("No se pudo crear el duelo", 500, "create_failed");
    }
  }

  return fail("No se pudo generar un código libre", 503, "code_exhausted");
});
