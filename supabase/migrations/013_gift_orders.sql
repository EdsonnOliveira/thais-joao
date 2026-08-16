create table if not exists gift_orders (
  id uuid primary key default gen_random_uuid(),
  order_nsu text unique,
  guest_name text,
  guest_email text,
  card_id text not null,
  card_image text not null,
  de text,
  presente text,
  mensagem text,
  items jsonb not null default '[]'::jsonb,
  total numeric(10, 2),
  purchased_at timestamptz not null default now()
);

create index if not exists gift_orders_purchased_at_idx on gift_orders (purchased_at desc);

alter table gift_orders enable row level security;

drop policy if exists gift_orders_public_read on gift_orders;
create policy gift_orders_public_read
  on gift_orders for select
  using (true);

drop policy if exists gift_orders_public_insert on gift_orders;
create policy gift_orders_public_insert
  on gift_orders for insert
  with check (true);

alter publication supabase_realtime add table gift_orders;
