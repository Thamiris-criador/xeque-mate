import { useEffect, useRef, useState } from 'react'
import { Search, LogOut, Bell, MessageSquare, ChevronDown, ImagePlus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './Header.css'

export default function Header({ pageLabel, userEmail, onLogout }) {
  const [membro, setMembro] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !membro) return

    setUploading(true)
    const extensao = file.name.split('.').pop()
    const caminho = `${membro.id}-${Date.now()}.${extensao}`

    const { error: uploadError } = await supabase.storage.from('equipe-fotos').upload(caminho, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('equipe-fotos').getPublicUrl(caminho)
      await supabase.from('equipe').update({ foto_url: data.publicUrl }).eq('id', membro.id)
      setMembro((m) => ({ ...m, foto_url: data.publicUrl }))
    }

    setUploading(false)
    setMenuOpen(false)
  }

  const initials = (userEmail || 'XM').split('@')[0].slice(0, 2).toUpperCase()

  return (
    <header className="header">
      <div className="header-breadcrumb">PÓS-VENDAS | XEQUE MATE</div>

      <div className="header-search">
        <Search size={16} />
        <input placeholder="Nome, WhatsApp, proposta, grupo, cota, modelo" />
      </div>

      <div className="header-account">
        <button className="header-icon-btn" title="Notificações">
          <Bell size={18} />
        </button>
        <button className="header-icon-btn" title="Mensagens">
          <MessageSquare size={18} />
        </button>

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
              <label className="header-dropdown-item">
                <ImagePlus size={15} />
                {uploading ? 'Enviando...' : 'Trocar foto'}
                <input type="file" accept="image/*" hidden onChange={handleFotoChange} disabled={!membro || uploading} />
              </label>
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
