import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Sparkles,
  ListChecks,
  UsersRound,
  FileBarChart,
  Wallet,
  Cake,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import './Sidebar.css'

const CLIENTES_CHILDREN = [
  { key: 'clientes', label: 'Todos os clientes' },
  { key: 'contemplados', label: 'Contemplados' },
  { key: 'inadimplentes', label: 'Inadimplentes' },
  { key: 'reversao', label: 'Reversão' },
  { key: 'indicacoes', label: 'Indicações' },
]

const CLIENTES_KEYS = CLIENTES_CHILDREN.map((c) => c.key)

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'equipe', label: 'Equipe', icon: Users },
  { key: 'cultura', label: 'Cultura', icon: Sparkles },
  { key: 'clientes-group', label: 'Clientes', icon: UsersRound, children: CLIENTES_CHILDREN },
  { key: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet },
  { key: 'aniversariantes', label: 'Aniversariantes', icon: Cake },
  { key: 'relatorio-semanal', label: 'Relatório semanal', icon: FileBarChart },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ current, onNavigate }) {
  const [clientesAberto, setClientesAberto] = useState(CLIENTES_KEYS.includes(current))

  useEffect(() => {
    if (CLIENTES_KEYS.includes(current)) setClientesAberto(true)
  }, [current])

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">XEQUE MATE</div>
        <div className="sidebar-brand-sub">— CONSÓRCIOS</div>
      </div>

      <nav className="sidebar-nav">
        {MENU.map((item) => {
          const Icon = item.icon

          if (item.children) {
            const filhoAtivo = CLIENTES_KEYS.includes(current)
            return (
              <div key={item.key}>
                <button
                  className={`sidebar-item${filhoAtivo ? ' active' : ''}`}
                  onClick={() => {
                    setClientesAberto((v) => !v)
                    onNavigate('clientes')
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {clientesAberto ? (
                    <ChevronDown size={14} className="sidebar-chevron" />
                  ) : (
                    <ChevronRight size={14} className="sidebar-chevron" />
                  )}
                </button>
                {clientesAberto && (
                  <div className="sidebar-submenu">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        className={`sidebar-subitem${current === child.key ? ' active' : ''}`}
                        onClick={() => onNavigate(child.key)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={item.key}
              className={`sidebar-item${current === item.key ? ' active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-quote">
        “Da vontade à conquista, sem promessas vazias.”
      </div>
    </aside>
  )
}
