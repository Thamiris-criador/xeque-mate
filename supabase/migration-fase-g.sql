-- Fase G: reorganização das abas do cliente + campos novos
-- Rode no SQL Editor do Supabase, depois de todas as migrações anteriores.

alter table clientes
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists endereco text,
  add column if not exists obs_cliente text,
  add column if not exists origem_cliente text,
  add column if not exists marca text,
  add column if not exists situacao_cota text;
