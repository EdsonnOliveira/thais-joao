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
    remaining_ms := greatest(0, 7000 - coalesce(new.response_time_ms, 7000));
    new.points_earned := 1000 + floor((remaining_ms::numeric / 7000) * 500)::int;
  else
    new.points_earned := 0;
  end if;

  return new;
end;
$$;
