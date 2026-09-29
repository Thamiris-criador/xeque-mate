-- Confirmação real de entrega de brinde: guarda data de envio + observação
-- por brinde, pra não sumir da lista só por ter sido clicado/visualizado.

alter table clientes
  add column if not exists brindes_confirmacoes jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
