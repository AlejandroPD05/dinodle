import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, fail, getUserId, json, serviceClient } from "../_shared/duel.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const userId = getUserId(req);
  if (!userId) {
    return fail("No autenticado", 401, "unauthorized");
  }

  const supabase = serviceClient();

  // Un duelo caducado no debe ofrecerse como "continuar".
  await supabase.rpc("duel_close_stale");

  const { data } = await supabase
    .from("duels")
    .select(
      "id, code, status, created_by, created_at, started_at, ends_at, finished_at, winner_id, rematch_id, duration_s, max_attempts, duel_players!inner(user_id)"
    )
    .eq("duel_players.user_id", userId)
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return json({ duel: null });
  }

  const duel = data as Record<string, unknown>;
  delete duel.duel_players;

  return json({ duel });
});
