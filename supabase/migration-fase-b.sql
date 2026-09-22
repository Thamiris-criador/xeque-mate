-- Fase B: complemento de campos para o perfil completo do cliente
-- Script ADITIVO — rode no SQL Editor do Supabase, depois de já ter rodado migration-fase-a.sql.

alter table clientes
  add column if not exists plano text,
  add column if not exists obs_comerciais text,
  add column if not exists obs_acompanhamento text;
