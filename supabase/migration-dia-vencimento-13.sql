alter table clientes drop constraint if exists clientes_dia_vencimento_check;
alter table clientes add constraint clientes_dia_vencimento_check
  check (dia_vencimento in (10, 13, 15, 20, 21));

notify pgrst, 'reload schema';
