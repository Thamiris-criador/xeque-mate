import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus, List, LayoutGrid, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import TarefaModal from './TarefaModal.jsx'
import { PRIORIDADE_COLOR, PRIORIDADE_LABELS, TAREFA_STATUS_LABELS, classificarDataTarefa, formatarData } from '../lib/negocio.js'
import './TarefasPage.css'

const FILTROS_DATA = [
  { key: 'todas', label: 'Todas' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'amanha', label: 'Amanhã' },
  { key: 'atrasada', label: 'Atrasadas' },
  { key: 'semana', label: 'Esta semana' },
]

const COLUNAS_KANBAN = [
  { key: 'pendente', label: 'Pendente' },
  { key: 'em_andamento', label: 'Em andamento' },
  { key: 'concluida', label: 'Concluída' },
  { key: 'cancelada', label: 'Cancelada' },
]

function Avatar({ pessoa }) {
  return (
    <div className="tarefa-avatar">
      {pessoa?.foto_url ? <img src={pessoa.foto_url} alt="" /> : <UserRound size={15} />}
    </div>
  )
}

export default function TarefasPage({ data: dataInicial, status: statusInicial }) {
  const [tarefas, setTarefas] = useState([])
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [visualizacao, setVisualizacao] = useState('lista')

  const [filtroData, setFiltroData] = useState(dataInicial || 'todas')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState(statusInicial || 'todas')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('tarefas')
      .select('*, cliente:clientes(id, nome), lead:leads(id, nome), responsavel:equipe(id, nome, foto_url)')
      .order('data', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setTarefas([])
    } else {
      setTarefas(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => setClientes(data || []))
    supabase.from('equipe').select('id, nome').eq('area', 'Pós-Vendas').order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroData !== 'todas' && classificarDataTarefa(t.data) !== filtroData) return false
      if (filtroResponsavel !== 'todos' && String(t.responsavel_id) !== filtroResponsavel) return false
      if (filtroPrioridade !== 'todas' && t.prioridade !== filtroPrioridade) return false
      if (filtroStatus === 'abertas' && ['concluida', 'cancelada'].includes(t.status)) return false
      if (filtroStatus === 'concluidas' && t.status !== 'concluida') return false
      if (filtroStatus === 'canceladas' && t.status !== 'cancelada') return false
      return true
    })
  }, [tarefas, filtroData, filtroResponsavel, filtroPrioridade, filtroStatus])

  const grupos = useMemo(() => {
    const map = new Map()
    for (const t of filtradas) {
      const nome = t.responsavel?.nome || 'Sem responsável'
      if (!map.has(nome)) map.set(nome, { nome, pessoa: t.responsavel, tarefas: [] })
      map.get(nome).tarefas.push(t)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.nome === 'Sem responsável') return 1
      if (b.nome === 'Sem responsável') return -1
      return a.nome.localeCompare(b.nome)
    })
  }, [filtradas])

  function handleEdit(tarefa) {
    setEditing(tarefa)
    setModalOpen(true)
  }

  function handleNew() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">TAREFAS</h1>
          <p className="page-subtitle">Pendências e ações da equipe, por cliente e prioridade.</p>
        </div>
        <button className="btn-primary" onClick={handleNew}>
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      <div className="tabs">
        {FILTROS_DATA.map((f) => (
          <button
            key={f.key}
            className={`tab${filtroData === f.key ? ' active' : ''}`}
            onClick={() => setFiltroData(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="filters-row" style={{ alignItems: 'center' }}>
        <select className="filter-select" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
          <option value="todos">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.nome}
            </option>
          ))}
        </select>
        <select className="filter-select" value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)}>
          <option value="todas">Todas as prioridades</option>
          <option value="vermelho">Vermelho (crítica)</option>
          <option value="amarelo">Amarelo (importante)</option>
          <option value="verde">Verde (normal)</option>
        </select>
        <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todas">Todos os status</option>
          <option value="abertas">Abertas (pendente/andamento)</option>
          <option value="concluidas">Concluídas</option>
          <option value="canceladas">Canceladas</option>
        </select>

        <div className="view-toggle" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={`view-toggle-btn${visualizacao === 'lista' ? ' active' : ''}`}
            onClick={() => setVisualizacao('lista')}
          >
            <List size={14} /> Lista
          </button>
          <button
            type="button"
            className={`view-toggle-btn${visualizacao === 'kanban' ? ' active' : ''}`}
            onClick={() => setVisualizacao('kanban')}
          >
            <LayoutGrid size={14} /> Kanban
          </button>
        </div>
      </div>

      <div className="results-count">{filtradas.length} TAREFA(S)</div>

      {error && <div className="error-box">Erro ao carregar tarefas: {error}</div>}

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="table-empty">Nenhuma tarefa encontrada.</div>
      ) : visualizacao === 'kanban' ? (
        <div className="kanban-board">
          {COLUNAS_KANBAN.map((coluna) => {
            const tarefasColuna = filtradas.filter((t) => t.status === coluna.key)
            return (
              <div className="kanban-coluna" key={coluna.key}>
                <div className="kanban-coluna-header">
                  <span>{coluna.label}</span>
                  <span>{tarefasColuna.length}</span>
                </div>
                {tarefasColuna.map((t) => (
                  <div
                    className="kanban-card"
                    key={t.id}
                    style={{ borderLeftColor: PRIORIDADE_COLOR[t.prioridade] }}
                    onClick={() => handleEdit(t)}
                  >
                    <div className="kanban-card-titulo">{t.titulo}</div>
                    <div className="kanban-card-meta">
                      <Avatar pessoa={t.responsavel} />
                      {t.responsavel?.nome || 'Sem responsável'} · {formatarData(t.data)}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        grupos.map((grupo) => (
          <div className="tarefas-grupo" key={grupo.nome}>
            <div className="tarefas-grupo-header">
              <Avatar pessoa={grupo.pessoa} />
              <span className="tarefas-grupo-nome">{grupo.nome}</span>
              <span className="tarefas-grupo-count">{grupo.tarefas.length}</span>
            </div>
            <div className="tarefas-list">
              {grupo.tarefas.map((t) => (
                <div className="tarefa-row" key={t.id} onClick={() => handleEdit(t)}>
                  <span className="tarefa-prioridade" style={{ background: PRIORIDADE_COLOR[t.prioridade] }} title={PRIORIDADE_LABELS[t.prioridade]} />
                  <div className="tarefa-info">
                    <div className="tarefa-titulo">{t.titulo}</div>
                    <div className="tarefa-meta">
                      {t.lead ? `Lead: ${t.lead.nome}` : t.cliente?.nome || 'Sem cliente'} · {formatarData(t.data)}
                      {t.horario && ` às ${t.horario.slice(0, 5)}`}
                    </div>
                  </div>
                  <span className={`badge ${t.status === 'concluida' ? 'badge-green' : t.status === 'cancelada' ? 'badge-neutral' : 'badge-orange'}`}>
                    {TAREFA_STATUS_LABELS[t.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modalOpen && (
        <TarefaModal
          tarefa={editing}
          clientes={clientes}
          responsaveis={responsaveis}
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
