-- Lembrete automático de boleto: 5 dias antes do vencimento de cada cliente
-- (usando o campo "Dia de vencimento", não a assembleia), cria uma tarefa
-- pro Gabriel enviar o boleto. Roda sozinho todo dia via pg_cron.

create extension if not exists pg_cron;

create or replace function public.gerar_tarefas_boleto()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gabriel_id bigint;
begin
  select id into gabriel_id from equipe where nome = 'Gabriel' limit 1;
  if gabriel_id is null then
    return;
  end if;

  insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
  select
    c.id,
    'Enviar boleto - ' || c.nome,
    'Vencimento em ' || to_char(prox.data_venc, 'DD/MM/YYYY') || '.',
    gabriel_id,
    current_date,
    'amarelo',
    'pendente',
    'Boleto'
  from clientes c
  cross join lateral (
    select case
      when extract(day from current_date)::int <= c.dia_vencimento
        then make_date(extract(year from current_date)::int, extract(month from current_date)::int, c.dia_vencimento)
      else (make_date(extract(year from current_date)::int, extract(month from current_date)::int, c.dia_vencimento) + interval '1 month')::date
    end as data_venc
  ) prox
  where c.dia_vencimento is not null
    and c.financeiro_status <> 'cancelado'
    and (prox.data_venc - current_date) between 0 and 5
    and not exists (
      select 1 from tarefas t
      where t.cliente_id = c.id
        and t.categoria = 'Boleto'
        and t.created_at >= current_date - interval '20 days'
    );
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'gerar-tarefas-boleto-diario') then
    perform cron.unschedule('gerar-tarefas-boleto-diario');
  end if;
end $$;

-- 12:00 UTC = 09:00 em Brasília
select cron.schedule('gerar-tarefas-boleto-diario', '0 12 * * *', $$select public.gerar_tarefas_boleto();$$);

notify pgrst, 'reload schema';
