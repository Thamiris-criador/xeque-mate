-- Régua automática de acompanhamento de boletos, dentro da aba Boletos já existente.
-- Reaproveita "tarefas" (não cria sistema de tarefas novo) e "clientes" (dia_vencimento,
-- financeiro_status) sem alterar nenhuma coluna dessas duas tabelas.
-- Rode no SQL Editor do Supabase, depois de já ter rodado migration-lembrete-boleto.sql.

-- ============================================================
-- 1. Tabela de ciclos de boleto (um registro por vencimento/mês/cliente)
-- ============================================================

create table if not exists boleto_ciclos (
  id bigint generated always as identity primary key
);

do $$
declare
  col record;
begin
  for col in
    select column_name from information_schema.columns
    where table_name = 'boleto_ciclos' and table_schema = 'public'
      and column_name not in (
        'id', 'cliente_id', 'vencimento', 'status', 'data_envio', 'data_pagamento',
        'promessa_data', 'tarefa_envio_id', 'tarefa_lance_id', 'tarefa_atraso_id', 'created_at'
      )
  loop
    execute format('alter table boleto_ciclos drop column %I', col.column_name);
  end loop;
end $$;

alter table boleto_ciclos
  add column if not exists cliente_id bigint,
  add column if not exists vencimento date not null,
  add column if not exists status text not null default 'a_enviar',
  add column if not exists data_envio date,
  add column if not exists data_pagamento date,
  add column if not exists promessa_data date,
  add column if not exists tarefa_envio_id bigint,
  add column if not exists tarefa_lance_id bigint,
  add column if not exists tarefa_atraso_id bigint,
  add column if not exists created_at timestamptz not null default now();

alter table boleto_ciclos drop constraint if exists boleto_ciclos_cliente_id_fkey;
alter table boleto_ciclos add constraint boleto_ciclos_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete cascade;

alter table boleto_ciclos drop constraint if exists boleto_ciclos_tarefa_envio_id_fkey;
alter table boleto_ciclos add constraint boleto_ciclos_tarefa_envio_id_fkey
  foreign key (tarefa_envio_id) references tarefas(id) on delete set null;

alter table boleto_ciclos drop constraint if exists boleto_ciclos_tarefa_lance_id_fkey;
alter table boleto_ciclos add constraint boleto_ciclos_tarefa_lance_id_fkey
  foreign key (tarefa_lance_id) references tarefas(id) on delete set null;

alter table boleto_ciclos drop constraint if exists boleto_ciclos_tarefa_atraso_id_fkey;
alter table boleto_ciclos add constraint boleto_ciclos_tarefa_atraso_id_fkey
  foreign key (tarefa_atraso_id) references tarefas(id) on delete set null;

alter table boleto_ciclos drop constraint if exists boleto_ciclos_status_check;
alter table boleto_ciclos add constraint boleto_ciclos_status_check
  check (status in ('a_enviar', 'enviado', 'pago', 'em_atraso', 'promessa_pagamento'));

alter table boleto_ciclos drop constraint if exists boleto_ciclos_cliente_vencimento_key;
alter table boleto_ciclos add constraint boleto_ciclos_cliente_vencimento_key
  unique (cliente_id, vencimento);

create index if not exists idx_boleto_ciclos_cliente on boleto_ciclos(cliente_id);
create index if not exists idx_boleto_ciclos_status on boleto_ciclos(status);

alter table boleto_ciclos enable row level security;
drop policy if exists "boleto_ciclos_authenticated" on boleto_ciclos;
create policy "boleto_ciclos_authenticated" on boleto_ciclos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 2. Job diário: cria o ciclo + a tarefa "Enviar boleto" (regra 1), e detecta
--    atraso e promessa quebrada sozinho (regras 5 e 6), sempre criando a tarefa
--    de contato só uma vez por ciclo (nunca duplica).
-- ============================================================

create or replace function gerar_tarefas_boleto()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gabriel_id bigint;
  c record;
  ciclo record;
  nova_tarefa_id bigint;
  dias int;
begin
  select id into gabriel_id from equipe where nome = 'Gabriel' limit 1;
  if gabriel_id is null then
    return;
  end if;

  -- Regra 1: 5 dias antes do vencimento, cria o ciclo (status "a_enviar") e a tarefa do Gabriel
  for c in
    select cli.id, cli.nome, prox.data_venc
    from clientes cli
    cross join lateral (
      select case
        when extract(day from current_date)::int <= cli.dia_vencimento
          then make_date(extract(year from current_date)::int, extract(month from current_date)::int, cli.dia_vencimento)
        else (make_date(extract(year from current_date)::int, extract(month from current_date)::int, cli.dia_vencimento) + interval '1 month')::date
      end as data_venc
    ) prox
    where cli.dia_vencimento is not null
      and cli.financeiro_status <> 'cancelado'
      and (prox.data_venc - current_date) between 0 and 5
      and not exists (
        select 1 from boleto_ciclos bc where bc.cliente_id = cli.id and bc.vencimento = prox.data_venc
      )
  loop
    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values (
      c.id,
      'Enviar boleto - ' || c.nome,
      'Vencimento em ' || to_char(c.data_venc, 'DD/MM/YYYY') || '.',
      gabriel_id, current_date, 'amarelo', 'pendente', 'Boleto'
    )
    returning id into nova_tarefa_id;

    insert into boleto_ciclos (cliente_id, vencimento, status, tarefa_envio_id)
    values (c.id, c.data_venc, 'a_enviar', nova_tarefa_id)
    on conflict (cliente_id, vencimento) do nothing;
  end loop;

  -- Regra 5: venceu e ninguém confirmou o pagamento → em atraso + tarefa de contato (uma vez só)
  for ciclo in
    select * from boleto_ciclos where status = 'enviado' and vencimento < current_date
  loop
    dias := current_date - ciclo.vencimento;
    update boleto_ciclos set status = 'em_atraso' where id = ciclo.id;

    if ciclo.tarefa_atraso_id is null then
      insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
      values (
        ciclo.cliente_id,
        'Entrar em contato - boleto em atraso (' || dias || ' dias)',
        'Vencimento em ' || to_char(ciclo.vencimento, 'DD/MM/YYYY') || ', pagamento ainda não confirmado.',
        gabriel_id, current_date, 'vermelho', 'pendente', 'Boleto'
      )
      returning id into nova_tarefa_id;

      update boleto_ciclos set tarefa_atraso_id = nova_tarefa_id where id = ciclo.id;
    end if;
  end loop;

  -- Regra 6: cliente prometeu pagar até uma data e ela passou sem confirmação → nova tarefa
  for ciclo in
    select * from boleto_ciclos where status = 'promessa_pagamento' and promessa_data < current_date
  loop
    update boleto_ciclos set status = 'em_atraso' where id = ciclo.id;

    if ciclo.tarefa_atraso_id is null then
      insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
      values (
        ciclo.cliente_id,
        'Entrar em contato - promessa de pagamento não cumprida',
        'Promessa de pagamento para ' || to_char(ciclo.promessa_data, 'DD/MM/YYYY') || ' não foi cumprida.',
        gabriel_id, current_date, 'vermelho', 'pendente', 'Boleto'
      )
      returning id into nova_tarefa_id;

      update boleto_ciclos set tarefa_atraso_id = nova_tarefa_id where id = ciclo.id;
    end if;
  end loop;
end;
$$;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'gerar-tarefas-boleto-diario') then
    perform cron.unschedule('gerar-tarefas-boleto-diario');
  end if;
end $$;

-- 12:00 UTC = 09:00 em Brasília
select cron.schedule('gerar-tarefas-boleto-diario', '0 12 * * *', $$select public.gerar_tarefas_boleto();$$);

-- ============================================================
-- 3. Ações manuais (chamadas pela tela) — cada uma mexe só no ciclo e, quando
--    faz sentido, fecha/cria a tarefa correspondente na tabela já existente.
-- ============================================================

create or replace function marcar_boleto_enviado(p_ciclo_id bigint, p_data date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tarefa_id bigint;
begin
  update boleto_ciclos set status = 'enviado', data_envio = p_data
  where id = p_ciclo_id and status = 'a_enviar'
  returning tarefa_envio_id into v_tarefa_id;

  if v_tarefa_id is not null then
    update tarefas set status = 'concluida', data_conclusao = p_data where id = v_tarefa_id;
  end if;
end;
$$;

create or replace function marcar_boleto_pago(p_ciclo_id bigint, p_data date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id bigint;
  v_cliente_nome text;
  v_tarefa_lance_id bigint;
  gabriel_id bigint;
begin
  select cliente_id, tarefa_lance_id into v_cliente_id, v_tarefa_lance_id
  from boleto_ciclos where id = p_ciclo_id;

  update boleto_ciclos set status = 'pago', data_pagamento = p_data where id = p_ciclo_id;

  if v_tarefa_lance_id is null then
    select id into gabriel_id from equipe where nome = 'Gabriel' limit 1;
    select nome into v_cliente_nome from clientes where id = v_cliente_id;

    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values (
      v_cliente_id,
      'Enviar oferta de lance - ' || coalesce(v_cliente_nome, ''),
      'Pagamento do boleto confirmado em ' || to_char(p_data, 'DD/MM/YYYY') || '.',
      gabriel_id, current_date, 'verde', 'pendente', 'Boleto'
    )
    returning id into v_tarefa_lance_id;

    update boleto_ciclos set tarefa_lance_id = v_tarefa_lance_id where id = p_ciclo_id;
  end if;
end;
$$;

create or replace function registrar_promessa_boleto(p_ciclo_id bigint, p_data date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update boleto_ciclos set status = 'promessa_pagamento', promessa_data = p_data, tarefa_atraso_id = null
  where id = p_ciclo_id;
end;
$$;

grant execute on function marcar_boleto_enviado(bigint, date) to authenticated;
grant execute on function marcar_boleto_pago(bigint, date) to authenticated;
grant execute on function registrar_promessa_boleto(bigint, date) to authenticated;

notify pgrst, 'reload schema';
