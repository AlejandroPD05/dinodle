import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, fail, getUserId, isUuid, json, serviceClient } from "../_shared/duel.ts";

const DINO_FIELDS =
  "id, name, scientific_name, slug, description, period, diet, location, length_m, height_m, weight_kg, image_url, sprite_url, rarity";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const userId = getUserId(req);
  if (!userId) {
    return fail("No autenticado", 401, "unauthorized");
  }

  const body = (await req.json().catch(() => null)) as { duelId?: unknown } | null;
  const duelId = body?.duelId;

  if (!isUuid(duelId)) {
    return fail("Duelo no válido", 400, "invalid_duel");
  }

  const supabase = serviceClient();

  // Cierra de forma perezosa los duelos caducados o agotados antes de leer.
  await supabase.rpc("duel_close_stale");

  const { data: me } = await supabase
    .from("duel_players")
    .select("duel_id, user_id, username, slot, attempts, solved_at, joined_at, last_seen_at")
    .eq("duel_id", duelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!me) {
    return fail("No participas en este duelo", 403, "not_player");
  }

  const [{ data: duel }, { data: players }, { data: guesses }] = await Promise.all([
    supabase
      .from("duels")
      .select(
        "id, code, status, created_by, created_at, started_at, ends_at, finished_at, winner_id, rematch_id, duration_s, max_attempts"
      )
      .eq("id", duelId)
      .maybeSingle(),
    supabase
      .from("duel_players")
      .select("user_id, username, slot, attempts, solved_at, joined_at, last_seen_at")
      .eq("duel_id", duelId)
      .order("slot"),
    supabase
      .from("duel_guesses")
      .select(`id, dinosaur_id, attempt_number, hints, created_at, dinosaurs(${DINO_FIELDS})`)
      .eq("duel_id", duelId)
      .eq("user_id", userId)
      .order("attempt_number"),
  ]);

  if (!duel) {
    return fail("Duelo no encontrado", 404, "not_found");
  }

  // El objetivo solo se revela cuando el duelo ha terminado.
  let targetDinosaur = null;
  if (duel.status === "finished" || duel.status === "expired") {
    const { data: secret } = await supabase
      .from("duel_secrets")
      .select(`dinosaur_id, dinosaurs(${DINO_FIELDS})`)
      .eq("duel_id", duelId)
      .maybeSingle();

    targetDinosaur = (secret as { dinosaurs?: unknown } | null)?.dinosaurs ?? null;
  }

  return json({
    duel,
    players: players ?? [],
    me: me.user_id,
    guesses: guesses ?? [],
    targetDinosaur,
    serverNow: new Date().toISOString(),
  });
});
