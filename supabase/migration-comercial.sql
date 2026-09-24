-- Módulo Comercial (leads) — reaproveita clientes, equipe e tarefas já existentes.
-- NÃO cria uma segunda área de tarefas: tarefas de retorno vão pra tabela "tarefas" já usada no Pós-Vendas.
-- Rode no SQL Editor do Supabase (ou supabase db query --linked --file supabase/migration-comercial.sql)

-- ============================================================
-- 1. LEADS
-- ============================================================

create table if not exists leads (
  id bigint generated always as identity primary key
);

do $$
declare
  col record;
begin
  for col in
    select column_name from information_schema.columns
    where table_name = 'leads' and table_schema = 'public'
      and column_name not in (
        'id', 'nome', 'whatsapp', 'cpf', 'data_entrada', 'vendedor_id', 'canal_origem',
        'modelo_interesse', 'plano_interesse', 'valor_bem', 'parcela_desejada', 'status',
        'temperatura', 'proxima_acao', 'proximo_contato', 'observacoes', 'cliente_id',
        'convertido', 'created_at', 'updated_at'
      )
  loop
    execute format('alter table leads drop column %I', col.column_name);
  end loop;
end $$;

alter table leads
  add column if not exists nome text not null default '',
  add column if not exists whatsapp text,
  add column if not exists cpf text,
  add column if not exists data_entrada date not null default current_date,
  add column if not exists vendedor_id bigint,
  add column if not exists canal_origem text,
  add column if not exists modelo_interesse text,
  add column if not exists plano_interesse text,
  add column if not exists valor_bem numeric,
  add column if not exists parcela_desejada numeric,
  add column if not exists status text not null default 'novo',
  add column if not exists temperatura text not null default 'morno',
  add column if not exists proxima_acao text,
  add column if not exists proximo_contato date,
  add column if not exists observacoes text,
  add column if not exists cliente_id bigint,
  add column if not exists convertido boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table leads drop constraint if exists leads_vendedor_id_fkey;
alter table leads add constraint leads_vendedor_id_fkey
  foreign key (vendedor_id) references equipe(id) on delete set null;

alter table leads drop constraint if exists leads_cliente_id_fkey;
alter table leads add constraint leads_cliente_id_fkey
  foreign key (cliente_id) references clientes(id) on delete set null;

alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check
  check (status in (
    'novo', 'em_contato', 'interessado', 'proposta_enviada', 'em_negociacao', 'follow_up',
    'aguardando_cliente', 'fechado', 'sem_interesse', 'sem_retorno', 'adiado', 'perdido'
  ));

alter table leads drop constraint if exists leads_temperatura_check;
alter table leads add constraint leads_temperatura_check
  check (temperatura in ('frio', 'morno', 'quente'));

create index if not exists idx_leads_vendedor on leads(vendedor_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_whatsapp on leads(whatsapp);
create index if not exists idx_leads_cliente on leads(cliente_id);

-- ============================================================
-- 2. HISTÓRICO DE CONTATO DO LEAD
-- ============================================================

create table if not exists leads_historico (
  id bigint generated always as identity primary key
);

do $$
declare
  col record;
begin
  for col in
    select column_name from information_schema.columns
    where table_name = 'leads_historico' and table_schema = 'public'
      and column_name not in (
        'id', 'lead_id', 'data', 'tipo_contato', 'observacao', 'resultado',
        'proxima_acao', 'proximo_contato', 'created_at'
      )
  loop
    execute format('alter table leads_historico drop column %I', col.column_name);
  end loop;
end $$;

alter table leads_historico
  add column if not exists lead_id bigint,
  add column if not exists data date not null default current_date,
  add column if not exists tipo_contato text,
  add column if not exists observacao text,
  add column if not exists resultado text,
  add column if not exists proxima_acao text,
  add column if not exists proximo_contato date,
  add column if not exists created_at timestamptz not null default now();

alter table leads_historico drop constraint if exists leads_historico_lead_id_fkey;
alter table leads_historico add constraint leads_historico_lead_id_fkey
  foreign key (lead_id) references leads(id) on delete cascade;

create index if not exists idx_leads_historico_lead on leads_historico(lead_id);

-- ============================================================
-- 3. TAREFAS: vincular a um lead (mesma tabela de sempre, sem criar área nova)
-- ============================================================

alter table tarefas add column if not exists lead_id bigint;
alter table tarefas drop constraint if exists tarefas_lead_id_fkey;
alter table tarefas add constraint tarefas_lead_id_fkey
  foreign key (lead_id) references leads(id) on delete cascade;
create index if not exists idx_tarefas_lead on tarefas(lead_id);

-- ============================================================
-- 4. RLS (mesmo padrão já usado no resto do CRM)
-- ============================================================

alter table leads enable row level security;
drop policy if exists "leads_authenticated" on leads;
create policy "leads_authenticated" on leads for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table leads_historico enable row level security;
drop policy if exists "leads_historico_authenticated" on leads_historico;
create policy "leads_historico_authenticated" on leads_historico for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
