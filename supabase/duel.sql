-- DinoDuel — esquema, RLS, Realtime y funciones internas del modo 1v1.
--
-- Idempotente: se puede pegar entero en el SQL Editor de Supabase tantas veces
-- como haga falta. No toca ninguna tabla del reto diario.
--
-- Orden de uso:
--   1. Pegar este fichero en el SQL Editor del proyecto gbftcairgxaemadbyjfj.
--   2. Ejecutar `select public.duel_close_stale();` para comprobar que responde.
--   3. Desplegar las Edge Functions (create-duel, join-duel, duel-state,
--      submit-duel-guess, duel-action, duel-current).
--
-- Seguridad: el cliente nunca escribe. `duel_secrets` no tiene políticas ni
-- grants. `duel_guesses` solo lo lee su dueño. Realtime publica únicamente
-- `duels` y `duel_players`.

begin;

-- ─── 1. Tablas ────────────────────────────────────────────────────────────────

-- Datos públicos del duelo: lo que ambos jugadores pueden ver.
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'open'
    check (status in ('open', 'active', 'finished', 'expired', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ends_at timestamptz,
  finished_at timestamptz,
  winner_id uuid references auth.users(id) on delete set null,
  rematch_id uuid references public.duels(id) on delete set null,
  duration_s integer not null default 300,
  max_attempts integer not null default 12
);

-- El secreto vive aparte: RLS es por fila, no por columna.
create table if not exists public.duel_secrets (
  duel_id uuid primary key references public.duels(id) on delete cascade,
  dinosaur_id uuid not null references public.dinosaurs(id)
);

-- Instantánea del nombre, contadores y estado de cada jugador.
create table if not exists public.duel_players (
  duel_id uuid not null references public.duels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  slot smallint not null check (slot in (1, 2)),
  attempts integer not null default 0,
  solved_at timestamptz,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  primary key (duel_id, user_id),
  unique (duel_id, slot)
);

-- Intentos: privados de cada jugador. `hints` se rellena tras el RPC.
create table if not exists public.duel_guesses (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dinosaur_id uuid not null references public.dinosaurs(id),
  attempt_number integer not null,
  hints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (duel_id, user_id, attempt_number),
  unique (duel_id, user_id, dinosaur_id)
);

create index if not exists idx_duels_status on public.duels (status);
create index if not exists idx_duel_players_user on public.duel_players (user_id);
create index if not exists idx_duel_guesses_duel on public.duel_guesses (duel_id, user_id);

-- ─── 2. Pertenencia sin recursión de RLS ─────────────────────────────────────

create or replace function public.duel_is_player(p_duel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.duel_players
    where duel_id = p_duel_id and user_id = auth.uid()
  );
$$;

revoke execute on function public.duel_is_player(uuid) from public, anon;
grant execute on function public.duel_is_player(uuid) to authenticated;

-- ─── 3. RLS y permisos ───────────────────────────────────────────────────────

alter table public.duels enable row level security;
alter table public.duel_players enable row level security;
alter table public.duel_guesses enable row level security;
alter table public.duel_secrets enable row level security;

drop policy if exists "duels_select_players" on public.duels;
create policy "duels_select_players" on public.duels
  for select to authenticated using (public.duel_is_player(id));

drop policy if exists "duel_players_select_players" on public.duel_players;
create policy "duel_players_select_players" on public.duel_players
  for select to authenticated using (public.duel_is_player(duel_id));

drop policy if exists "duel_guesses_select_own" on public.duel_guesses;
create policy "duel_guesses_select_own" on public.duel_guesses
  for select to authenticated
  using (user_id = auth.uid() and public.duel_is_player(duel_id));

-- Sin políticas en duel_secrets: nadie salvo service_role puede leerla.

revoke all on public.duels, public.duel_players, public.duel_guesses,
  public.duel_secrets from anon, authenticated;

grant select on public.duels, public.duel_players, public.duel_guesses
  to authenticated;
grant select, insert, update, delete on public.duels, public.duel_players,
  public.duel_guesses, public.duel_secrets to service_role;

-- ─── 4. Realtime (solo estado público) ───────────────────────────────────────

do $$ begin
  alter publication supabase_realtime add table public.duels;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.duel_players;
exception when duplicate_object then null; end $$;

-- ─── 5. Funciones internas (solo service_role) ───────────────────────────────

-- Crea un duelo abierto (o devuelve el que el usuario ya tenga abierto/activo).
-- El código y el dinosaurio los elige la Edge Function.
create or replace function public.duel_create(
  p_user_id uuid,
  p_username text,
  p_code text,
  p_dinosaur_id uuid,
  p_duration_s integer default 300,
  p_max_attempts integer default 12
) returns table (duel_id uuid, code text, status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_code text;
  v_status text;
begin
  -- Serializa las peticiones del mismo usuario: nunca dos salas a la vez.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select d.id, d.code, d.status
    into v_id, v_code, v_status
  from public.duels d
  join public.duel_players p on p.duel_id = d.id
  where p.user_id = p_user_id and d.status in ('open', 'active')
  order by d.created_at desc
  limit 1;

  if found then
    return query select v_id, v_code, v_status, false;
    return;
  end if;

  insert into public.duels (code, created_by, duration_s, max_attempts)
  values (upper(trim(p_code)), p_user_id, p_duration_s, p_max_attempts)
  returning id into v_id;

  insert into public.duel_secrets (duel_id, dinosaur_id)
  values (v_id, p_dinosaur_id);

  insert into public.duel_players (duel_id, user_id, username, slot, last_seen_at)
  values (v_id, p_user_id, p_username, 1, now());

  return query select v_id, upper(trim(p_code)), 'open'::text, true;
end;
$$;

-- Une al jugador 2. Idempotente si ya está dentro.
create or replace function public.duel_join(
  p_code text,
  p_user_id uuid,
  p_username text
) returns table (duel_id uuid, code text, status text, error text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_status text;
  v_created_by uuid;
  v_duration integer;
  v_existing uuid;
  v_count integer;
  v_already boolean;
  v_code text := upper(trim(p_code));
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select d.id
    into v_existing
  from public.duels d
  join public.duel_players p on p.duel_id = d.id
  where p.user_id = p_user_id and d.status in ('open', 'active')
  order by d.created_at desc
  limit 1;

  select d.id, d.status, d.created_by, d.duration_s
    into v_id, v_status, v_created_by, v_duration
  from public.duels d
  where d.code = v_code
  for update;

  if not found then
    return query select null::uuid, v_code, null::text, 'not_found'::text;
    return;
  end if;

  if v_existing is not null and v_existing <> v_id then
    return query select v_id, v_code, v_status, 'already_in_duel'::text;
    return;
  end if;

  if v_created_by = p_user_id then
    return query select v_id, v_code, v_status, 'own_duel'::text;
    return;
  end if;

  if v_status = 'open' then
    select count(*) into v_count
    from public.duel_players where duel_id = v_id;

    if v_count >= 2 then
      return query select v_id, v_code, v_status, 'duel_full'::text;
      return;
    end if;

    insert into public.duel_players (duel_id, user_id, username, slot, last_seen_at)
    values (v_id, p_user_id, p_username, 2, now());

    update public.duels
       set status = 'active',
           started_at = now(),
           ends_at = now() + make_interval(secs => v_duration)
     where id = v_id;

    return query select v_id, v_code, 'active'::text, null::text;
    return;
  end if;

  if v_status = 'active' then
    select exists (
      select 1 from public.duel_players
      where duel_id = v_id and user_id = p_user_id
    ) into v_already;

    if v_already then
      return query select v_id, v_code, v_status, null::text;
      return;
    end if;

    return query select v_id, v_code, v_status, 'duel_full'::text;
    return;
  end if;

  return query select v_id, v_code, v_status, 'duel_finished'::text;
end;
$$;

-- Registra un intento y devuelve el objetivo para calcular las pistas.
create or replace function public.duel_register_attempt(
  p_duel_id uuid,
  p_user_id uuid,
  p_dinosaur_id uuid
) returns table (guess_id uuid, attempts integer, target_dinosaur_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_status text;
  v_ends timestamptz;
  v_max integer;
  v_attempts integer;
  v_solved timestamptz;
  v_target uuid;
  v_guess uuid;
begin
  select d.status, d.ends_at, d.max_attempts
    into v_status, v_ends, v_max
  from public.duels d
  where d.id = p_duel_id
  for update;

  if not found then
    return query select null::uuid, 0, null::uuid, 'not_found'::text;
    return;
  end if;

  if v_status <> 'active' then
    return query select null::uuid, 0, null::uuid, v_status;
    return;
  end if;

  if v_ends is not null and now() > v_ends then
    update public.duels
       set status = 'expired', finished_at = now()
     where id = p_duel_id and status = 'active';
    return query select null::uuid, 0, null::uuid, 'expired'::text;
    return;
  end if;

  select p.attempts, p.solved_at
    into v_attempts, v_solved
  from public.duel_players p
  where p.duel_id = p_duel_id and p.user_id = p_user_id
  for update;

  if not found then
    return query select null::uuid, 0, null::uuid, 'not_player'::text;
    return;
  end if;

  if v_solved is not null then
    return query select null::uuid, v_attempts, null::uuid, 'already_solved'::text;
    return;
  end if;

  if v_attempts >= v_max then
    return query select null::uuid, v_attempts, null::uuid, 'no_attempts'::text;
    return;
  end if;

  if exists (
    select 1 from public.duel_guesses g
    where g.duel_id = p_duel_id and g.user_id = p_user_id
      and g.dinosaur_id = p_dinosaur_id
  ) then
    return query select null::uuid, v_attempts, null::uuid, 'duplicate'::text;
    return;
  end if;

  update public.duel_players
     set attempts = attempts + 1
   where duel_id = p_duel_id and user_id = p_user_id
   returning attempts into v_attempts;

  insert into public.duel_guesses (duel_id, user_id, dinosaur_id, attempt_number)
  values (p_duel_id, p_user_id, p_dinosaur_id, v_attempts)
  returning id into v_guess;

  select s.dinosaur_id into v_target
  from public.duel_secrets s
  where s.duel_id = p_duel_id;

  return query select v_guess, v_attempts, v_target, 'ok'::text;
end;
$$;

-- Cierra el duelo a favor de quien acierta. Solo el primero gana.
create or replace function public.duel_solve(
  p_duel_id uuid,
  p_user_id uuid
) returns table (winner_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_winner uuid;
  v_status text;
begin
  update public.duels
     set status = 'finished', winner_id = p_user_id, finished_at = now()
   where id = p_duel_id and status = 'active'
   returning winner_id into v_winner;

  if found then
    update public.duel_players
       set solved_at = coalesce(solved_at, now())
     where duel_id = p_duel_id and user_id = p_user_id;

    return query select v_winner, 'finished'::text;
    return;
  end if;

  select d.status, d.winner_id into v_status, v_winner
  from public.duels d
  where d.id = p_duel_id;

  if not found then
    return query select null::uuid, 'not_found'::text;
    return;
  end if;

  return query select v_winner, v_status;
end;
$$;

-- Abandono: cancelar si aún no ha entrado nadie; victoria del rival si está activo.
create or replace function public.duel_forfeit(
  p_duel_id uuid,
  p_user_id uuid
) returns table (status text, winner_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_status text;
  v_winner uuid;
  v_opponent uuid;
begin
  select d.status into v_status
  from public.duels d
  where d.id = p_duel_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1 from public.duel_players
    where duel_id = p_duel_id and user_id = p_user_id
  ) then
    return query select 'not_player'::text, null::uuid;
    return;
  end if;

  if v_status = 'open' then
    update public.duels
       set status = 'cancelled', finished_at = now()
     where id = p_duel_id;
    return query select 'cancelled'::text, null::uuid;
    return;
  end if;

  if v_status <> 'active' then
    select d.winner_id into v_winner from public.duels d where d.id = p_duel_id;
    return query select v_status, v_winner;
    return;
  end if;

  select p.user_id into v_opponent
  from public.duel_players p
  where p.duel_id = p_duel_id and p.user_id <> p_user_id
  order by p.slot
  limit 1;

  if v_opponent is null then
    update public.duels
       set status = 'cancelled', finished_at = now()
     where id = p_duel_id;
    return query select 'cancelled'::text, null::uuid;
    return;
  end if;

  update public.duels
     set status = 'finished', winner_id = v_opponent, finished_at = now()
   where id = p_duel_id and status = 'active'
   returning winner_id into v_winner;

  return query select 'finished'::text, v_winner;
end;
$$;

-- Cierre perezoso: tiempo agotado o los dos sin intentos.
create or replace function public.duel_close_stale()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_total integer := 0;
  v_partial integer := 0;
begin
  update public.duels
     set status = 'expired', finished_at = now()
   where status = 'active'
     and ends_at is not null
     and ends_at <= now();
  get diagnostics v_total = row_count;

  update public.duels d
     set status = 'expired', finished_at = now()
   where d.status = 'active'
     and (select count(*) from public.duel_players p where p.duel_id = d.id) >= 2
     and not exists (
       select 1 from public.duel_players p
       where p.duel_id = d.id
         and p.solved_at is null
         and p.attempts < d.max_attempts
     );
  get diagnostics v_partial = row_count;

  return v_total + v_partial;
end;
$$;

-- Revancha: duelo nuevo con los mismos dos jugadores y secreto nuevo.
create or replace function public.duel_rematch(
  p_duel_id uuid,
  p_user_id uuid,
  p_code text,
  p_dinosaur_id uuid
) returns table (duel_id uuid, code text, status text, error text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_status text;
  v_existing uuid;
  v_duration integer;
  v_max integer;
  v_new uuid;
  v_players integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select d.status, d.rematch_id, d.duration_s, d.max_attempts
    into v_status, v_existing, v_duration, v_max
  from public.duels d
  where d.id = p_duel_id
  for update;

  if not found then
    return query select null::uuid, null::text, null::text, 'not_found'::text;
    return;
  end if;

  if not exists (
    select 1 from public.duel_players
    where duel_id = p_duel_id and user_id = p_user_id
  ) then
    return query select null::uuid, null::text, null::text, 'not_player'::text;
    return;
  end if;

  if v_status not in ('finished', 'expired', 'cancelled') then
    return query select null::uuid, null::text, null::text, 'duel_active'::text;
    return;
  end if;

  if v_existing is not null then
    return query
      select d.id, d.code, d.status, null::text
      from public.duels d where d.id = v_existing;
    return;
  end if;

  select count(*) into v_players
  from public.duel_players where duel_id = p_duel_id;

  if v_players < 2 then
    return query select null::uuid, null::text, null::text, 'no_rival'::text;
    return;
  end if;

  if exists (
    select 1
    from public.duels d
    join public.duel_players p on p.duel_id = d.id
    where p.user_id = p_user_id
      and d.status in ('open', 'active')
      and d.id <> p_duel_id
  ) then
    return query select null::uuid, null::text, null::text, 'already_in_duel'::text;
    return;
  end if;

  insert into public.duels (
    code, status, created_by, started_at, ends_at, duration_s, max_attempts
  ) values (
    upper(trim(p_code)), 'active', p_user_id, now(),
    now() + make_interval(secs => v_duration), v_duration, v_max
  )
  returning id into v_new;

  insert into public.duel_secrets (duel_id, dinosaur_id)
  values (v_new, p_dinosaur_id);

  insert into public.duel_players (duel_id, user_id, username, slot, last_seen_at)
  select v_new, p.user_id, p.username, p.slot, now()
  from public.duel_players p
  where p.duel_id = p_duel_id
  order by p.slot;

  update public.duels set rematch_id = v_new where id = p_duel_id;

  return query select v_new, upper(trim(p_code)), 'active'::text, null::text;
end;
$$;

-- ─── 6. Permisos de las funciones ────────────────────────────────────────────

revoke execute on function public.duel_create(uuid, text, text, uuid, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.duel_join(text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.duel_register_attempt(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.duel_solve(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.duel_forfeit(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.duel_close_stale()
  from public, anon, authenticated;
revoke execute on function public.duel_rematch(uuid, uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.duel_create(uuid, text, text, uuid, integer, integer)
  to service_role;
grant execute on function public.duel_join(text, uuid, text)
  to service_role;
grant execute on function public.duel_register_attempt(uuid, uuid, uuid)
  to service_role;
grant execute on function public.duel_solve(uuid, uuid)
  to service_role;
grant execute on function public.duel_forfeit(uuid, uuid)
  to service_role;
grant execute on function public.duel_close_stale()
  to service_role;
grant execute on function public.duel_rematch(uuid, uuid, text, uuid)
  to service_role;

commit;

-- ─── 7. Comprobaciones de seguridad (ejecutar a mano tras el despliegue) ─────
--
-- Con la clave pública (anon) deben fallar o devolver 0 filas:
--   select * from public.duel_secrets limit 1;
--   select * from public.duel_guesses limit 1;
--   insert into public.duel_guesses (duel_id, user_id, dinosaur_id, attempt_number)
--     values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 1);
--   select * from public.duels limit 1;
--
-- Y con un JWT de un jugador, `select * from public.duel_players` solo debe
-- devolver las filas de sus duelos. La publicación de Realtime no debe incluir
-- `duel_secrets` ni `duel_guesses`:
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and tablename like 'duel%';
