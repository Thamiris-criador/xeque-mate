import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import ClientesPage from './components/ClientesPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import EquipePage from './components/EquipePage.jsx'
import CulturaPage from './components/CulturaPage.jsx'
import TarefasPage from './components/TarefasPage.jsx'
import ReversaoPage from './components/ReversaoPage.jsx'
import IndicacoesPage from './components/IndicacoesPage.jsx'
import ContempladosPage from './components/ContempladosPage.jsx'
import InadimplentesPage from './components/InadimplentesPage.jsx'
import FinanceiroPage from './components/FinanceiroPage.jsx'
import AniversariantesPage from './components/AniversariantesPage.jsx'
import ComercialPage from './components/ComercialPage.jsx'
import PlaybookPage from './components/PlaybookPage.jsx'
import PlaceholderPage from './components/PlaceholderPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import './App.css'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  equipe: 'Equipe',
  cultura: 'Cultura',
  tarefas: 'Tarefas',
  'tarefas-boletos': 'Boletos',
  comercial: 'Comercial',
  clientes: 'Clientes',
  financeiro: 'Financeiro',
  inadimplentes: 'Inadimplentes',
  aniversariantes: 'Aniversariantes',
  'playbook-comercial': 'Playbook — Comercial',
  'playbook-pos-vendas': 'Playbook — Pós-Vendas',
  'playbook-financeiro': 'Playbook — Financeiro',
  contemplados: 'Contemplados',
  reversao: 'Reversão',
  indicacoes: 'Indicações',
  configuracoes: 'Configurações',
}

const PAGINAS_VENDEDORA = ['comercial', 'playbook-comercial', 'equipe', 'cultura']

export default function App() {
  const [page, setPage] = useState('clientes')
  const [session, setSession] = useState(undefined) // undefined = verificando, null = deslogado, obj = logado
  const [membro, setMembro] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user?.email) return
    supabase.from('equipe').select('*').eq('email', session.user.email).maybeSingle().then(({ data }) => setMembro(data))
  }, [session])

  const isAdmin = !membro || membro.acesso_total || membro.area === 'Liderança'
  const isVendedora = !isAdmin && (membro.area === 'Comercial' || membro.vende)

  useEffect(() => {
    if (!membro) return
    if (isVendedora && !PAGINAS_VENDEDORA.includes(page)) setPage('comercial')
    if (!isVendedora && !isAdmin && page === 'comercial') setPage('clientes')
  }, [membro, isVendedora, isAdmin, page])

  if (session === undefined) {
    return <div className="app-loading">Carregando...</div>
  }

  if (session === null) {
    return <LoginPage />
  }

  const paginaLiberada = isAdmin || (isVendedora ? PAGINAS_VENDEDORA.includes(page) : page !== 'comercial')

  return (
    <div className="app-shell">
      <Sidebar
        current={page}
        onNavigate={setPage}
        apenasComercial={isVendedora}
        ocultarComercial={!isAdmin && !isVendedora}
      />
      <div className="app-main">
        <Header
          pageLabel={PAGE_TITLES[page]}
          userEmail={session.user.email}
          onLogout={() => supabase.auth.signOut()}
        />
        <div className="app-content">
          {!paginaLiberada ? (
            <PlaceholderPage title="Acesso restrito" subtitle="Você não tem permissão para acessar esta área." />
          ) : page === 'clientes' ? (
            <ClientesPage isAdmin={isAdmin} />
          ) : page === 'dashboard' ? (
            <Dashboard />
          ) : page === 'equipe' ? (
            <EquipePage />
          ) : page === 'cultura' ? (
            <CulturaPage />
          ) : page === 'tarefas' ? (
            <TarefasPage />
          ) : page === 'tarefas-boletos' ? (
            <TarefasPage categoriaFixa="Boleto" />
          ) : page === 'comercial' ? (
            <ComercialPage />
          ) : page === 'reversao' ? (
            <ReversaoPage />
          ) : page === 'indicacoes' ? (
            <IndicacoesPage />
          ) : page === 'contemplados' ? (
            <ContempladosPage isAdmin={isAdmin} />
          ) : page === 'inadimplentes' ? (
            <InadimplentesPage isAdmin={isAdmin} />
          ) : page === 'financeiro' ? (
            <FinanceiroPage />
          ) : page === 'aniversariantes' ? (
            <AniversariantesPage isAdmin={isAdmin} />
          ) : page === 'playbook-comercial' ? (
            <PlaybookPage area="Comercial" />
          ) : page === 'playbook-pos-vendas' ? (
            <PlaybookPage area="Pós-Vendas" />
          ) : page === 'playbook-financeiro' ? (
            <PlaybookPage area="Financeiro" />
          ) : (
            <PlaceholderPage title={PAGE_TITLES[page]} />
          )}
        </div>
      </div>
    </div>
  )
}
