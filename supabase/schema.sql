-- Dinodle — esquema de la base de datos (Supabase / PostgreSQL)
--
-- Generado desde la base de datos real del proyecto el 2026-10-18, tras la
-- auditoría de seguridad (RLS revisado y permisos endurecidos).
--
-- Uso: pegar en el SQL Editor de un proyecto Supabase nuevo y después
-- ejecutar supabase/seed.sql (catálogo de dinosaurios). Ver README.

begin;

-- Extensiones
create extension if not exists "pgcrypto" with schema extensions;

-- Tipos (enums)
do $$ begin
  create type public.dino_diet as enum ('Carnívoro', 'Herbívoro', 'Omnívoro');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.dino_period as enum ('Triásico', 'Jurásico', 'Cretácico');
exception when duplicate_object then null; end $$;

-- Tablas
create table if not exists public.daily_challenges (
  id uuid default gen_random_uuid() not null,
  date date not null,
  dinosaur_id uuid not null,
  created_at timestamptz default now() not null
);

create table if not exists public.dinosaurs (
  id uuid default gen_random_uuid() not null,
  name text not null,
  scientific_name text,
  slug text not null,
  description text,
  period dino_period not null,
  diet dino_diet not null,
  location text[] default '{}'::text[] not null,
  length_m numeric,
  height_m numeric,
  weight_kg numeric,
  image_url text,
  sprite_url text,
  rarity text,
  created_at timestamptz default now() not null
);

create table if not exists public.games (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  daily_challenge_id uuid not null,
  attempts integer default 0 not null,
  won boolean,
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  date date not null
);

create table if not exists public.guesses (
  id uuid default gen_random_uuid() not null,
  game_id uuid not null,
  dinosaur_id uuid not null,
  attempt_number integer not null,
  created_at timestamptz default now() not null,
  hints jsonb
);

create table if not exists public.profiles (
  id uuid not null,
  username text not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.streaks (
  user_id uuid not null,
  current_streak integer default 0 not null,
  best_streak integer default 0 not null,
  last_played_date date,
  updated_at timestamptz default now() not null
);

create table if not exists public.user_dinosaurs (
  user_id uuid not null,
  dinosaur_id uuid not null,
  discovered_at timestamptz default now() not null
);

-- Restricciones
alter table public.daily_challenges add constraint daily_challenges_dinosaur_id_fkey FOREIGN KEY (dinosaur_id) REFERENCES dinosaurs(id);
alter table public.daily_challenges add constraint daily_challenges_pkey PRIMARY KEY (id);
alter table public.daily_challenges add constraint daily_challenges_date_key UNIQUE (date);
alter table public.dinosaurs add constraint dinosaurs_pkey PRIMARY KEY (id);
alter table public.dinosaurs add constraint dinosaurs_slug_key UNIQUE (slug);
alter table public.games add constraint games_daily_challenge_id_fkey FOREIGN KEY (daily_challenge_id) REFERENCES daily_challenges(id);
alter table public.games add constraint games_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.games add constraint games_pkey PRIMARY KEY (id);
alter table public.games add constraint games_user_id_daily_challenge_id_key UNIQUE (user_id, daily_challenge_id);
alter table public.guesses add constraint guesses_dinosaur_id_fkey FOREIGN KEY (dinosaur_id) REFERENCES dinosaurs(id);
alter table public.guesses add constraint guesses_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table public.guesses add constraint guesses_pkey PRIMARY KEY (id);
alter table public.guesses add constraint guesses_game_id_attempt_number_key UNIQUE (game_id, attempt_number);
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_username_key UNIQUE (username);
alter table public.streaks add constraint streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.streaks add constraint streaks_pkey PRIMARY KEY (user_id);
alter table public.user_dinosaurs add constraint user_dinosaurs_dinosaur_id_fkey FOREIGN KEY (dinosaur_id) REFERENCES dinosaurs(id);
alter table public.user_dinosaurs add constraint user_dinosaurs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_dinosaurs add constraint user_dinosaurs_pkey PRIMARY KEY (user_id, dinosaur_id);

-- Índices
CREATE INDEX idx_dinosaurs_slug ON public.dinosaurs USING btree (slug);
CREATE INDEX idx_games_user ON public.games USING btree (user_id);
CREATE INDEX idx_guesses_game ON public.guesses USING btree (game_id);

-- Row Level Security y políticas
alter table public.daily_challenges enable row level security;
alter table public.dinosaurs enable row level security;
alter table public.games enable row level security;
alter table public.guesses enable row level security;
alter table public.profiles enable row level security;
alter table public.streaks enable row level security;
alter table public.user_dinosaurs enable row level security;

create policy "daily_challenges_select_past" on public.daily_challenges as permissive for SELECT to public using ((date < CURRENT_DATE));
create policy "dinosaurs_select_all" on public.dinosaurs as permissive for SELECT to public using (true);
create policy "games_select_own" on public.games as permissive for SELECT to public using ((auth.uid() = user_id));
create policy "guesses_select_own" on public.guesses as permissive for SELECT to public using ((EXISTS ( SELECT 1
   FROM games
  WHERE ((games.id = guesses.game_id) AND (games.user_id = auth.uid())))));
create policy "profiles_select_own" on public.profiles as permissive for SELECT to public using ((auth.uid() = id));
create policy "profiles_update_own" on public.profiles as permissive for UPDATE to public using ((auth.uid() = id)) with check ((auth.uid() = id));
create policy "streaks_select_own" on public.streaks as permissive for SELECT to public using ((auth.uid() = user_id));
create policy "user_dinosaurs_select_own" on public.user_dinosaurs as permissive for SELECT to public using ((auth.uid() = user_id));

-- Funciones
CREATE OR REPLACE FUNCTION public.get_game_status(p_daily_challenge_id uuid)
 RETURNS TABLE(attempts integer, won boolean, completed_at timestamp with time zone, target_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  select g.attempts, g.won, g.completed_at,
    case when g.completed_at is not null then d.name else null end
  from public.games g
  join public.daily_challenges dc on dc.id = g.daily_challenge_id
  join public.dinosaurs d on d.id = dc.dinosaur_id
  where g.daily_challenge_id = p_daily_challenge_id
    and g.user_id = auth.uid();
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.register_guess_attempt(p_game_id uuid)
 RETURNS TABLE(attempts integer, won boolean, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  update public.games
  set attempts = public.games.attempts + 1
  where public.games.id = p_game_id
    and public.games.completed_at is null
    and public.games.date = (now() at time zone 'utc')::date
  returning public.games.attempts, public.games.won, public.games.completed_at;
end;
$function$;

-- Triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Vista
create or replace view public.user_stats with (security_invoker = true) as
SELECT user_id,
    count(*) FILTER (WHERE completed_at IS NOT NULL) AS games_played,
    count(*) FILTER (WHERE won) AS wins,
    count(*) FILTER (WHERE won = false) AS losses,
    round(count(*) FILTER (WHERE won)::numeric / NULLIF(count(*) FILTER (WHERE completed_at IS NOT NULL), 0)::numeric * 100::numeric, 1) AS win_rate,
    round(avg(attempts) FILTER (WHERE won), 1) AS avg_attempts
   FROM games
  GROUP BY user_id;

-- Permisos (estado endurecido tras la auditoría de seguridad:
-- el cliente solo lee; el perfil propio se puede actualizar; todo lo demás
-- pasa por Edge Functions con service_role)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all functions in schema public to service_role;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
grant select on table public.daily_challenges, public.dinosaurs, public.games, public.guesses, public.profiles, public.streaks, public.user_dinosaurs to anon, authenticated;
grant select on table public.user_stats to authenticated;
grant update on table public.profiles to authenticated;
grant execute on function public.get_game_status(uuid) to authenticated, service_role;
revoke execute on function public.get_game_status(uuid) from public, anon;
grant execute on function public.register_guess_attempt(uuid) to service_role;
revoke execute on function public.register_guess_attempt(uuid) from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
