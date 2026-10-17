import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildHints } from "../_shared/hints.ts";
import type { DinosaurRow } from "../_shared/hints.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
};

function getUserIdFromAuthHeader(authHeader: string): string | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payloadSegment = token.split(".")[1];
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
}

async function updateStreakAndCollection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  targetDinosaurId: string
) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, 10);

  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, best_streak, last_played_date")
    .eq("user_id", userId)
    .maybeSingle();

  const currentStreak = streak && streak.last_played_date === yesterday ? streak.current_streak + 1 : 1;
  const bestStreak = Math.max(streak?.best_streak ?? 0, currentStreak);

  await Promise.all([
    supabase.from("streaks").upsert({
      user_id: userId,
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_played_date: today,
      updated_at: new Date().toISOString(),
    }),
    supabase
      .from("user_dinosaurs")
      .upsert({ user_id: userId, dinosaur_id: targetDinosaurId }, { onConflict: "user_id,dinosaur_id", ignoreDuplicates: true }),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userId = getUserIdFromAuthHeader(authHeader);

  if (!userId) {
    return new Response(JSON.stringify({ error: "No autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { daily_challenge_id, dinosaur_id } = await req.json();

  if (!daily_challenge_id || !dinosaur_id) {
    return new Response(JSON.stringify({ error: "Faltan datos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: challenge, error: challengeError }, { data: existingGame }] = await Promise.all([
    supabase
      .from("daily_challenges")
      .select("date, dinosaurs(id, name, period, diet, location, length_m)")
      .eq("id", daily_challenge_id)
      .single(),
    supabase
      .from("games")
      .select("id, attempts, won, completed_at")
      .eq("user_id", userId)
      .eq("daily_challenge_id", daily_challenge_id)
      .maybeSingle(),
  ]);

  if (challengeError || !challenge) {
    return new Response(JSON.stringify({ error: "Reto no encontrado" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const target = challenge.dinosaurs as unknown as DinosaurRow;

  let game = existingGame;

  if (!game) {
    const { data: newGame, error: createError } = await supabase
      .from("games")
      .insert({ user_id: userId, daily_challenge_id, date: challenge.date })
      .select("id, attempts, won, completed_at")
      .single();

    if (createError) {
      const { data: raceGame } = await supabase
        .from("games")
        .select("id, attempts, won, completed_at")
        .eq("user_id", userId)
        .eq("daily_challenge_id", daily_challenge_id)
        .maybeSingle();

      if (!raceGame) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      game = raceGame;
    } else {
      game = newGame;
    }
  }

  if (game.completed_at) {
    return new Response(
      JSON.stringify({
        hints: [],
        attempts: game.attempts,
        status: "won",
        targetDinosaur: target,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const [{ data: guessedDino, error: guessedError }, { data: existingGuess }] = await Promise.all([
    supabase
      .from("dinosaurs")
      .select("id, name, period, diet, location, length_m")
      .eq("id", dinosaur_id)
      .single(),
    supabase
      .from("guesses")
      .select("id")
      .eq("game_id", game.id)
      .eq("dinosaur_id", dinosaur_id)
      .maybeSingle(),
  ]);

  if (guessedError || !guessedDino) {
    return new Response(JSON.stringify({ error: "Dinosaurio no válido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existingGuess) {
    return new Response(JSON.stringify({ error: "Ya has probado ese dinosaurio" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: attemptRows, error: attemptError } = await supabase.rpc("register_guess_attempt", {
    p_game_id: game.id,
  });

  if (attemptError) {
    return new Response(JSON.stringify({ error: attemptError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!attemptRows || attemptRows.length === 0) {
    return new Response(JSON.stringify({ error: "Esta partida ya ha terminado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const attemptNumber = attemptRows[0].attempts;
  const hints = buildHints(guessedDino, target);
  const won = guessedDino.id === target.id;

  const writes: Promise<unknown>[] = [
    supabase.from("guesses").insert({
      game_id: game.id,
      dinosaur_id: guessedDino.id,
      attempt_number: attemptNumber,
      hints,
    }),
  ];

  if (won) {
    writes.push(
      supabase.from("games").update({ won: true, completed_at: new Date().toISOString() }).eq("id", game.id)
    );
  }

  await Promise.all(writes);

  if (won) {
    await updateStreakAndCollection(supabase, userId, target.id);
  }

  return new Response(
    JSON.stringify({
      hints,
      attempts: attemptNumber,
      status: won ? "won" : "playing",
      targetDinosaur: won ? target : null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});