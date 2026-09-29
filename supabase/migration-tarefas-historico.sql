-- Histórico automático de tarefas: toda vez que o status muda, guarda
-- data/hora, quem mudou e a observação daquele momento — pra dar pra
-- ver quando alguém começou a fazer, se atrasou e o porquê.

alter table tarefas
  add column if not exists historico_status jsonb not null default '[]'::jsonb;

create or replace function registrar_historico_tarefa()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.historico_status := coalesce(old.historico_status, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'de', old.status,
        'para', new.status,
        'em', now(),
        'usuario', coalesce(auth.jwt() ->> 'email', 'sistema'),
        'observacao', new.observacao
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_historico_tarefa on tarefas;
create trigger trg_historico_tarefa
  before update on tarefas
  for each row
  execute function registrar_historico_tarefa();

notify pgrst, 'reload schema';
