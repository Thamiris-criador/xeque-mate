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

create table if not exists tarefas (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  titulo text not null,
  descricao text,
  responsavel_id bigint references equipe(id) on delete set null,
  data date not null,
  horario time,
  prioridade text check (prioridade in ('vermelho', 'amarelo', 'verde')),
  status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  categoria text,
  data_conclusao date,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tarefas_cliente on tarefas(cliente_id);
create index if not exists idx_tarefas_responsavel on tarefas(responsavel_id);
create index if not exists idx_tarefas_status on tarefas(status);
create index if not exists idx_tarefas_data on tarefas(data);

create table if not exists historico (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  tipo text not null,
  descricao text,
  campo text,
  valor_anterior text,
  valor_novo text,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists idx_historico_cliente on historico(cliente_id);

create table if not exists reversoes (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  responsavel_id bigint references equipe(id) on delete set null,
  motivo_cancelamento text,
  data_pedido date,
  data_contato date,
  status text not null default 'nao_trabalhado'
    check (status in (
      'nao_trabalhado', 'em_contato', 'demonstrou_interesse',
      'em_negociacao', 'revertido', 'sem_interesse'
    )),
  estrategia text,
  resultado text,
  observacoes text,
  data_reversao date,
  comprovante text,
  valor_bonificacao numeric default 50.00,
  created_at timestamptz not null default now()
);
create index if not exists idx_reversoes_cliente on reversoes(cliente_id);

create table if not exists indicacoes (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  data_pedido date,
  pessoa_indicada text,
  telefone_indicacao text,
  status text not null default 'solicitada'
    check (status in (
      'solicitada', 'recebida', 'em_contato', 'oportunidade', 'convertida', 'sem_interesse'
    )),
  responsavel_id bigint references equipe(id) on delete set null,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_indicacoes_cliente on indicacoes(cliente_id);

-- RLS: mesmo padrão já usado nas tabelas existentes
alter table tarefas enable row level security;
alter table historico enable row level security;
alter table reversoes enable row level security;
alter table indicacoes enable row level security;

create policy "tarefas_authenticated" on tarefas for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "historico_authenticated" on historico for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "reversoes_authenticated" on reversoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "indicacoes_authenticated" on indicacoes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
