-- SPEC 06: tablas games y scores con RLS

create table public.games (
  id         text primary key,
  title      text not null,
  created_at timestamptz not null default now()
);

insert into public.games (id, title) values ('asteroids', 'ASTEROIDS');

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  user_id     uuid references auth.users (id) on delete set null,
  player_name text not null check (player_name ~ '^[A-Z0-9_]{3,12}$'),
  score       integer not null check (score >= 0 and score <= 10000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games: lectura pública" on public.games
  for select to anon, authenticated using (true);

create policy "scores: lectura pública" on public.scores
  for select to anon, authenticated using (true);

create policy "scores: insertar anónimo" on public.scores
  for insert to anon, authenticated
  with check (user_id is null and exists (select 1 from public.games g where g.id = game_id));
