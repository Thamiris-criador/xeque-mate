import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import ClientesPage from './components/ClientesPage.jsx'
import PlaceholderPage from './components/PlaceholderPage.jsx'
import './App.css'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  equipe: 'Equipe',
  cultura: 'Cultura',
  tarefas: 'Tarefas',
  clientes: 'Clientes',
  onboarding: 'Onboarding',
  financeiro: 'Financeiro',
  inadimplentes: 'Inadimplentes',
  aniversariantes: 'Aniversariantes',
  contemplados: 'Contemplados',
  relacionamento: 'Relacionamento',
}

export default function App() {
  const [page, setPage] = useState('clientes')

  return (
    <div className="app-shell">
      <Sidebar current={page} onNavigate={setPage} />
      <div className="app-main">
        <Header pageLabel={PAGE_TITLES[page]} />
        <div className="app-content">
          {page === 'clientes' ? (
            <ClientesPage />
          ) : (
            <PlaceholderPage title={PAGE_TITLES[page]} />
          )}
        </div>
      </div>
    </div>
  )
}
