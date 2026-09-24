-- Foto de perfil da equipe: coluna + bucket de storage público (leitura livre, escrita só autenticado).
-- Rode via SQL Editor do Supabase ou: supabase db query --linked --file supabase/migration-equipe-foto.sql

alter table equipe add column if not exists foto_url text;

insert into storage.buckets (id, name, public)
values ('equipe-fotos', 'equipe-fotos', true)
on conflict (id) do nothing;

drop policy if exists "equipe_fotos_leitura" on storage.objects;
create policy "equipe_fotos_leitura" on storage.objects for select
  using (bucket_id = 'equipe-fotos');

drop policy if exists "equipe_fotos_escrita" on storage.objects;
create policy "equipe_fotos_escrita" on storage.objects for insert
  with check (bucket_id = 'equipe-fotos' and auth.role() = 'authenticated');

drop policy if exists "equipe_fotos_atualizacao" on storage.objects;
create policy "equipe_fotos_atualizacao" on storage.objects for update
  using (bucket_id = 'equipe-fotos' and auth.role() = 'authenticated');

drop policy if exists "equipe_fotos_exclusao" on storage.objects;
create policy "equipe_fotos_exclusao" on storage.objects for delete
  using (bucket_id = 'equipe-fotos' and auth.role() = 'authenticated');

notify pgrst, 'reload schema';
