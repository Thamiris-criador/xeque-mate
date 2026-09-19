import {
  LayoutDashboard,
  Users,
  Sparkles,
  ListChecks,
  UsersRound,
  Rocket,
  Wallet,
  AlertTriangle,
  Cake,
  Trophy,
  Heart,
} from 'lucide-react'
import './Sidebar.css'

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'equipe', label: 'Equipe', icon: Users },
  { key: 'cultura', label: 'Cultura', icon: Sparkles },
  { key: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { key: 'clientes', label: 'Clientes', icon: UsersRound },
  { key: 'onboarding', label: 'Onboarding', icon: Rocket },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet },
  { key: 'inadimplentes', label: 'Inadimplentes', icon: AlertTriangle },
  { key: 'aniversariantes', label: 'Aniversariantes', icon: Cake },
  { key: 'contemplados', label: 'Contemplados', icon: Trophy },
  { key: 'relacionamento', label: 'Relacionamento', icon: Heart },
]

export default function Sidebar({ current, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">XEQUE MATE</div>
        <div className="sidebar-brand-sub">— CONSÓRCIOS</div>
      </div>

      <nav className="sidebar-nav">
        {MENU.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`sidebar-item${current === key ? ' active' : ''}`}
            onClick={() => onNavigate(key)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-quote">
        “Da vontade à conquista, sem promessas vazias.”
      </div>
    </aside>
  )
}
