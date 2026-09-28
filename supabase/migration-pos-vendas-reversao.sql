-- Duas seções novas dentro da aba Tarefas já existente: "Acompanhamento Pós-Vendas"
-- e "Reversão / Cancelados e Comercial". Não cria tabela nova nem sistema de tarefas novo —
-- só acrescenta 2 colunas opcionais em "tarefas" (mesmo padrão já usado pra lead_id/categoria)
-- e reaproveita "reversoes"/"leads" que já existem.

alter table tarefas add column if not exists tipo_conteudo text;
alter table tarefas add column if not exists canal text;

alter table tarefas drop constraint if exists tarefas_tipo_conteudo_check;
alter table tarefas add constraint tarefas_tipo_conteudo_check
  check (tipo_conteudo is null or tipo_conteudo in (
    'resultado_assembleia', 'lembrete_pagamento', 'lance', 'contemplacao',
    'educacao', 'bastidores', 'relacionamento'
  ));

alter table tarefas drop constraint if exists tarefas_canal_check;
alter table tarefas add constraint tarefas_canal_check
  check (canal is null or canal in ('Texto', 'Vídeo', 'Áudio', 'Imagem'));

notify pgrst, 'reload schema';
