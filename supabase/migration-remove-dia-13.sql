-- Reverte a opção de vencimento dia 13 (mantém 10, 15, 20, 21).
-- Clientes que estejam com dia_vencimento = 13 ficam sem dia definido (null),
-- pra não travar a constraint — ajuste manualmente se algum cliente precisar
-- de um dos dias válidos.

update clientes set dia_vencimento = null where dia_vencimento = 13;

alter table clientes drop constraint if exists clientes_dia_vencimento_check;
alter table clientes add constraint clientes_dia_vencimento_check
  check (dia_vencimento in (10, 15, 20, 21));

notify pgrst, 'reload schema';
