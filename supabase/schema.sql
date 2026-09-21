-- Schema inicial do Xeque Mate CRM
-- Rode este script no SQL Editor do dashboard do Supabase (novo projeto, banco vazio)

drop table if exists clientes cascade;
drop table if exists equipe cascade;

create table if not exists equipe (
  id bigint generated always as identity primary key,
  nome text not null,
  email text,
  cargo text,
  created_at timestamptz not null default now()
);

create table if not exists clientes (
  id bigint generated always as identity primary key,
  nome text not null,
  whatsapp text,
  proposta text,
  grupo text,
  cota text,
  modelo text,
  responsavel_id bigint references equipe(id) on delete set null,
  jornada text not null default 'novo_pos_venda'
    check (jornada in ('novo_pos_venda', 'em_andamento', 'contemplado', 'finalizado')),
  financeiro_status text not null default 'em_dia'
    check (financeiro_status in ('em_dia', 'atrasado', 'inadimplente', 'cancelado')),
  proxima_acao text,
  data_nascimento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clientes_responsavel on clientes(responsavel_id);
create index if not exists idx_clientes_jornada on clientes(jornada);
create index if not exists idx_clientes_financeiro on clientes(financeiro_status);

-- RLS: só usuários autenticados (logados) podem ler/gravar
alter table equipe enable row level security;
alter table clientes enable row level security;

create policy "equipe_authenticated" on equipe
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "clientes_authenticated" on clientes
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
