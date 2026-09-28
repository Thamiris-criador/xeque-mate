import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus, RotateCcw, Briefcase } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ReversaoModal from './ReversaoModal.jsx'
import TarefaModal from './TarefaModal.jsx'
import { REVERSAO_STATUS_LABELS, REVERSAO_BADGE_CLASS, TAREFA_STATUS_LABELS, formatarData } from '../lib/negocio.js'
import './ClientesPage.css'
import './ComercialPage.css'
import './EquipePage.css'

export default function ReversaoComercialPage({ isAdmin }) {
  const [reversoes, setReversoes] = useState([])
  const [comercialTarefas, setComercialTarefas] = useState([])
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [origemFiltro, setOrigemFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState('todos')

  const [reversaoModalOpen, setReversaoModalOpen] = useState(false)
  const [editingReversao, setEditingReversao] = useState(null)
  const [presetClienteReversao, setPresetClienteReversao] = useState(null)
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const promessas = [
      supabase.from('reversoes').select('*, cliente:clientes(id, nome, whatsapp), responsavel:equipe(id, nome)').order('data_pedido', { ascending: false }),
      supabase.from('clientes').select('id, nome, whatsapp, financeiro_status').order('nome'),
    ]
    if (isAdmin) {
      promessas.push(
        supabase.from('tarefas').select('*, lead:leads(id, nome), responsavel:equipe(id, nome)').not('lead_id', 'is', null).order('data', { ascending: true })
      )
    }

    const resultados = await Promise.all(promessas)
    const fetchError = resultados.find((r) => r.error)?.error

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setReversoes(resultados[0].data || [])
      setClientes(resultados[1].data || [])
      setComercialTarefas(isAdmin ? (resultados[2].data || []) : [])
    }
    setLoading(false)
  }, [isAdmin])

  useEffect(() => {
    loadData()
    supabase.from('equipe').select('id, nome').order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const linhas = useMemo(() => {
    const deReversao = reversoes.map((r) => ({
      origem: 'reversao',
      id: `r${r.id}`,
      raw: r,
      nome: r.cliente?.nome || 'Cliente removido',
      data: r.data_contato || r.data_pedido,
      responsavelNome: r.responsavel?.nome || 'Sem responsável',
      responsavel_id: r.responsavel_id,
      statusLabel: REVERSAO_STATUS_LABELS[r.status] || r.status,
      badgeClass: REVERSAO_BADGE_CLASS[r.status] || 'badge-neutral',
      observacoes: r.observacoes,
      statusKey: r.status,
    }))
    const deComercial = comercialTarefas.map((t) => ({
      origem: 'comercial',
      id: `t${t.id}`,
      raw: t,
      nome: t.lead?.nome || 'Lead removido',
      data: t.data,
      responsavelNome: t.responsavel?.nome || 'Sem responsável',
      responsavel_id: t.responsavel_id,
      statusLabel: TAREFA_STATUS_LABELS[t.status] || t.status,
      badgeClass: t.status === 'concluida' ? 'badge-green' : t.status === 'cancelada' ? 'badge-neutral' : 'badge-orange',
      observacoes: t.descricao || t.titulo,
      statusKey: t.status,
    }))
    return [...deReversao, ...deComercial].sort((a, b) => (a.data || '').localeCompare(b.data || ''))
  }, [reversoes, comercialTarefas])

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (origemFiltro !== 'todos' && l.origem !== origemFiltro) return false
      if (statusFiltro !== 'todos' && l.statusKey !== statusFiltro) return false
      return true
    })
  }, [linhas, origemFiltro, statusFiltro])

  const canceladosSemReversao = useMemo(() => {
    const comReversao = new Set(reversoes.map((r) => r.cliente_id))
    return clientes.filter((c) => c.financeiro_status === 'cancelado' && !comReversao.has(c.id))
  }, [clientes, reversoes])

  function abrirLinha(linha) {
    if (linha.origem === 'reversao') {
      setEditingReversao(linha.raw)
      setPresetClienteReversao(null)
      setReversaoModalOpen(true)
    } else {
      setEditingTarefa(linha.raw)
      setTarefaModalOpen(true)
    }
  }

  function criarReversaoParaCliente(clienteId) {
    setEditingReversao(null)
    setPresetClienteReversao(clienteId)
    setReversaoModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">REVERSÃO / CANCELADOS E COMERCIAL</h1>
          <p className="page-subtitle">
            Fila de reabordagem: cancelados pra reverter, tentativas de reversão em andamento
            {isAdmin && ' e follow-ups comerciais'}, tudo num lugar só.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingReversao(null); setPresetClienteReversao(null); setReversaoModalOpen(true) }}>
          <Plus size={16} /> Nova reversão
        </button>
      </div>

      <div className="comercial-layout">
        <div>
          <div className="filters-row">
            <select className="filter-select" value={origemFiltro} onChange={(e) => setOrigemFiltro(e.target.value)}>
              <option value="todos">Origem: Todas</option>
              <option value="reversao">Reversão</option>
              {isAdmin && <option value="comercial">Comercial</option>}
            </select>
            <select className="filter-select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
              <option value="todos">Status: Todos</option>
              {Object.entries(REVERSAO_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div className="results-count">{filtradas.length} REGISTRO(S)</div>

          {error && <div className="error-box">Erro ao carregar: {error}</div>}

          <div className="equipe-list">
            {loading ? (
              <div className="table-empty">Carregando...</div>
            ) : filtradas.length === 0 ? (
              <div className="table-empty">Nenhum registro encontrado.</div>
            ) : (
              filtradas.map((l) => (
                <div className="equipe-card" key={l.id} onClick={() => abrirLinha(l)} style={{ cursor: 'pointer' }}>
                  {l.origem === 'reversao' ? (
                    <RotateCcw size={16} style={{ flexShrink: 0, color: 'var(--orange)' }} />
                  ) : (
                    <Briefcase size={16} style={{ flexShrink: 0, color: 'var(--blue)' }} />
                  )}
                  <div className="equipe-info">
                    <div className="equipe-nome">{l.nome}</div>
                    <div className="equipe-email">
                      {l.origem === 'reversao' ? 'Reversão' : 'Comercial'} · {l.responsavelNome} · {formatarData(l.data)}
                      {l.observacoes && ` · ${l.observacoes}`}
                    </div>
                  </div>
                  <span className={`badge ${l.badgeClass}`}>{(l.statusLabel || '').toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="proximas-acoes-panel">
          <div className="proximas-acoes-titulo">CANCELADOS SEM REVERSÃO</div>
          {canceladosSemReversao.length === 0 ? (
            <div className="table-empty">Nenhum cliente cancelado sem reversão registrada.</div>
          ) : (
            canceladosSemReversao.map((c) => (
              <div className="proxima-acao-item" key={c.id} onClick={() => criarReversaoParaCliente(c.id)}>
                <span className="proxima-acao-dot" style={{ background: 'var(--red)' }} />
                <div style={{ flex: 1 }}>
                  <div className="proxima-acao-nome">{c.nome}</div>
                  <div className="proxima-acao-desc">Criar tentativa de reversão</div>
                </div>
              </div>
            ))
          )}
        </aside>
      </div>

      {reversaoModalOpen && (
        <ReversaoModal
          reversao={editingReversao}
          clientes={clientes}
          responsaveis={responsaveis}
          presetClienteId={presetClienteReversao}
          onClose={() => setReversaoModalOpen(false)}
          onSaved={() => { setReversaoModalOpen(false); loadData() }}
          onDeleted={() => { setReversaoModalOpen(false); loadData() }}
        />
      )}

      {tarefaModalOpen && (
        <TarefaModal
          tarefa={editingTarefa}
          clientes={clientes}
          responsaveis={responsaveis}
          onClose={() => setTarefaModalOpen(false)}
          onSaved={() => { setTarefaModalOpen(false); loadData() }}
          onDeleted={() => { setTarefaModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
