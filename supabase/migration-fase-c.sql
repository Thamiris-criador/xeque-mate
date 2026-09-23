-- Fase C: automações (gatilhos de banco de dados)
-- Rode no SQL Editor do Supabase, depois de já ter rodado migration-fase-a.sql e migration-fase-b.sql.
--
-- IMPORTANTE: antes de rodar este script, habilite a extensão "pg_cron" em
-- Database → Extensions (busque "pg_cron" e ative). Sem isso, a parte de
-- agendamento do lembrete de boleto (final do script) vai dar erro.

-- ============================================================
-- 1. Ao criar cliente com responsável definido: tarefas de onboarding e boas-vindas
-- ============================================================

create or replace function trg_cliente_onboarding()
returns trigger as $$
begin
  if new.responsavel_id is not null then
    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values
      (new.id, 'Boas-vindas', 'Entrar em contato para dar boas-vindas ao cliente.',
        new.responsavel_id, current_date, 'amarelo', 'pendente', 'Onboarding'),
      (new.id, 'Onboarding', 'Confirmar dados, explicar plano, parcelas, assembleias e canais de atendimento.',
        new.responsavel_id, current_date + 1, 'amarelo', 'pendente', 'Onboarding');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clientes_after_insert on clientes;
create trigger trg_clientes_after_insert
  after insert on clientes
  for each row execute function trg_cliente_onboarding();

-- ============================================================
-- 2. Cancelamento gera tarefa de reversão + abre o caso na tabela reversoes
-- ============================================================

create or replace function trg_cliente_cancelamento()
returns trigger as $$
begin
  if new.financeiro_status = 'cancelado' and old.financeiro_status is distinct from 'cancelado' then
    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values (new.id, 'Trabalhar reversão', 'Cliente solicitou cancelamento — buscar reversão.',
      new.responsavel_id, current_date, 'vermelho', 'pendente', 'Reversão');

    insert into reversoes (cliente_id, responsavel_id, data_pedido, status)
    values (new.id, new.responsavel_id, current_date, 'nao_trabalhado');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clientes_after_update_cancelamento on clientes;
create trigger trg_clientes_after_update_cancelamento
  after update on clientes
  for each row execute function trg_cliente_cancelamento();

-- ============================================================
-- 3. Lembrete de boleto — roda todo dia, cria tarefa 5 dias antes do vencimento
--    (vencimentos: 10, 15, 20, 21). Não duplica se já existir tarefa igual no dia.
--    Responsável: sempre o Gabriel (só ele recebe esse tipo de tarefa).
-- ============================================================

create or replace function gerar_tarefas_boleto()
returns void as $$
declare
  v_data date := current_date + 5;
  v_dia smallint := extract(day from v_data);
  v_gabriel_id bigint;
begin
  if v_dia not in (10, 15, 20, 21) then
    return;
  end if;

  select id into v_gabriel_id from equipe where nome = 'Gabriel' limit 1;
  if v_gabriel_id is null then
    return;
  end if;

  insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
  select
    c.id,
    'Lembrete de boleto',
    'Enviar lembrete de boleto ao cliente (vencimento em 5 dias, dia ' || v_dia || ').',
    v_gabriel_id,
    v_data,
    'amarelo',
    'pendente',
    'Boleto'
  from clientes c
  where c.dia_vencimento = v_dia
    and c.financeiro_status <> 'cancelado'
    and not exists (
      select 1 from tarefas t
      where t.cliente_id = c.id and t.categoria = 'Boleto' and t.data = v_data
    );
end;
$$ language plpgsql;

-- agenda diária às 08:00 (horário de Brasília = UTC-3 → 11:00 UTC)
select cron.unschedule('lembrete-boletos-diario') where exists (
  select 1 from cron.job where jobname = 'lembrete-boletos-diario'
);
select cron.schedule('lembrete-boletos-diario', '0 11 * * *', $$select gerar_tarefas_boleto();$$);
