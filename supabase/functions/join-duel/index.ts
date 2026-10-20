import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  DUEL_MESSAGES,
  fail,
  getUserId,
  getUsername,
  json,
  normalizeCode,
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

  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = normalizeCode(body?.code);

  if (!code) {
    return fail(DUEL_MESSAGES.invalid_code, 400, "invalid_code");
  }

  const supabase = serviceClient();
  const username = await getUsername(supabase, userId);

  const { data, error } = await supabase.rpc("duel_join", {
    p_code: code,
    p_user_id: userId,
    p_username: username,
  });

  if (error) {
    return fail("No se pudo unir al duelo", 500, "join_failed");
  }

  const row = data?.[0];
  if (!row) {
    return fail("No se pudo unir al duelo", 500, "join_failed");
  }

  if (row.error) {
    const status = row.error === "not_found" ? 404 : 409;
    return fail(DUEL_MESSAGES[row.error] ?? "No se pudo unir al duelo", status, row.error);
  }

  return json({ duelId: row.duel_id, code: row.code, status: row.status });
});
