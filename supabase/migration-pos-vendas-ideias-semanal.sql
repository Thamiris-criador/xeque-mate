-- Ideias de conteúdo (agora persistidas, com opção de acrescentar novas pela tela) e o
-- lembrete semanal automático de movimentação de Pós-Vendas, alternando Thami/Cley.
-- Reaproveita "tarefas" (mesma tabela de sempre) e "equipe"; só cria a tabelinha de ideias.
-- Rode no SQL Editor do Supabase, depois de migration-pos-vendas-reversao.sql.

create table if not exists conteudo_ideias (
  id bigint generated always as identity primary key
);

do $$
declare
  col record;
begin
  for col in
    select column_name from information_schema.columns
    where table_name = 'conteudo_ideias' and table_schema = 'public'
      and column_name not in ('id', 'texto', 'created_at')
  loop
    execute format('alter table conteudo_ideias drop column %I', col.column_name);
  end loop;
end $$;

alter table conteudo_ideias
  add column if not exists texto text not null,
  add column if not exists created_at timestamptz not null default now();

alter table conteudo_ideias enable row level security;
drop policy if exists "conteudo_ideias_authenticated" on conteudo_ideias;
create policy "conteudo_ideias_authenticated" on conteudo_ideias for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into conteudo_ideias (texto)
select texto from (values
  ('3 coisas que todo cliente deveria saber antes da assembleia.'),
  ('Você sabe o que acontece depois que é contemplado?'),
  ('Lance embutido: quando ele pode fazer sentido?'),
  ('O que fazer quando a parcela apertou?'),
  ('Por que seu Pós-Vendas é importante depois da contratação?'),
  ('O que nossa equipe acompanha enquanto você espera sua contemplação?')
) as seed(texto)
where not exists (select 1 from conteudo_ideias);

-- Lembrete semanal automático: toda segunda-feira cria 1 tarefa de conteúdo,
-- alternando o responsável entre Thami e Cley, sem duplicar se já existir uma na semana.

create or replace function gerar_tarefa_semanal_pos_vendas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nome_vez text;
  responsavel_id bigint;
  ja_existe boolean;
begin
  nome_vez := case when extract(week from current_date)::int % 2 = 0 then 'Thami' else 'Cley' end;
  select id into responsavel_id from equipe where nome = nome_vez limit 1;
  if responsavel_id is null then
    return;
  end if;

  select exists(
    select 1 from tarefas
    where categoria = 'Pós-Vendas'
      and titulo = 'Lembrete semanal de conteúdo'
      and data >= date_trunc('week', current_date)::date
  ) into ja_existe;

  if ja_existe then
    return;
  end if;

  insert into tarefas (titulo, descricao, responsavel_id, data, prioridade, status, categoria)
  values (
    'Lembrete semanal de conteúdo',
    'Pelo menos 1 movimentação de conteúdo essa semana no grupo de Pós-Vendas.',
    responsavel_id, current_date, 'amarelo', 'pendente', 'Pós-Vendas'
  );
end;
$$;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'lembrete-semanal-pos-vendas') then
    perform cron.unschedule('lembrete-semanal-pos-vendas');
  end if;
end $$;

-- toda segunda-feira, 12:00 UTC = 09:00 em Brasília
select cron.schedule('lembrete-semanal-pos-vendas', '0 12 * * 1', $$select public.gerar_tarefa_semanal_pos_vendas();$$);

notify pgrst, 'reload schema';
