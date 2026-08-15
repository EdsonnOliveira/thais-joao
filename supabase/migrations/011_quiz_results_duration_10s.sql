create or replace function quiz_auto_advance()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session quiz_sessions%rowtype;
  v_duration_ms int;
begin
  select * into v_session from quiz_sessions order by created_at asc limit 1 for update;

  if v_session.id is null then
    return json_build_object('ok', false);
  end if;

  v_duration_ms := greatest(3000, least(coalesce(v_session.question_duration_ms, 7000), 120000));

  if v_session.status = 'results' and v_session.results_started_at is null then
    update quiz_sessions
    set results_started_at = now()
    where id = v_session.id;
    return json_build_object('ok', true, 'action', null);
  end if;

  if v_session.status = 'question' and v_session.question_started_at is not null then
    if now() >= v_session.question_started_at + ((v_duration_ms + 1000)::text || ' milliseconds')::interval then
      update quiz_sessions
      set
        status = 'results',
        results_started_at = now()
      where id = v_session.id;
      return json_build_object('ok', true, 'action', 'show_results');
    end if;
  end if;

  if v_session.status = 'results' and v_session.results_started_at is not null then
    if now() >= v_session.results_started_at + interval '10 seconds' then
      if v_session.current_question >= 10 then
        update quiz_sessions
        set status = 'finished'
        where id = v_session.id;
        return json_build_object('ok', true, 'action', 'finish');
      end if;
      update quiz_sessions
      set
        status = 'question',
        current_question = least(v_session.current_question + 1, 10),
        question_started_at = now(),
        results_started_at = null
      where id = v_session.id;
      return json_build_object('ok', true, 'action', 'next_question');
    end if;
  end if;

  return json_build_object('ok', true, 'action', null);
end;
$$;

grant execute on function quiz_auto_advance() to anon, authenticated;
