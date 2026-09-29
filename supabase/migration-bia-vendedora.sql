-- Bia passa a aparecer também como vendedora selecionável no campo "Vendedor"
-- do cadastro de clientes (além do papel de Liderança que já tinha).

alter table equipe add column if not exists vende boolean not null default false;

update equipe set vende = true where nome = 'Bia';

notify pgrst, 'reload schema';
