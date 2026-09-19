import { Search, LogOut } from 'lucide-react'
import './Header.css'

export default function Header({ pageLabel }) {
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
          <div className="header-account-name">XEQUE MATE CONSÓRCIOS</div>
          <div className="header-account-role">ACESSO TOTAL</div>
        </div>
        <div className="header-avatar">XM</div>
        <button className="header-logout" title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
