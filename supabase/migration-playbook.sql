-- Playbook: base de conhecimento/treinamento da equipe, com anexos.
-- Rode no SQL Editor do Supabase (ou supabase db query --linked --file supabase/migration-playbook.sql)

create table if not exists playbook_itens (
  id bigint generated always as identity primary key,
  titulo text not null,
  descricao text,
  arquivo_url text,
  arquivo_nome text,
  criado_por text,
  created_at timestamptz not null default now()
);

alter table playbook_itens add column if not exists area text;
alter table playbook_itens drop constraint if exists playbook_itens_area_check;
alter table playbook_itens add constraint playbook_itens_area_check
  check (area in ('Comercial', 'Pós-Vendas', 'Financeiro'));

alter table playbook_itens enable row level security;

drop policy if exists "playbook_itens_authenticated" on playbook_itens;
create policy "playbook_itens_authenticated" on playbook_itens for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('playbook-arquivos', 'playbook-arquivos', true)
on conflict (id) do nothing;

drop policy if exists "playbook_arquivos_leitura" on storage.objects;
create policy "playbook_arquivos_leitura" on storage.objects for select
  using (bucket_id = 'playbook-arquivos');

drop policy if exists "playbook_arquivos_escrita" on storage.objects;
create policy "playbook_arquivos_escrita" on storage.objects for insert
  with check (bucket_id = 'playbook-arquivos' and auth.role() = 'authenticated');

drop policy if exists "playbook_arquivos_atualizacao" on storage.objects;
create policy "playbook_arquivos_atualizacao" on storage.objects for update
  using (bucket_id = 'playbook-arquivos' and auth.role() = 'authenticated');

drop policy if exists "playbook_arquivos_exclusao" on storage.objects;
create policy "playbook_arquivos_exclusao" on storage.objects for delete
  using (bucket_id = 'playbook-arquivos' and auth.role() = 'authenticated');

notify pgrst, 'reload schema';
