-- Fase F: auditoria automática de alterações importantes
-- Rode no SQL Editor do Supabase, depois das migrações A, B, C e D.

create or replace function trg_cliente_auditoria()
returns trigger as $$
declare
  v_usuario text := coalesce(auth.email(), 'sistema');
begin
  if new.financeiro_status is distinct from old.financeiro_status then
    insert into historico (cliente_id, tipo, descricao, campo, valor_anterior, valor_novo, usuario)
    values (new.id, 'auditoria',
      v_usuario || ' alterou status financeiro de "' || old.financeiro_status || '" para "' || new.financeiro_status || '"',
      'financeiro_status', old.financeiro_status, new.financeiro_status, v_usuario);
  end if;

  if new.jornada is distinct from old.jornada then
    insert into historico (cliente_id, tipo, descricao, campo, valor_anterior, valor_novo, usuario)
    values (new.id, 'auditoria',
      v_usuario || ' alterou jornada de "' || old.jornada || '" para "' || new.jornada || '"',
      'jornada', old.jornada, new.jornada, v_usuario);
  end if;

  if new.acompanhamento_status is distinct from old.acompanhamento_status then
    insert into historico (cliente_id, tipo, descricao, campo, valor_anterior, valor_novo, usuario)
    values (new.id, 'auditoria',
      v_usuario || ' alterou status de acompanhamento de "' || coalesce(old.acompanhamento_status, '—') || '" para "' || coalesce(new.acompanhamento_status, '—') || '"',
      'acompanhamento_status', old.acompanhamento_status, new.acompanhamento_status, v_usuario);
  end if;

  if new.responsavel_id is distinct from old.responsavel_id then
    insert into historico (cliente_id, tipo, descricao, campo, valor_anterior, valor_novo, usuario)
    values (new.id, 'auditoria', v_usuario || ' alterou o responsável pelo pós-vendas',
      'responsavel_id', old.responsavel_id::text, new.responsavel_id::text, v_usuario);
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clientes_after_update_auditoria on clientes;
create trigger trg_clientes_after_update_auditoria
  after update on clientes
  for each row execute function trg_cliente_auditoria();
