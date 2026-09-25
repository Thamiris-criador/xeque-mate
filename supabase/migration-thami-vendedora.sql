-- Thamiris passa a aparecer também como vendedora (além do papel de Pós-Vendas que já tinha).

alter table equipe add column if not exists vende boolean not null default false;

update equipe set vende = true where email = 'thamiris.abreu@xequemate.com.br';

notify pgrst, 'reload schema';
