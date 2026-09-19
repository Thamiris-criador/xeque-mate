import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus, MessageCircle, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ClientModal from './ClientModal.jsx'
import './ClientesPage.css'

const TABS = [
  { key: 'todos', label: 'Todos os clientes' },
  { key: 'contemplados', label: 'Contemplados' },
  { key: 'inadimplentes', label: 'Inadimplentes' },
]

const JORNADA_LABELS = {
  novo_pos_venda: 'Novo pós-venda',
  em_andamento: 'Em andamento',
  contemplado: 'Contemplado',
  finalizado: 'Finalizado',
}

const FINANCEIRO_LABELS = {
  em_dia: 'Em dia',
  atrasado: 'Atrasado',
  inadimplente: 'Inadimplente',
}

function JornadaBadge({ value }) {
  return <span className="badge badge-neutral">{(JORNADA_LABELS[value] || value || '—').toUpperCase()}</span>
}

function FinanceiroBadge({ value }) {
  const cls = value === 'em_dia' ? 'badge-green' : 'badge-red'
  return <span className={`badge ${cls}`}>{(FINANCEIRO_LABELS[value] || value || '—').toUpperCase()}</span>
}

function ProximaAcaoBadge({ value }) {
  if (!value) return <span className="badge badge-orange">SEM PRÓXIMA AÇÃO</span>
  return <span className="proxima-acao-text">{value}</span>
}

export default function ClientesPage() {
  const [tab, setTab] = useState('todos')
  const [search, setSearch] = useState('')
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos')
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('clientes')
      .select('*, responsavel:equipe(id, nome)')
      .order('nome', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setClientes([])
    } else {
      setClientes(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    supabase
      .from('equipe')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (tab === 'contemplados' && c.jornada !== 'contemplado') return false
      if (tab === 'inadimplentes' && c.financeiro_status !== 'inadimplente') return false

      if (responsavelFiltro !== 'todos' && String(c.responsavel_id) !== responsavelFiltro) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const haystack = [c.nome, c.whatsapp, c.proposta, c.grupo, c.cota, c.modelo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [clientes, tab, responsavelFiltro, search])

  function openWhatsapp(numero) {
    if (!numero) return
    const digits = numero.replace(/\D/g, '')
    window.open(`https://wa.me/55${digits}`, '_blank')
  }

  function handleEdit(client) {
    setEditingClient(client)
    setModalOpen(true)
  }

  function handleNew() {
    setEditingClient(null)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CLIENTES</h1>
          <p className="page-subtitle">
            Base única. Inadimplência, onboarding, contemplação e aniversários são visões geradas a partir deste cadastro.
          </p>
        </div>
        <button className="btn-primary" onClick={handleNew}>
          <Plus size={16} /> Cadastrar cliente
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input
          className="filter-search"
          placeholder="Nome, WhatsApp, proposta, grupo, cota ou modelo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" disabled>
          <option>Todos os clientes</option>
        </select>
        <select
          className="filter-select"
          value={responsavelFiltro}
          onChange={(e) => setResponsavelFiltro(e.target.value)}
        >
          <option value="todos">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="results-count">{filtered.length} CLIENTE(S)</div>

      {error && <div className="error-box">Erro ao carregar clientes: {error}</div>}

      <div className="clients-table">
        <div className="clients-table-head">
          <span>CLIENTE</span>
          <span>GRUPO/COTA</span>
          <span>RESPONSÁVEL</span>
          <span>JORNADA</span>
          <span>FINANCEIRO</span>
          <span>PRÓXIMA AÇÃO</span>
          <span></span>
        </div>

        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">Nenhum cliente encontrado.</div>
        ) : (
          filtered.map((c) => (
            <div className="clients-table-row" key={c.id}>
              <div className="client-cell">
                <div className="client-name">{c.nome}</div>
                <div className="client-phone">{c.whatsapp || '—'}</div>
              </div>
              <div>
                {c.grupo || '—'} / {c.cota || '—'}
              </div>
              <div>{c.responsavel?.nome || '—'}</div>
              <div>
                <JornadaBadge value={c.jornada} />
              </div>
              <div>
                <FinanceiroBadge value={c.financeiro_status} />
              </div>
              <div>
                <ProximaAcaoBadge value={c.proxima_acao} />
              </div>
              <div className="row-actions">
                <button title="WhatsApp" onClick={() => openWhatsapp(c.whatsapp)}>
                  <MessageCircle size={16} />
                </button>
                <button title="Editar" onClick={() => handleEdit(c)}>
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editingClient}
          responsaveis={responsaveis}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
