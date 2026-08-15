alter table quiz_sessions
  add column if not exists results_started_at timestamptz;

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
    if now() >= v_session.results_started_at + interval '15 seconds' then
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

create or replace function quiz_host_action(p_pin text, p_action text, p_value int default null)
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
        question_started_at = now(),
        results_started_at = null
      where id = v_session.id;
    when 'next_question' then
      update quiz_sessions
      set
        status = 'question',
        current_question = least(current_question + 1, 10),
        question_started_at = now(),
        results_started_at = null
      where id = v_session.id;
    when 'show_results' then
      update quiz_sessions
      set
        status = 'results',
        results_started_at = now()
      where id = v_session.id;
    when 'finish' then
      update quiz_sessions
      set status = 'finished'
      where id = v_session.id;
    when 'set_duration' then
      if v_session.status <> 'lobby' then
        raise exception 'Duration can only be set in lobby';
      end if;
      if p_value is null or p_value < 3 or p_value > 120 then
        raise exception 'Invalid duration';
      end if;
      update quiz_sessions
      set question_duration_ms = p_value * 1000
      where id = v_session.id;
    when 'reset' then
      delete from quiz_answers where session_id = v_session.id;
      delete from quiz_players where session_id = v_session.id;
      update quiz_sessions
      set
        status = 'lobby',
        current_question = 0,
        question_started_at = null,
        results_started_at = null
      where id = v_session.id;
    else
      raise exception 'Invalid action';
  end case;

  return json_build_object('ok', true);
end;
$$;

grant execute on function quiz_host_action(text, text, int) to anon, authenticated;
