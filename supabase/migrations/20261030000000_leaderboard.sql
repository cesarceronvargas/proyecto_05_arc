-- SPEC 06: games catalogue (only games with a real engine) and public leaderboard scores.

create table public.games (
  id text primary key, -- same as Game.id in lib/games.ts
  title text not null,
  created_at timestamptz not null default now()
);

insert into public.games (id, title) values ('rocas', 'ROCAS');

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games (id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

create index scores_game_top_idx on public.scores (game_id, score desc, created_at asc);
create index scores_global_top_idx on public.scores (score desc, created_at asc);
create index scores_player_idx on public.scores (player_name);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games are readable by everyone"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "scores are readable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

-- No update/delete policies: with RLS on, those operations affect zero rows.
create policy "anyone can submit a valid score"
  on public.scores for insert
  to anon, authenticated
  with check (
    char_length(player_name) between 1 and 10
    and score between 0 and 10000000
  );
