import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: selectError } = await supabase
    .from("daily_challenges")
    .select("id, date")
    .eq("date", today)
    .maybeSingle();

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existing) {
    return new Response(JSON.stringify(existing), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const thirtyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
    .toISOString()
    .slice(0, 10);

  const { data: recent } = await supabase
    .from("daily_challenges")
    .select("dinosaur_id")
    .gte("date", thirtyDaysAgo);

  const excludedIds = (recent ?? []).map((row: { dinosaur_id: string }) => row.dinosaur_id);

  let query = supabase.from("dinosaurs").select("id");
  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${excludedIds.join(",")})`);
  }

  const { data: candidatosIniciales, error: candidatesError } = await query;

  if (candidatesError) {
    return new Response(JSON.stringify({ error: candidatesError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let candidates = candidatosIniciales;

  if (!candidates || candidates.length === 0) {
    const { data: allDinosaurs, error: allError } = await supabase
      .from("dinosaurs")
      .select("id");

    if (allError || !allDinosaurs || allDinosaurs.length === 0) {
      return new Response(JSON.stringify({ error: "No hay dinosaurios disponibles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    candidates = allDinosaurs;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  const { data: created, error: insertError } = await supabase
    .from("daily_challenges")
    .insert({ date: today, dinosaur_id: chosen.id })
    .select("id, date")
    .single();

  if (insertError) {
    const { data: raceExisting } = await supabase
      .from("daily_challenges")
      .select("id, date")
      .eq("date", today)
      .maybeSingle();

    if (raceExisting) {
      return new Response(JSON.stringify(raceExisting), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(created), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});