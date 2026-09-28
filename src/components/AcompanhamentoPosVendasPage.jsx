import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus, Lightbulb } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import TarefaModal from './TarefaModal.jsx'
import {
  PRIORIDADE_COLOR, TAREFA_STATUS_LABELS, formatarData, dentroDoPeriodo,
  TIPOS_CONTEUDO_POS_VENDAS, TIPOS_CONTEUDO_LABELS, CANAIS_CONTEUDO,
} from '../lib/negocio.js'
import './ClientesPage.css'
import './ComercialPage.css'
import './TarefasPage.css'

export default function AcompanhamentoPosVendasPage() {
  const [tarefas, setTarefas] = useState([])
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [presetIdeia, setPresetIdeia] = useState(null)
  const [ideias, setIdeias] = useState([])
  const [novaIdeia, setNovaIdeia] = useState('')
  const [salvandoIdeia, setSalvandoIdeia] = useState(false)

  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCanal, setFiltroCanal] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('abertas')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('tarefas')
      .select('*, cliente:clientes(id, nome), responsavel:equipe(id, nome)')
      .eq('categoria', 'Pós-Vendas')
      .order('data', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setTarefas([])
    } else {
      setTarefas(data || [])
    }
    setLoading(false)
  }, [])

  const loadIdeias = useCallback(async () => {
    const { data } = await supabase.from('conteudo_ideias').select('*').order('created_at', { ascending: true })
    setIdeias(data || [])
  }, [])

  useEffect(() => {
    loadData()
    loadIdeias()
    supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => setClientes(data || []))
    supabase.from('equipe').select('id, nome').in('nome', ['Thami', 'Cley']).order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData, loadIdeias])

  async function handleAddIdeia() {
    if (!novaIdeia.trim()) return
    setSalvandoIdeia(true)
    const { error: ideiaError } = await supabase.from('conteudo_ideias').insert({ texto: novaIdeia.trim() })
    setSalvandoIdeia(false)
    if (ideiaError) {
      setError(ideiaError.message)
    } else {
      setNovaIdeia('')
      loadIdeias()
    }
  }

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroResponsavel !== 'todos' && String(t.responsavel_id) !== filtroResponsavel) return false
      if (filtroTipo !== 'todos' && t.tipo_conteudo !== filtroTipo) return false
      if (filtroCanal !== 'todos' && t.canal !== filtroCanal) return false
      if (filtroStatus === 'abertas' && ['concluida', 'cancelada'].includes(t.status)) return false
      if (filtroStatus === 'concluidas' && t.status !== 'concluida') return false
      return true
    })
  }, [tarefas, filtroResponsavel, filtroTipo, filtroCanal, filtroStatus])

  const movimentacoesEstaSemana = useMemo(
    () => tarefas.filter((t) => t.status === 'concluida' && dentroDoPeriodo(t.data_conclusao || t.data, 'semana')).length,
    [tarefas]
  )

  function handleNovo(ideia) {
    setEditing(null)
    setPresetIdeia(ideia || null)
    setModalOpen(true)
  }

  function handleEdit(tarefa) {
    setEditing(tarefa)
    setPresetIdeia(null)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ACOMPANHAMENTO PÓS-VENDAS</h1>
          <p className="page-subtitle">
            Conteúdo e relacionamento com os clientes, pra o grupo de Pós-Vendas nunca ficar parado.
          </p>
        </div>
        <button className="btn-primary" onClick={() => handleNovo(null)}>
          <Plus size={16} /> Nova movimentação
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card tint-green">
          <div className="kpi-card-value">{movimentacoesEstaSemana}</div>
          <div className="kpi-card-label">Movimentações concluídas esta semana</div>
          <div className="kpi-card-hint">Meta: pelo menos 1 por semana</div>
        </div>
        <div className="kpi-card tint-gray">
          <div className="kpi-card-value">{tarefas.filter((t) => !['concluida', 'cancelada'].includes(t.status)).length}</div>
          <div className="kpi-card-label">Agendadas / pendentes</div>
        </div>
      </div>

      <div className="comercial-layout">
        <div>
          <div className="filters-row">
            <select className="filter-select" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
              <option value="todos">Responsável: Todos</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.nome}</option>
              ))}
            </select>
            <select className="filter-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="todos">Tipo de conteúdo: Todos</option>
              {TIPOS_CONTEUDO_POS_VENDAS.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <select className="filter-select" value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
              <option value="todos">Canal: Todos</option>
              {CANAIS_CONTEUDO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="todas">Todos os status</option>
              <option value="abertas">Abertas</option>
              <option value="concluidas">Concluídas</option>
            </select>
          </div>

          <div className="results-count">{filtradas.length} MOVIMENTAÇÃO(ÕES)</div>

          {error && <div className="error-box">Erro ao carregar: {error}</div>}

          <div className="tarefas-list">
            {loading ? (
              <div className="table-empty">Carregando...</div>
            ) : filtradas.length === 0 ? (
              <div className="table-empty">Nenhuma movimentação encontrada.</div>
            ) : (
              filtradas.map((t) => (
                <div className="tarefa-row" key={t.id} onClick={() => handleEdit(t)}>
                  <span className="tarefa-prioridade" style={{ background: PRIORIDADE_COLOR[t.prioridade] }} />
                  <div className="tarefa-info">
                    <div className="tarefa-titulo">{t.titulo}</div>
                    <div className="tarefa-meta">
                      {t.cliente?.nome || 'Sem cliente'} · {t.responsavel?.nome || 'Sem responsável'} · {formatarData(t.data)}
                      {t.tipo_conteudo && ` · ${TIPOS_CONTEUDO_LABELS[t.tipo_conteudo]}`}
                      {t.canal && ` · ${t.canal}`}
                    </div>
                  </div>
                  <span className={`badge ${t.status === 'concluida' ? 'badge-green' : t.status === 'cancelada' ? 'badge-neutral' : 'badge-orange'}`}>
                    {TAREFA_STATUS_LABELS[t.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="proximas-acoes-panel">
          <div className="proximas-acoes-titulo">IDEIAS DE CONTEÚDO</div>
          {ideias.map((ideia) => (
            <div key={ideia.id} className="proxima-acao-item" onClick={() => handleNovo(ideia.texto)}>
              <Lightbulb size={14} style={{ marginTop: 3, flexShrink: 0, color: 'var(--orange)' }} />
              <div style={{ flex: 1 }}>
                <div className="proxima-acao-desc">{ideia.texto}</div>
              </div>
            </div>
          ))}
          <div className="modal-form-row" style={{ marginTop: 12 }}>
            <input
              value={novaIdeia}
              onChange={(e) => setNovaIdeia(e.target.value)}
              placeholder="Nova ideia de conteúdo..."
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', flex: 1 }}
            />
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            disabled={salvandoIdeia || !novaIdeia.trim()}
            onClick={handleAddIdeia}
          >
            <Plus size={14} /> {salvandoIdeia ? 'Salvando...' : 'Adicionar ideia'}
          </button>
        </aside>
      </div>

      {modalOpen && (
        <TarefaModal
          tarefa={editing}
          clientes={clientes}
          responsaveis={responsaveis}
          presetCategoria="Pós-Vendas"
          presetTitulo={presetIdeia}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData() }}
          onDeleted={() => { setModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
