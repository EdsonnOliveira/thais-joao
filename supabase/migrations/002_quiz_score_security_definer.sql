create or replace function quiz_update_player_score()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function quiz_calculate_answer()
returns trigger
language plpgsql
security definer
set search_path = public
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
