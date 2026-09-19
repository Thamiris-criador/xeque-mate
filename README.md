# Xeque Mate — CRM de Pós-Vendas

Projeto novo e independente do `cs-manager`, mesma stack (React + Vite + Supabase).

## Setup

1. Instalar dependências:
   ```
   npm install
   ```

2. Criar um projeto novo em https://supabase.com (veja instruções no início da conversa).

3. Copiar `.env.example` para `.env.local` e preencher com a URL e a anon key do projeto Supabase:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_KEY=...
   ```

4. Rodar o script `supabase/schema.sql` no **SQL Editor** do dashboard do Supabase (cria as tabelas `equipe` e `clientes`).

5. Subir o projeto:
   ```
   npm run dev
   ```

## Estrutura

- `src/components/Sidebar.jsx` — menu lateral (Dashboard, Equipe, Cultura, Tarefas, Clientes, Onboarding, Financeiro, Inadimplentes, Aniversariantes, Contemplados, Relacionamento)
- `src/components/ClientesPage.jsx` — tela de Clientes (funcional: lista, filtros, cadastro/edição via Supabase)
- Demais páginas do menu estão como placeholder até serem construídas
