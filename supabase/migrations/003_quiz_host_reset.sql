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
    when 'reset' then
      delete from quiz_answers where session_id = v_session.id;
      delete from quiz_players where session_id = v_session.id;
      update quiz_sessions
      set
        status = 'lobby',
        current_question = 0,
        question_started_at = null
      where id = v_session.id;
    else
      raise exception 'Invalid action';
  end case;

  return json_build_object('ok', true);
end;
$$;
