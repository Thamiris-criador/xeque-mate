import { useEffect, useRef, useState } from 'react'
import { Search, LogOut, ChevronDown, User } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './Header.css'

export default function Header({ pageLabel, userEmail, onLogout, onNavigate, podeBuscarClientes }) {
  const [membro, setMembro] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [resultadosAbertos, setResultadosAbertos] = useState(false)
  const buscaRef = useRef(null)

  useEffect(() => {
    if (!userEmail) return
    supabase.from('equipe').select('*').eq('email', userEmail).maybeSingle().then(({ data }) => setMembro(data))
  }, [userEmail])

  useEffect(() => {
    function handleClickFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (buscaRef.current && !buscaRef.current.contains(e.target)) setResultadosAbertos(false)
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  useEffect(() => {
    if (!podeBuscarClientes || !query.trim()) {
      setResultados([])
      return
    }
    const termo = query.trim().replace(/[,()%*]/g, '')
    if (!termo) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const timer = setTimeout(() => {
      supabase
        .from('clientes')
        .select('id, nome, whatsapp, proposta, grupo, cota, modelo')
        .or(
          ['nome', 'whatsapp', 'proposta', 'grupo', 'cota', 'modelo']
            .map((campo) => `${campo}.ilike.%${termo}%`)
            .join(',')
        )
        .limit(8)
        .then(({ data }) => {
          setResultados(data || [])
          setBuscando(false)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, podeBuscarClientes])

  function handleSelecionar(cliente) {
    setQuery('')
    setResultados([])
    setResultadosAbertos(false)
    onNavigate?.('clientes', { clienteId: cliente.id })
  }

  const initials = (userEmail || 'XM').split('@')[0].slice(0, 2).toUpperCase()
  const areaLabel = membro?.area ? membro.area.toUpperCase() : null

  return (
    <header className="header">
      {areaLabel && <div className="header-breadcrumb">{areaLabel}</div>}

      {podeBuscarClientes && (
        <div className="header-search" ref={buscaRef}>
          <Search size={16} />
          <input
            placeholder="Nome, WhatsApp, proposta, grupo, cota, modelo"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setResultadosAbertos(true) }}
            onFocus={() => setResultadosAbertos(true)}
          />
          {resultadosAbertos && query.trim() && (
            <div className="header-search-resultados">
              {buscando ? (
                <div className="header-search-vazio">Buscando...</div>
              ) : resultados.length === 0 ? (
                <div className="header-search-vazio">Nenhum cliente encontrado.</div>
              ) : (
                resultados.map((c) => (
                  <button type="button" className="header-search-item" key={c.id} onClick={() => handleSelecionar(c)}>
                    <User size={13} />
                    <span className="header-search-item-nome">{c.nome}</span>
                    <span className="header-search-item-info">
                      {[c.grupo && `Grupo ${c.grupo}`, c.cota && `Cota ${c.cota}`, c.modelo].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

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
