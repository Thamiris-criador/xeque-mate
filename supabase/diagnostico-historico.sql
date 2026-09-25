-- 1. A tabela existe e tem as colunas certas?
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'historico'
order by ordinal_position;

-- 2. As políticas de RLS existem?
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'historico';

-- 3. Chegou alguma linha nova pra esse cliente?
select * from historico
where cliente_id = (select id from clientes where nome = 'Abner Pierre Reis' limit 1)
order by created_at desc;
