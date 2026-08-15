create table if not exists gift_purchases (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  guest_name text,
  guest_email text,
  purchased_at timestamptz not null default now(),
  unique (item_id)
);

create index if not exists gift_purchases_item_id_idx on gift_purchases (item_id);

alter table gift_purchases enable row level security;

drop policy if exists gift_purchases_public_read on gift_purchases;
create policy gift_purchases_public_read
  on gift_purchases for select
  using (true);

drop policy if exists gift_purchases_public_insert on gift_purchases;
create policy gift_purchases_public_insert
  on gift_purchases for insert
  with check (true);

alter publication supabase_realtime add table gift_purchases;
