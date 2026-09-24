-- Trava de verdade no banco: cada vendedora só enxerga/edita seus próprios leads.
-- Só quem tem visão geral é a área "Liderança" (Bia).
-- PRÉ-REQUISITO: rode migration-comercial.sql primeiro (cria as tabelas leads/leads_historico).
-- Rode no SQL Editor do Supabase (ou supabase db query --linked --file supabase/migration-comercial-rls.sql)

-- ============================================================
-- 1. LEADS: políticas por operação, checando quem está logado pelo e-mail do JWT
-- ============================================================

drop policy if exists "leads_authenticated" on leads;

drop policy if exists "leads_select_carteira" on leads;
create policy "leads_select_carteira" on leads for select
  using (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_insert_carteira" on leads;
create policy "leads_insert_carteira" on leads for insert
  with check (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_update_carteira" on leads;
create policy "leads_update_carteira" on leads for update
  using (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  )
  with check (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_delete_carteira" on leads;
create policy "leads_delete_carteira" on leads for delete
  using (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

-- ============================================================
-- 2. LEADS_HISTORICO: segue a mesma regra do lead "pai"
-- ============================================================

drop policy if exists "leads_historico_authenticated" on leads_historico;

drop policy if exists "leads_historico_select_carteira" on leads_historico;
create policy "leads_historico_select_carteira" on leads_historico for select
  using (
    exists (
      select 1 from leads l
      where l.id = leads_historico.lead_id
        and (
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
          or l.vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
        )
    )
  );

drop policy if exists "leads_historico_insert_carteira" on leads_historico;
create policy "leads_historico_insert_carteira" on leads_historico for insert
  with check (
    exists (
      select 1 from leads l
      where l.id = leads_historico.lead_id
        and (
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
          or l.vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
        )
    )
  );

drop policy if exists "leads_historico_update_carteira" on leads_historico;
create policy "leads_historico_update_carteira" on leads_historico for update
  using (
    exists (
      select 1 from leads l
      where l.id = leads_historico.lead_id
        and (
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
          or l.vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
        )
    )
  );

drop policy if exists "leads_historico_delete_carteira" on leads_historico;
create policy "leads_historico_delete_carteira" on leads_historico for delete
  using (
    exists (
      select 1 from leads l
      where l.id = leads_historico.lead_id
        and (
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and e.area = 'Liderança')
          or l.vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
        )
    )
  );

-- ============================================================
-- 3. Checagem de duplicidade sem quebrar a privacidade da carteira
--    (roda com privilégio elevado só pra responder sim/não, sem mostrar de quem é o lead)
-- ============================================================

create or replace function check_duplicidade_contato(p_whatsapp text, p_cpf text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from leads
    where (p_whatsapp is not null and p_whatsapp <> '' and whatsapp = p_whatsapp)
       or (p_cpf is not null and p_cpf <> '' and cpf = p_cpf)
    union all
    select 1 from clientes
    where (p_whatsapp is not null and p_whatsapp <> '' and whatsapp = p_whatsapp)
       or (p_cpf is not null and p_cpf <> '' and cpf = p_cpf)
  );
$$;

grant execute on function check_duplicidade_contato(text, text) to authenticated;

notify pgrst, 'reload schema';
