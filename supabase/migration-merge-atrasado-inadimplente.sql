-- Unifica "atrasado" em "inadimplente" (mesmo grupo de clientes, sem distinção de negócio).
-- Rode no SQL Editor do Supabase.

update clientes set financeiro_status = 'inadimplente' where financeiro_status = 'atrasado';

alter table clientes drop constraint if exists clientes_financeiro_status_check;
alter table clientes add constraint clientes_financeiro_status_check
  check (financeiro_status in ('em_dia', 'inadimplente', 'acordo', 'cancelado', 'contemplado'));

notify pgrst, 'reload schema';
