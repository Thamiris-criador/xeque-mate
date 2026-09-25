-- Acesso total: Bia e Thami enxergam o CRM inteiro (igual à Liderança),
-- independente do valor de "area" cadastrado para cada uma.

alter table equipe add column if not exists acesso_total boolean not null default false;

update equipe set acesso_total = true where nome in ('Bia', 'Thami');

-- Atualiza as políticas de leads/leads_historico pra também liberar quem tem acesso_total = true
-- (antes só liberava quem tinha area = 'Liderança').

drop policy if exists "leads_select_carteira" on leads;
create policy "leads_select_carteira" on leads for select
  using (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_insert_carteira" on leads;
create policy "leads_insert_carteira" on leads for insert
  with check (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_update_carteira" on leads;
create policy "leads_update_carteira" on leads for update
  using (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  )
  with check (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_delete_carteira" on leads;
create policy "leads_delete_carteira" on leads for delete
  using (
    exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
    or vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
  );

drop policy if exists "leads_historico_select_carteira" on leads_historico;
create policy "leads_historico_select_carteira" on leads_historico for select
  using (
    exists (
      select 1 from leads l
      where l.id = leads_historico.lead_id
        and (
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
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
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
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
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
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
          exists (select 1 from equipe e where e.email = auth.jwt() ->> 'email' and (e.area = 'Liderança' or e.acesso_total))
          or l.vendedor_id = (select id from equipe where email = auth.jwt() ->> 'email' limit 1)
        )
    )
  );

notify pgrst, 'reload schema';
