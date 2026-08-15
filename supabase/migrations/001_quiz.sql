create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  host_pin text not null unique default 'THAISJOAO',
  status text not null default 'lobby' check (status in ('lobby', 'question', 'results', 'finished')),
  current_question int not null default 0 check (current_question >= 0 and current_question <= 9),
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists quiz_correct_answers (
  question_index int primary key check (question_index >= 0 and question_index <= 9),
  correct_option text not null check (correct_option in ('A', 'B', 'C'))
);

insert into quiz_correct_answers (question_index, correct_option) values
  (0, 'B'),
  (1, 'B'),
  (2, 'B'),
  (3, 'B'),
  (4, 'C'),
  (5, 'A'),
  (6, 'A'),
  (7, 'A'),
  (8, 'B'),
  (9, 'B')
on conflict (question_index) do nothing;

create table if not exists quiz_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  display_name text not null,
  total_score int not null default 0,
  avatar_color text not null,
  created_at timestamptz not null default now(),
  unique (session_id, display_name)
);

create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references quiz_players(id) on delete cascade,
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  question_index int not null check (question_index >= 0 and question_index <= 9),
  selected_option text check (selected_option in ('A', 'B', 'C')),
  response_time_ms int,
  is_correct boolean not null default false,
  points_earned int not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, question_index)
);

insert into quiz_sessions (host_pin, status, current_question)
select 'THAISJOAO', 'lobby', 0
where not exists (select 1 from quiz_sessions limit 1);

create or replace function quiz_calculate_answer()
returns trigger
language plpgsql
as $$
declare
  correct text;
  remaining_ms int;
begin
  select correct_option into correct
  from quiz_correct_answers
  where question_index = new.question_index;

  if correct is null then
    new.is_correct := false;
    new.points_earned := 0;
    return new;
  end if;

  new.is_correct := new.selected_option is not null and new.selected_option = correct;

  if new.is_correct then
    remaining_ms := greatest(0, 15000 - coalesce(new.response_time_ms, 15000));
    new.points_earned := 1000 + floor((remaining_ms::numeric / 15000) * 500)::int;
  else
    new.points_earned := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists quiz_calculate_answer_trigger on quiz_answers;
create trigger quiz_calculate_answer_trigger
  before insert or update on quiz_answers
  for each row
  execute function quiz_calculate_answer();

create or replace function quiz_update_player_score()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update quiz_players
    set total_score = total_score + new.points_earned
    where id = new.player_id;
  elsif tg_op = 'UPDATE' then
    update quiz_players
    set total_score = total_score - old.points_earned + new.points_earned
    where id = new.player_id;
  end if;

  return new;
end;
$$;

drop trigger if exists quiz_update_player_score_trigger on quiz_answers;
create trigger quiz_update_player_score_trigger
  after insert or update on quiz_answers
  for each row
  execute function quiz_update_player_score();

create or replace function quiz_host_action(p_pin text, p_action text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session quiz_sessions%rowtype;
begin
  select * into v_session from quiz_sessions order by created_at asc limit 1;

  if v_session.id is null then
    raise exception 'Session not found';
  end if;

  if v_session.host_pin is distinct from p_pin then
    raise exception 'Invalid PIN';
  end if;

  case p_action
    when 'start' then
      update quiz_sessions
      set
        status = 'question',
        current_question = 0,
        question_started_at = now()
      where id = v_session.id;
    when 'next_question' then
      update quiz_sessions
      set
        status = 'question',
        current_question = least(current_question + 1, 9),
        question_started_at = now()
      where id = v_session.id;
    when 'show_results' then
      update quiz_sessions
      set status = 'results'
      where id = v_session.id;
    when 'finish' then
      update quiz_sessions
      set status = 'finished'
      where id = v_session.id;
    else
      raise exception 'Invalid action';
  end case;

  return json_build_object('ok', true);
end;
$$;

grant execute on function quiz_host_action(text, text) to anon, authenticated;

alter table quiz_sessions enable row level security;
alter table quiz_players enable row level security;
alter table quiz_answers enable row level security;
alter table quiz_correct_answers enable row level security;

drop policy if exists quiz_sessions_select on quiz_sessions;
create policy quiz_sessions_select on quiz_sessions
  for select to anon, authenticated
  using (true);

drop policy if exists quiz_players_select on quiz_players;
create policy quiz_players_select on quiz_players
  for select to anon, authenticated
  using (true);

drop policy if exists quiz_players_insert on quiz_players;
create policy quiz_players_insert on quiz_players
  for insert to anon, authenticated
  with check (true);

drop policy if exists quiz_answers_select on quiz_answers;
create policy quiz_answers_select on quiz_answers
  for select to anon, authenticated
  using (true);

drop policy if exists quiz_answers_insert on quiz_answers;
create policy quiz_answers_insert on quiz_answers
  for insert to anon, authenticated
  with check (true);

drop policy if exists quiz_answers_update on quiz_answers;
create policy quiz_answers_update on quiz_answers
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists quiz_correct_answers_select on quiz_correct_answers;
create policy quiz_correct_answers_select on quiz_correct_answers
  for select to anon, authenticated
  using (true);

alter publication supabase_realtime add table quiz_sessions;
alter publication supabase_realtime add table quiz_players;
alter publication supabase_realtime add table quiz_answers;