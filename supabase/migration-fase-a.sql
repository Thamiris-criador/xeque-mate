-- Fase A: fundação do CRM completo (Xeque Mate Consórcios)
-- Script ADITIVO — não apaga nada, seguro para rodar com os 792 clientes já cadastrados.
-- Rode no SQL Editor do dashboard do Supabase.

-- ============================================================
-- 1. EQUIPE: área + pessoas novas do documento
-- ============================================================

alter table equipe add column if not exists area text
  check (area in ('Liderança', 'Comercial', 'Pós-Vendas', 'Financeiro'));

update equipe set area = 'Pós-Vendas'
  where nome in ('Gabriel', 'Thamiris', 'Cley') and area is null;

update equipe set cargo = 'Pós-Vendas | Suporte'
  where nome = 'Gabriel';

insert into equipe (nome, area, cargo)
select 'Bia', 'Liderança', 'CEO | Xeque Mate Consórcios'
where not exists (select 1 from equipe where nome = 'Bia');

insert into equipe (nome, area, cargo)
select v.nome, 'Comercial', 'Vendas'
from (values ('Kelmy'), ('Bruna'), ('Thay')) as v(nome)
where not exists (select 1 from equipe e where e.nome = v.nome);

insert into equipe (nome, area, cargo)
select 'Marisa', 'Pós-Vendas', 'Pós-Vendas'
where not exists (select 1 from equipe where nome = 'Marisa');

-- ============================================================
-- 2. CLIENTES: campos novos (todos opcionais, não quebram os registros atuais)
-- ============================================================

alter table clientes
  add column if not exists cpf text,
  add column if not exists email text,
  add column if not exists data_venda date,
  add column if not exists valor_credito numeric,
  add column if not exists vendedor_id bigint references equipe(id) on delete set null,
  add column if not exists prazo_grupo integer,
  add column if not exists parcela_valor numeric,
  add column if not exists data_inicio date,
  add column if not exists proxima_assembleia date,
  add column if not exists dia_vencimento smallint check (dia_vencimento in (10, 15, 20, 21)),
  add column if not exists primeiro_contato date,
  add column if not exists onboarding_realizado boolean not null default false,
  add column if not exists boas_vindas_realizada boolean not null default false,
  add column if not exists cliente_orientado boolean not null default false,
  add column if not exists ultimo_contato date,
  add column if not exists proximo_contato date,
  add column if not exists acompanhamento_status text
    check (acompanhamento_status in (
      'novo', 'em_acompanhamento', 'aguardando_cliente', 'pendencia',
      'resolvido', 'contemplado', 'cancelamento', 'reversao', 'finalizado'
    )),
  add column if not exists motivo_atraso text,
  add column if not exists intencao_continuar text
    check (intencao_continuar in ('sim', 'nao', 'talvez', 'aguardando_retorno')),
  add column if not exists acordo_realizado text,
  add column if not exists data_promessa date,
  add column if not exists pagamento_compensado boolean,
  add column if not exists data_compensacao date,
  add column if not exists obs_atraso text;

create unique index if not exists idx_clientes_cpf_unique on clientes(cpf) where cpf is not null;
create index if not exists idx_clientes_vendedor on clientes(vendedor_id);

-- status financeiro: 6 opções (mantém "inadimplente", adiciona "acordo" e "contemplado")
alter table clientes drop constraint if exists clientes_financeiro_status_check;
alter table clientes add constraint clientes_financeiro_status_check
  check (financeiro_status in ('em_dia', 'atrasado', 'inadimplente', 'acordo', 'cancelado', 'contemplado'));

-- ============================================================
-- 3. TABELAS NOVAS (estrutura pronta; UI/lógica chegam nas próximas fases)
-- ============================================================

-- Tabelas criadas com ADD COLUMN IF NOT EXISTS (em vez de tudo dentro do CREATE TABLE)
-- pra serem seguras de re-rodar mesmo se uma tentativa anterior já criou a tabela
-- parcialmente (CREATE TABLE IF NOT EXISTS não adiciona colunas que faltam).

create table if not exists tarefas (
  id bigint generated always as identity primary key
);
-- Se cliente_id/responsavel_id já existiam com tipo errado (ex: uuid, de uma
-- criação anterior via Table Editor), derruba pra recriar certo com ADD COLUMN abaixo.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'tarefas' and column_name = 'cliente_id' and data_type <> 'bigint') then
    alter table tarefas drop column cliente_id;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'tarefas' and column_name = 'responsavel_id' and data_type <> 'bigint') then
    alter table tarefas drop column responsavel_id;
  end if;
end $$;
alter table tarefas
  add column if not exists cliente_id bigint references clientes(id) on delete cascade,
  add column if not exists titulo text,
  add column if not exists descricao text,
  add column if not exists responsavel_id bigint references equipe(id) on delete set null,
  add column if not exists data date,
  add column if not exists horario time,
  add column if not exists prioridade text,
  add column if not exists status text not null default 'pendente',
  add column if not exists categoria text,
  add column if not exists data_conclusao date,
  add column if not exists observacao text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
alter table tarefas drop constraint if exists tarefas_prioridade_check;
alter table tarefas add constraint tarefas_prioridade_check
  check (prioridade in ('vermelho', 'amarelo', 'verde'));
alter table tarefas drop constraint if exists tarefas_status_check;
alter table tarefas add constraint tarefas_status_check
  check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada'));
-- Garante as FKs mesmo se as colunas já existiam sem elas (mesmo motivo do "data" acima)
alter table tarefas drop constraint if exists tarefas_cliente_id_fkey;
alter table tarefas add constraint tarefas_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete cascade;
alter table tarefas drop constraint if exists tarefas_responsavel_id_fkey;
alter table tarefas add constraint tarefas_responsavel_id_fkey
  foreign key (responsavel_id) references equipe(id) on delete set null;
create index if not exists idx_tarefas_cliente on tarefas(cliente_id);
create index if not exists idx_tarefas_responsavel on tarefas(responsavel_id);
create index if not exists idx_tarefas_status on tarefas(status);
create index if not exists idx_tarefas_data on tarefas(data);

create table if not exists historico (
  id bigint generated always as identity primary key
);
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'historico' and column_name = 'cliente_id' and data_type <> 'bigint') then
    alter table historico drop column cliente_id;
  end if;
end $$;
alter table historico
  add column if not exists cliente_id bigint references clientes(id) on delete cascade,
  add column if not exists tipo text,
  add column if not exists descricao text,
  add column if not exists campo text,
  add column if not exists valor_anterior text,
  add column if not exists valor_novo text,
  add column if not exists usuario text,
  add column if not exists created_at timestamptz not null default now();
alter table historico drop constraint if exists historico_cliente_id_fkey;
alter table historico add constraint historico_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete cascade;
create index if not exists idx_historico_cliente on historico(cliente_id);

create table if not exists reversoes (
  id bigint generated always as identity primary key
);
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'reversoes' and column_name = 'cliente_id' and data_type <> 'bigint') then
    alter table reversoes drop column cliente_id;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'reversoes' and column_name = 'responsavel_id' and data_type <> 'bigint') then
    alter table reversoes drop column responsavel_id;
  end if;
end $$;
alter table reversoes
  add column if not exists cliente_id bigint references clientes(id) on delete cascade,
  add column if not exists responsavel_id bigint references equipe(id) on delete set null,
  add column if not exists motivo_cancelamento text,
  add column if not exists data_pedido date,
  add column if not exists data_contato date,
  add column if not exists status text not null default 'nao_trabalhado',
  add column if not exists estrategia text,
  add column if not exists resultado text,
  add column if not exists observacoes text,
  add column if not exists data_reversao date,
  add column if not exists comprovante text,
  add column if not exists valor_bonificacao numeric default 50.00,
  add column if not exists created_at timestamptz not null default now();
alter table reversoes drop constraint if exists reversoes_status_check;
alter table reversoes add constraint reversoes_status_check
  check (status in (
    'nao_trabalhado', 'em_contato', 'demonstrou_interesse',
    'em_negociacao', 'revertido', 'sem_interesse'
  ));
alter table reversoes drop constraint if exists reversoes_cliente_id_fkey;
alter table reversoes add constraint reversoes_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete cascade;
alter table reversoes drop constraint if exists reversoes_responsavel_id_fkey;
alter table reversoes add constraint reversoes_responsavel_id_fkey
  foreign key (responsavel_id) references equipe(id) on delete set null;
create index if not exists idx_reversoes_cliente on reversoes(cliente_id);

create table if not exists indicacoes (
  id bigint generated always as identity primary key
);
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'indicacoes' and column_name = 'cliente_id' and data_type <> 'bigint') then
    alter table indicacoes drop column cliente_id;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'indicacoes' and column_name = 'responsavel_id' and data_type <> 'bigint') then
    alter table indicacoes drop column responsavel_id;
  end if;
end $$;
alter table indicacoes
  add column if not exists cliente_id bigint references clientes(id) on delete cascade,
  add column if not exists data_pedido date,
  add column if not exists pessoa_indicada text,
  add column if not exists telefone_indicacao text,
  add column if not exists status text not null default 'solicitada',
  add column if not exists responsavel_id bigint references equipe(id) on delete set null,
  add column if not exists observacoes text,
  add column if not exists created_at timestamptz not null default now();
alter table indicacoes drop constraint if exists indicacoes_status_check;
alter table indicacoes add constraint indicacoes_status_check
  check (status in (
    'solicitada', 'recebida', 'em_contato', 'oportunidade', 'convertida', 'sem_interesse'
  ));
alter table indicacoes drop constraint if exists indicacoes_cliente_id_fkey;
alter table indicacoes add constraint indicacoes_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete cascade;
alter table indicacoes drop constraint if exists indicacoes_responsavel_id_fkey;
alter table indicacoes add constraint indicacoes_responsavel_id_fkey
  foreign key (responsavel_id) references equipe(id) on delete set null;
create index if not exists idx_indicacoes_cliente on indicacoes(cliente_id);

-- RLS: mesmo padrão já usado nas tabelas existentes
alter table tarefas enable row level security;
alter table historico enable row level security;
alter table reversoes enable row level security;
alter table indicacoes enable row level security;

drop policy if exists "tarefas_authenticated" on tarefas;
create policy "tarefas_authenticated" on tarefas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "historico_authenticated" on historico;
create policy "historico_authenticated" on historico for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "reversoes_authenticated" on reversoes;
create policy "reversoes_authenticated" on reversoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "indicacoes_authenticated" on indicacoes;
create policy "indicacoes_authenticated" on indicacoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Força o PostgREST a recarregar o cache de schema (relações novas/corrigidas)
notify pgrst, 'reload schema';
