-- Brindes prometidos ao cliente (pix, parcela, moletom, emplacamento, chaveiro) e controle de entrega.
-- Rode via SQL Editor do Supabase ou: supabase db query --linked --file supabase/migration-brindes.sql

alter table clientes
  add column if not exists brindes_prometidos text[] not null default '{}',
  add column if not exists brindes_entregues text[] not null default '{}',
  add column if not exists brindes_data date;

notify pgrst, 'reload schema';
