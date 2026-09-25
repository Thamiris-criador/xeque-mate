import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Plus, Users2, FileText, Handshake, Clock, TrendingUp, Pause, XCircle,
  Phone, MessageCircle, MoreVertical,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import LeadModal from './LeadModal.jsx'
import {
  LEAD_STATUS_LABELS, LEAD_STATUS_BADGE_CLASS, LEAD_TEMPERATURA_LABELS, LEAD_TEMPERATURA_COLOR,
  dentroDoPeriodo, formatarData,
} from '../lib/negocio.js'
import './ClientesPage.css'
import './Dashboard.css'
import './ComercialPage.css'

function KpiCard({ icon: Icon, value, label, hint, tom }) {
  return (
    <div className={`kpi-card tint-${tom}`}>
      <div className={`kpi-card-icon tint-${tom}`}>
        <Icon size={19} />
      </div>
      <div>
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
        {hint && <div className="kpi-card-hint">{hint}</div>}
      </div>
    </div>
  )
}

function formatarProximoContato(dataStr) {
  if (!dataStr) return { texto: '—', atrasado: false }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const data = new Date(dataStr + 'T00:00:00')
  const diffDias = Math.round((data - hoje) / 86400000)

  if (diffDias === 0) return { texto: 'Hoje', atrasado: false }
  if (diffDias === 1) return { texto: 'Amanhã', atrasado: false }
  if (diffDias < 0) return { texto: formatarData(dataStr), atrasado: true }
  return { texto: formatarData(dataStr), atrasado: false }
}

export default function ComercialPage() {
  const [leads, setLeads] = useState([])
  const [equipe, setEquipe] = useState([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [mostrarTodasAcoes, setMostrarTodasAcoes] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [temperaturaFiltro, setTemperaturaFiltro] = useState('todas')
  const [proximoContatoFiltro, setProximoContatoFiltro] = useState('todos')
  const [entradaFiltro, setEntradaFiltro] = useState('todos')
  const [vendedoraFiltro, setVendedoraFiltro] = useState('todas')

  const mesesEntrada = useMemo(() => {
    const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const agora = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { valor, label: `${nomes[d.getMonth()]} de ${d.getFullYear()}` }
    })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('leads')
      .select('*, vendedor:equipe!vendedor_id(id, nome)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLeads([])
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    supabase.from('equipe').select('id, nome, area, email, vende').order('nome').then(({ data }) => setEquipe(data || []))
    supabase.auth.getSession().then(({ data }) => setUserEmail(data?.session?.user?.email || ''))
  }, [loadData])

  const vendedores = useMemo(() => equipe.filter((e) => e.area === 'Comercial' || e.vende), [equipe])
  const responsaveisPosVendas = useMemo(() => equipe.filter((e) => e.area === 'Pós-Vendas'), [equipe])
  const souGestao = useMemo(() => {
    const eu = equipe.find((e) => e.email === userEmail)
    return !eu || eu.area === 'Liderança'
  }, [equipe, userEmail])

  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const ativos = leads.filter((l) => !l.convertido && !['perdido', 'sem_interesse', 'adiado'].includes(l.status))
    const propostas = leads.filter((l) => l.status === 'proposta_enviada').length
    const negociacao = leads.filter((l) => l.status === 'em_negociacao').length
    const followUps = leads.filter((l) => !l.convertido && l.proximo_contato && l.proximo_contato <= hoje).length
    const vendas = leads.filter((l) => l.convertido).length
    const adiados = leads.filter((l) => l.status === 'adiado').length
    const perdidos = leads.filter((l) => l.status === 'perdido').length
    return { ativos: ativos.length, propostas, negociacao, followUps, vendas, adiados, perdidos }
  }, [leads])

  const filtrados = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    return leads.filter((l) => {
      if (souGestao && vendedoraFiltro !== 'todas' && String(l.vendedor_id) !== vendedoraFiltro) return false
      if (statusFiltro !== 'todos' && l.status !== statusFiltro) return false
      if (temperaturaFiltro !== 'todas' && l.temperatura !== temperaturaFiltro) return false
      if ((entradaFiltro === 'hoje' || entradaFiltro === 'semana') && !dentroDoPeriodo(l.data_entrada, entradaFiltro)) return false
      if (/^\d{4}-\d{2}$/.test(entradaFiltro) && l.data_entrada?.slice(0, 7) !== entradaFiltro) return false

      if (proximoContatoFiltro === 'hoje' && l.proximo_contato !== hoje) return false
      if (proximoContatoFiltro === 'amanha' && l.proximo_contato !== amanha) return false
      if (proximoContatoFiltro === 'atrasados' && !(l.proximo_contato && l.proximo_contato < hoje)) return false
      if (proximoContatoFiltro === 'sem_data' && l.proximo_contato) return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const haystack = [l.nome, l.whatsapp, l.cpf, l.modelo_interesse].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [leads, souGestao, vendedoraFiltro, statusFiltro, temperaturaFiltro, proximoContatoFiltro, entradaFiltro, search])

  const proximasAcoes = useMemo(() => {
    return leads
      .filter((l) => !l.convertido && l.proximo_contato)
      .sort((a, b) => a.proximo_contato.localeCompare(b.proximo_contato))
      .slice(0, mostrarTodasAcoes ? 30 : 6)
  }, [leads, mostrarTodasAcoes])

  function handleNovo() {
    setEditing(null)
    setModalOpen(true)
  }

  function handleEdit(lead) {
    setEditing(lead)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">COMERCIAL</h1>
          <p className="page-subtitle" style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            Do primeiro contato ao próximo passo.
          </p>
          <p className="page-subtitle">
            Acompanhe seus leads, organize suas negociações e não perca nenhuma oportunidade de venda.
            {!souGestao && ' Você vê apenas os leads da sua própria carteira.'}
          </p>
        </div>
        <button className="btn-primary" onClick={handleNovo}>
          <Plus size={16} /> Novo lead
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard tom="green" icon={Users2} value={kpis.ativos} label="Leads ativos" hint="Oportunidades em andamento" />
        <KpiCard tom="orange" icon={FileText} value={kpis.propostas} label="Propostas enviadas" hint="Aguardando retorno" />
        <KpiCard tom="red" icon={Handshake} value={kpis.negociacao} label="Em negociação" hint="Oportunidades em avanço" />
        <KpiCard tom="orange" icon={Clock} value={kpis.followUps} label="Follow-ups pendentes" hint="Ações para hoje e atrasadas" />
        <KpiCard tom="green" icon={TrendingUp} value={kpis.vendas} label="Vendas (convertidos)" hint="Viraram cliente" />
        <KpiCard tom="gray" icon={Pause} value={kpis.adiados} label="Adiados" hint="Retorno programado" />
        <KpiCard tom="red" icon={XCircle} value={kpis.perdidos} label="Perdidos" hint="Oportunidades encerradas" />
      </div>

      <div className="comercial-layout">
        <div>
          <div className="filters-row">
            <input
              className="filter-search"
              placeholder="Nome, telefone, CPF ou modelo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
              <option value="todos">Status: Todos</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select className="filter-select" value={temperaturaFiltro} onChange={(e) => setTemperaturaFiltro(e.target.value)}>
              <option value="todas">Temperatura: Todas</option>
              {Object.entries(LEAD_TEMPERATURA_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select className="filter-select" value={proximoContatoFiltro} onChange={(e) => setProximoContatoFiltro(e.target.value)}>
              <option value="todos">Próximo contato: Todos</option>
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="atrasados">Atrasados</option>
              <option value="sem_data">Sem data</option>
            </select>
            <select className="filter-select" value={entradaFiltro} onChange={(e) => setEntradaFiltro(e.target.value)}>
              <option value="todos">Entrada: Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              {mesesEntrada.map((m) => (
                <option key={m.valor} value={m.valor}>{m.label}</option>
              ))}
            </select>
            {souGestao && (
              <select className="filter-select" value={vendedoraFiltro} onChange={(e) => setVendedoraFiltro(e.target.value)}>
                <option value="todas">Vendedora: Todas</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.nome}</option>
                ))}
              </select>
            )}
          </div>

          <div className="results-count">LEADS ({filtrados.length})</div>

          {error && <div className="error-box">Erro ao carregar leads: {error}</div>}

          <div className="clients-table">
            <div className="leads-table-head">
              <span>CLIENTE</span>
              <span>ETAPA</span>
              <span>TEMPERATURA</span>
              <span>PRÓXIMO CONTATO</span>
              <span>ORIGEM</span>
              <span>AÇÕES</span>
            </div>

            {loading ? (
              <div className="table-empty">Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div className="table-empty">Nenhum lead encontrado.</div>
            ) : (
              filtrados.map((l) => {
                const contato = formatarProximoContato(l.proximo_contato)
                return (
                  <div className="leads-table-row" key={l.id} style={{ cursor: 'pointer' }} onClick={() => handleEdit(l)}>
                    <div className="client-cell">
                      <div className="client-name-row">
                        <div className="client-name" title={l.nome}>{l.nome}</div>
                      </div>
                      <div className="client-phone">{l.whatsapp || '—'}</div>
                    </div>
                    <div>
                      <span className={`badge ${LEAD_STATUS_BADGE_CLASS[l.status] || 'badge-neutral'}`}>
                        {(l.convertido ? 'Convertido' : LEAD_STATUS_LABELS[l.status] || l.status).toUpperCase()}
                      </span>
                    </div>
                    <div className="temperatura-cell">
                      <span className="temperatura-dot" style={{ background: LEAD_TEMPERATURA_COLOR[l.temperatura] }} />
                      {LEAD_TEMPERATURA_LABELS[l.temperatura] || '—'}
                    </div>
                    <div style={{ color: contato.atrasado ? 'var(--red)' : undefined }}>{contato.texto}</div>
                    <div>{l.canal_origem || '—'}</div>
                    <div className="leads-acoes" onClick={(e) => e.stopPropagation()}>
                      <a
                        className="leads-acao-icon"
                        href={l.whatsapp ? `tel:${l.whatsapp.replace(/\D/g, '')}` : undefined}
                        title="Ligar"
                        onClick={(e) => !l.whatsapp && e.preventDefault()}
                      >
                        <Phone size={15} />
                      </a>
                      <a
                        className="leads-acao-icon"
                        href={l.whatsapp ? `https://wa.me/55${l.whatsapp.replace(/\D/g, '')}` : undefined}
                        target="_blank"
                        rel="noreferrer"
                        title="WhatsApp"
                        onClick={(e) => !l.whatsapp && e.preventDefault()}
                      >
                        <MessageCircle size={15} />
                      </a>
                      <button type="button" className="leads-acao-icon" title="Abrir lead" onClick={() => handleEdit(l)}>
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <aside className="proximas-acoes-panel">
          <div className="proximas-acoes-titulo">PRÓXIMAS AÇÕES</div>
          {proximasAcoes.length === 0 ? (
            <div className="table-empty">Nenhuma ação agendada.</div>
          ) : (
            proximasAcoes.map((l) => {
              const contato = formatarProximoContato(l.proximo_contato)
              return (
                <div className="proxima-acao-item" key={l.id} onClick={() => handleEdit(l)}>
                  <span className="proxima-acao-dot" style={{ background: LEAD_TEMPERATURA_COLOR[l.temperatura] }} />
                  <div style={{ flex: 1 }}>
                    <div className="proxima-acao-nome">{l.nome}</div>
                    <div className="proxima-acao-desc">{l.proxima_acao || LEAD_STATUS_LABELS[l.status]}</div>
                  </div>
                  <div className="proxima-acao-data" style={{ color: contato.atrasado ? 'var(--red)' : undefined }}>
                    {contato.texto}
                  </div>
                </div>
              )
            })
          )}
          {!mostrarTodasAcoes && leads.filter((l) => !l.convertido && l.proximo_contato).length > 6 && (
            <button type="button" className="btn-secondary proximas-acoes-mais" onClick={() => setMostrarTodasAcoes(true)}>
              Ver todas as próximas ações
            </button>
          )}
        </aside>
      </div>

      {modalOpen && (
        <LeadModal
          lead={editing}
          vendedores={vendedores}
          responsaveisPosVendas={responsaveisPosVendas}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData() }}
          onDeleted={() => { setModalOpen(false); loadData() }}
          onConverted={() => { setModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
