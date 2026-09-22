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
import RelatorioSemanalPage from './components/RelatorioSemanalPage.jsx'
import PlaceholderPage from './components/PlaceholderPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import './App.css'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  equipe: 'Equipe',
  cultura: 'Cultura',
  tarefas: 'Tarefas',
  clientes: 'Clientes',
  'relatorio-semanal': 'Relatório semanal',
  financeiro: 'Financeiro',
  inadimplentes: 'Inadimplentes',
  aniversariantes: 'Aniversariantes',
  contemplados: 'Contemplados',
  reversao: 'Reversão',
  indicacoes: 'Indicações',
  configuracoes: 'Configurações',
}

export default function App() {
  const [page, setPage] = useState('clientes')
  const [session, setSession] = useState(undefined) // undefined = verificando, null = deslogado, obj = logado

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="app-loading">Carregando...</div>
  }

  if (session === null) {
    return <LoginPage />
  }

  return (
    <div className="app-shell">
      <Sidebar current={page} onNavigate={setPage} />
      <div className="app-main">
        <Header
          pageLabel={PAGE_TITLES[page]}
          userEmail={session.user.email}
          onLogout={() => supabase.auth.signOut()}
        />
        <div className="app-content">
          {page === 'clientes' ? (
            <ClientesPage />
          ) : page === 'dashboard' ? (
            <Dashboard />
          ) : page === 'equipe' ? (
            <EquipePage />
          ) : page === 'cultura' ? (
            <CulturaPage />
          ) : page === 'tarefas' ? (
            <TarefasPage />
          ) : page === 'reversao' ? (
            <ReversaoPage />
          ) : page === 'indicacoes' ? (
            <IndicacoesPage />
          ) : page === 'contemplados' ? (
            <ContempladosPage />
          ) : page === 'inadimplentes' ? (
            <InadimplentesPage />
          ) : page === 'relatorio-semanal' ? (
            <RelatorioSemanalPage />
          ) : (
            <PlaceholderPage title={PAGE_TITLES[page]} />
          )}
        </div>
      </div>
    </div>
  )
}
