import { Search, LogOut } from 'lucide-react'
import './Header.css'

export default function Header({ pageLabel, userEmail, onLogout }) {
  const initials = (userEmail || 'XM')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="header">
      <div className="header-breadcrumb">
        PÓS-VENDAS | XEQUE MATE
      </div>

      <div className="header-search">
        <Search size={16} />
        <input placeholder="Nome, WhatsApp, proposta, grupo, cota, modelo" />
      </div>

      <div className="header-account">
        <div className="header-account-info">
          <div className="header-account-name">{userEmail}</div>
          <div className="header-account-role">ACESSO TOTAL</div>
        </div>
        <div className="header-avatar">{initials}</div>
        <button className="header-logout" title="Sair" onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
