drop policy if exists quiz_players_delete on quiz_players;
create policy quiz_players_delete on quiz_players
  for delete to anon, authenticated
  using (true);
