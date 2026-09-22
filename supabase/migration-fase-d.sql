-- Fase D: campos de contemplação + gatilho de tarefa ao contemplar
-- Rode no SQL Editor do Supabase, depois das migrações A, B e C.

alter table clientes
  add column if not exists data_contemplacao date,
  add column if not exists tipo_contemplacao text,
  add column if not exists contemplacao_forma text check (contemplacao_forma in ('lance', 'sorteio')),
  add column if not exists status_documentacao text;

create or replace function trg_cliente_contemplacao()
returns trigger as $$
begin
  if new.financeiro_status = 'contemplado' and old.financeiro_status is distinct from 'contemplado' then
    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values (new.id, 'Acompanhar contemplação', 'Cliente contemplado — acompanhar documentação e próximos passos.',
      new.responsavel_id, current_date, 'vermelho', 'pendente', 'Contemplação');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clientes_after_update_contemplacao on clientes;
create trigger trg_clientes_after_update_contemplacao
  after update on clientes
  for each row execute function trg_cliente_contemplacao();
