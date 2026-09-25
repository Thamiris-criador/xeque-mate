import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Sparkles,
  ListChecks,
  UsersRound,
  Wallet,
  Cake,
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import './Sidebar.css'

const CLIENTES_CHILDREN = [
  { key: 'clientes', label: 'Todos os clientes' },
  { key: 'reversao', label: 'Reversão' },
  { key: 'indicacoes', label: 'Indicações' },
]

const PLAYBOOK_CHILDREN = [
  { key: 'playbook-comercial', label: 'Comercial' },
  { key: 'playbook-pos-vendas', label: 'Pós-Vendas' },
  { key: 'playbook-financeiro', label: 'Financeiro' },
]

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'equipe', label: 'Equipe', icon: Users },
  { key: 'cultura', label: 'Cultura', icon: Sparkles },
  { key: 'clientes-group', label: 'Clientes', icon: UsersRound, children: CLIENTES_CHILDREN, defaultKey: 'clientes' },
  { key: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { key: 'comercial', label: 'Comercial', icon: Briefcase },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet },
  { key: 'aniversariantes', label: 'Aniversariantes', icon: Cake },
  { key: 'playbook-group', label: 'Playbook', icon: BookOpen, children: PLAYBOOK_CHILDREN, defaultKey: 'playbook-comercial' },
]

export default function Sidebar({ current, onNavigate, apenasComercial, ocultarComercial }) {
  const menu = useMemo(() => {
    if (apenasComercial) {
      return MENU
        .filter((item) => ['equipe', 'cultura', 'comercial', 'playbook-group'].includes(item.key))
        .map((item) => (item.key === 'playbook-group'
          ? { ...item, children: item.children.filter((c) => c.key === 'playbook-comercial') }
          : item))
    }
    if (ocultarComercial) return MENU.filter((item) => item.key !== 'comercial')
    return MENU
  }, [apenasComercial, ocultarComercial])

  const [abertos, setAbertos] = useState(() => {
    const init = {}
    for (const item of MENU) {
      if (item.children) init[item.key] = item.children.some((c) => c.key === current)
    }
    return init
  })

  useEffect(() => {
    for (const item of MENU) {
      if (item.children && item.children.some((c) => c.key === current)) {
        setAbertos((a) => ({ ...a, [item.key]: true }))
      }
    }
  }, [current])

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">XEQUE MATE</div>
        <div className="sidebar-brand-sub">— CONSÓRCIOS</div>
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
          const Icon = item.icon

          if (item.children) {
            const filhoAtivo = item.children.some((c) => c.key === current)
            const aberto = Boolean(abertos[item.key])
            return (
              <div key={item.key}>
                <button
                  className={`sidebar-item${filhoAtivo ? ' active' : ''}`}
                  onClick={() => {
                    setAbertos((a) => ({ ...a, [item.key]: !a[item.key] }))
                    onNavigate(item.defaultKey)
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {aberto ? (
                    <ChevronDown size={14} className="sidebar-chevron" />
                  ) : (
                    <ChevronRight size={14} className="sidebar-chevron" />
                  )}
                </button>
                {aberto && (
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
