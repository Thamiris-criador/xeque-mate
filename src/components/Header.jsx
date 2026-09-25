import { useEffect, useRef, useState } from 'react'
import { Search, LogOut, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './Header.css'

export default function Header({ pageLabel, userEmail, onLogout }) {
  const [membro, setMembro] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!userEmail) return
    supabase.from('equipe').select('*').eq('email', userEmail).maybeSingle().then(({ data }) => setMembro(data))
  }, [userEmail])

  useEffect(() => {
    function handleClickFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const initials = (userEmail || 'XM').split('@')[0].slice(0, 2).toUpperCase()
  const areaLabel = membro?.area ? membro.area.toUpperCase() : null

  return (
    <header className="header">
      {areaLabel && <div className="header-breadcrumb">{areaLabel}</div>}

      <div className="header-search">
        <Search size={16} />
        <input placeholder="Nome, WhatsApp, proposta, grupo, cota, modelo" />
      </div>

      <div className="header-account">
        <div className="header-account-menu" ref={menuRef}>
          <button type="button" className="header-account-trigger" onClick={() => setMenuOpen((v) => !v)}>
            <div className="header-avatar">
              {membro?.foto_url ? <img src={membro.foto_url} alt="" /> : initials}
            </div>
            <div className="header-account-info">
              <div className="header-account-name">{membro?.nome || userEmail}</div>
              <div className="header-account-role">{membro?.cargo || 'Acesso total'}</div>
            </div>
            <ChevronDown size={14} className={`header-chevron${menuOpen ? ' open' : ''}`} />
          </button>

          {menuOpen && (
            <div className="header-dropdown">
              <button type="button" className="header-dropdown-item" onClick={onLogout}>
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
