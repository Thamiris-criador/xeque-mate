-- Conteúdo editável da página Cultura (missão, visão, valores, cultura) — linha única (id=1).
-- Rode no SQL Editor do Supabase (ou via supabase db query --linked --file).

create table if not exists cultura_conteudo (
  id bigint primary key default 1,
  missao text,
  visao text,
  valores text,
  cultura text,
  updated_at timestamptz not null default now(),
  constraint cultura_conteudo_singleton check (id = 1)
);

insert into cultura_conteudo (id) values (1)
  on conflict (id) do nothing;

alter table cultura_conteudo enable row level security;

drop policy if exists "cultura_conteudo_authenticated" on cultura_conteudo;
create policy "cultura_conteudo_authenticated" on cultura_conteudo for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
