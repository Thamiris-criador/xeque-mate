import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus, Eye, FileText, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ClientModal from './ClientModal.jsx'
import './ClientesPage.css'
import './Dashboard.css'

const ETAPAS_CONTEMPLACAO = [
  { key: 'documentacao', label: 'Em documentação', icon: FileText, color: 'var(--orange)' },
  { key: 'carta_liberada', label: 'Carta liberada para uso', icon: KeyRound, color: 'var(--blue)' },
  { key: 'concluido', label: 'Processo concluído', icon: CheckCircle2, color: 'var(--green)' },
]

function StatTile({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-icon" style={{ color }}>
        <Icon size={18} />
      </div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  )
}

const TABS = [
  { key: 'todos', label: 'Todos os clientes', color: 'var(--blue)' },
  { key: 'em_dia', label: 'Em dia', color: 'var(--green)' },
  { key: 'contemplados', label: 'Contemplados', color: 'var(--purple)' },
  { key: 'inadimplentes', label: 'Inadimplentes', color: 'var(--red)' },
  { key: 'cancelados', label: 'Cancelados', color: 'var(--gray-chart)' },
]

const JORNADA_LABELS = {
  novo_pos_venda: 'Novo pós-venda',
  em_andamento: 'Em andamento',
  contemplado: 'Contemplado',
  finalizado: 'Finalizado',
}

const FINANCEIRO_LABELS = {
  em_dia: 'Em dia',
  inadimplente: 'Inadimplente',
  acordo: 'Acordo',
  cancelado: 'Cancelado',
  contemplado: 'Contemplado',
}

const FINANCEIRO_BADGE_CLASS = {
  em_dia: 'badge-green',
  inadimplente: 'badge-red',
  acordo: 'badge-orange',
  cancelado: 'badge-neutral',
  contemplado: 'badge-red',
}

function JornadaBadge({ value }) {
  return <span className="badge badge-neutral">{(JORNADA_LABELS[value] || value || '—').toUpperCase()}</span>
}

function EtapaContemplacaoStepper({ etapaAtual, onSelecionar }) {
  const indiceAtual = ETAPAS_CONTEMPLACAO.findIndex((e) => e.key === (etapaAtual || 'documentacao'))
  return (
    <div className="etapa-stepper">
      {ETAPAS_CONTEMPLACAO.map((e, i) => (
        <button
          key={e.key}
          type="button"
          className={`etapa-step${i <= indiceAtual ? ' done' : ''}${i === indiceAtual ? ' current' : ''}`}
          title={e.label}
          onClick={(ev) => {
            ev.stopPropagation()
            onSelecionar(e.key)
          }}
        >
          {e.label}
        </button>
      ))}
    </div>
  )
}

function FinanceiroBadge({ value }) {
  const cls = FINANCEIRO_BADGE_CLASS[value] || 'badge-neutral'
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
      .select('*, responsavel:equipe!responsavel_id(id, nome)')
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
      .select('id, nome, area')
      .order('nome')
      .then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const vendedores = useMemo(() => responsaveis.filter((r) => r.area === 'Comercial'), [responsaveis])
  const responsaveisPosVendas = useMemo(() => responsaveis.filter((r) => r.area === 'Pós-Vendas'), [responsaveis])

  const contagemEtapaContemplacao = useMemo(() => {
    const c = { documentacao: 0, carta_liberada: 0, concluido: 0 }
    for (const cliente of clientes) {
      if (cliente.jornada !== 'contemplado') continue
      const etapa = cliente.status_documentacao || 'documentacao'
      if (c[etapa] !== undefined) c[etapa] += 1
    }
    return c
  }, [clientes])

  const contagemPorTab = useMemo(() => ({
    todos: clientes.length,
    em_dia: clientes.filter((c) => c.financeiro_status === 'em_dia').length,
    contemplados: clientes.filter((c) => c.jornada === 'contemplado').length,
    inadimplentes: clientes.filter((c) => c.financeiro_status === 'inadimplente').length,
    cancelados: clientes.filter((c) => c.financeiro_status === 'cancelado').length,
  }), [clientes])

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (tab === 'em_dia' && c.financeiro_status !== 'em_dia') return false
      if (tab === 'contemplados' && c.jornada !== 'contemplado') return false
      if (tab === 'inadimplentes' && c.financeiro_status !== 'inadimplente') return false
      if (tab === 'cancelados' && c.financeiro_status !== 'cancelado') return false

      if (responsavelFiltro !== 'todos' && String(c.responsavel_id) !== responsavelFiltro) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const haystack = [c.nome, c.cpf, c.whatsapp, c.email, c.proposta, c.grupo, c.cota, c.modelo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [clientes, tab, responsavelFiltro, search])

  async function handleAtualizarEtapa(clienteId, novaEtapa) {
    const anterior = clientes
    setClientes((cs) => cs.map((c) => (c.id === clienteId ? { ...c, status_documentacao: novaEtapa } : c)))

    const { error: updateError } = await supabase
      .from('clientes')
      .update({ status_documentacao: novaEtapa })
      .eq('id', clienteId)

    if (updateError) {
      setClientes(anterior)
      setError(updateError.message)
    }
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleNew}>
            <Plus size={16} /> Cadastrar cliente
          </button>
        </div>
      </div>

      <div className="status-chips">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`status-chip${tab === t.key ? ' active' : ''}`}
            style={{ '--chip-color': t.color }}
            onClick={() => setTab(t.key)}
          >
            <span className="status-chip-dot" />
            {t.label}
            <span className="status-chip-count">{contagemPorTab[t.key]}</span>
          </button>
        ))}
      </div>

      {tab === 'contemplados' && (
        <>
          <p className="page-subtitle" style={{ marginBottom: 16 }}>
            A contemplação não encerra o relacionamento: acompanhe a documentação, a utilização da carta e a
            pós-contemplação.
          </p>
          <div className="stat-tiles-row" style={{ marginBottom: 16 }}>
            {ETAPAS_CONTEMPLACAO.map((e) => (
              <StatTile key={e.key} icon={e.icon} label={e.label} value={contagemEtapaContemplacao[e.key]} color={e.color} />
            ))}
          </div>
        </>
      )}

      <div className="filters-row">
        <input
          className="filter-search"
          placeholder="Nome, CPF, telefone, e-mail, proposta, grupo ou cota"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" value={tab} onChange={(e) => setTab(e.target.value)}>
          {TABS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
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
        </div>

        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">Nenhum cliente encontrado.</div>
        ) : (
          filtered.map((c) => (
            <div className="clients-table-row" key={c.id}>
              <div className="client-cell">
                <div className="client-name-row">
                  <div className="client-name" title={c.nome}>
                    {c.nome}
                  </div>
                  <button className="client-view-btn" title="Ver cliente" onClick={() => handleEdit(c)}>
                    <Eye size={15} />
                  </button>
                </div>
                <div className="client-phone">{c.whatsapp || '—'}</div>
              </div>
              <div>
                {c.grupo || '—'} / {c.cota || '—'}
              </div>
              <div>{c.responsavel?.nome || '—'}</div>
              <div>
                {c.jornada === 'contemplado' ? (
                  <EtapaContemplacaoStepper
                    etapaAtual={c.status_documentacao}
                    onSelecionar={(etapa) => handleAtualizarEtapa(c.id, etapa)}
                  />
                ) : (
                  <JornadaBadge value={c.jornada} />
                )}
              </div>
              <div>
                <FinanceiroBadge value={c.financeiro_status} />
              </div>
              <div>
                <ProximaAcaoBadge value={c.proxima_acao} />
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editingClient}
          responsaveisPosVendas={responsaveisPosVendas}
          vendedores={vendedores}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            loadData()
          }}
          onDeleted={() => {
            setModalOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
