-- Experiência do cliente (NPS) — nova seção dentro do módulo Clientes já existente.
-- Não mexe em nenhuma tabela/coluna existente. Rode no SQL Editor do Supabase.

-- ============================================================
-- 1. Tabela de avaliações (histórico completo, uma linha por pesquisa)
-- ============================================================

create table if not exists nps_avaliacoes (
  id bigint generated always as identity primary key
);

do $$
declare
  col record;
begin
  for col in
    select column_name from information_schema.columns
    where table_name = 'nps_avaliacoes' and table_schema = 'public'
      and column_name not in (
        'id', 'cliente_id', 'nota', 'data_pesquisa', 'avaliacao_pos_venda', 'feedback',
        'ponto_melhoria', 'responsavel_id', 'origem', 'criado_por', 'created_at'
      )
  loop
    execute format('alter table nps_avaliacoes drop column %I', col.column_name);
  end loop;
end $$;

alter table nps_avaliacoes
  add column if not exists cliente_id bigint,
  add column if not exists nota smallint not null,
  add column if not exists data_pesquisa date not null default current_date,
  add column if not exists avaliacao_pos_venda smallint,
  add column if not exists feedback text,
  add column if not exists ponto_melhoria text,
  add column if not exists responsavel_id bigint,
  add column if not exists origem text,
  add column if not exists criado_por text,
  add column if not exists created_at timestamptz not null default now();

alter table nps_avaliacoes drop constraint if exists nps_avaliacoes_cliente_id_fkey;
alter table nps_avaliacoes add constraint nps_avaliacoes_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete cascade;

alter table nps_avaliacoes drop constraint if exists nps_avaliacoes_responsavel_id_fkey;
alter table nps_avaliacoes add constraint nps_avaliacoes_responsavel_id_fkey
  foreign key (responsavel_id) references equipe(id) on delete set null;

alter table nps_avaliacoes drop constraint if exists nps_avaliacoes_nota_check;
alter table nps_avaliacoes add constraint nps_avaliacoes_nota_check
  check (nota between 0 and 10);

alter table nps_avaliacoes drop constraint if exists nps_avaliacoes_avaliacao_pos_venda_check;
alter table nps_avaliacoes add constraint nps_avaliacoes_avaliacao_pos_venda_check
  check (avaliacao_pos_venda is null or avaliacao_pos_venda between 1 and 5);

alter table nps_avaliacoes drop constraint if exists nps_avaliacoes_origem_check;
alter table nps_avaliacoes add constraint nps_avaliacoes_origem_check
  check (origem in (
    'Onboarding', 'Acompanhamento', 'Pós-assembleia', 'Pós-contemplação',
    'Pré-cancelamento', 'Pesquisa periódica'
  ));

create index if not exists idx_nps_avaliacoes_cliente on nps_avaliacoes(cliente_id);
create index if not exists idx_nps_avaliacoes_data on nps_avaliacoes(data_pesquisa);

alter table nps_avaliacoes enable row level security;
drop policy if exists "nps_avaliacoes_authenticated" on nps_avaliacoes;
create policy "nps_avaliacoes_authenticated" on nps_avaliacoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 2. Automação: cria tarefa pendente na tabela "tarefas" já existente,
--    conforme a classificação do NPS. Promotor não cria tarefa, só é
--    identificado pela nota (0–6 detrator / 7–8 neutro / 9–10 promotor).
-- ============================================================

create or replace function trg_nps_avaliacao_tarefa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.nota <= 6 then
    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values (
      new.cliente_id,
      'Contato prioritário - NPS baixo (' || new.nota || ')',
      'Pesquisa (' || coalesce(new.origem, 'sem origem') || ') classificada como Detrator. Feedback: ' || coalesce(new.feedback, '—'),
      new.responsavel_id,
      current_date,
      'vermelho',
      'pendente',
      'NPS'
    );
  elsif new.nota <= 8 then
    insert into tarefas (cliente_id, titulo, descricao, responsavel_id, data, prioridade, status, categoria)
    values (
      new.cliente_id,
      'Analisar oportunidade de melhoria - NPS ' || new.nota,
      'Pesquisa (' || coalesce(new.origem, 'sem origem') || ') classificada como Neutro. Ponto de melhoria: ' || coalesce(new.ponto_melhoria, '—'),
      new.responsavel_id,
      current_date,
      'amarelo',
      'pendente',
      'NPS'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_nps_avaliacoes_after_insert on nps_avaliacoes;
create trigger trg_nps_avaliacoes_after_insert
  after insert on nps_avaliacoes
  for each row execute function trg_nps_avaliacao_tarefa();

notify pgrst, 'reload schema';
