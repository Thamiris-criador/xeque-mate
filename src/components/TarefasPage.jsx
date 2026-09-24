import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
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

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState([])
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const [filtroData, setFiltroData] = useState('todas')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('tarefas')
      .select('*, cliente:clientes(id, nome), lead:leads(id, nome), responsavel:equipe(id, nome)')
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
    supabase.from('equipe').select('id, nome').order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtroData !== 'todas' && classificarDataTarefa(t.data) !== filtroData) return false
      if (filtroResponsavel !== 'todos' && String(t.responsavel_id) !== filtroResponsavel) return false
      if (filtroPrioridade !== 'todas' && t.prioridade !== filtroPrioridade) return false
      return true
    })
  }, [tarefas, filtroData, filtroResponsavel, filtroPrioridade])

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

      <div className="filters-row">
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
      </div>

      <div className="results-count">{filtradas.length} TAREFA(S)</div>

      {error && <div className="error-box">Erro ao carregar tarefas: {error}</div>}

      <div className="tarefas-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="table-empty">Nenhuma tarefa encontrada.</div>
        ) : (
          filtradas.map((t) => (
            <div className="tarefa-row" key={t.id} onClick={() => handleEdit(t)}>
              <span className="tarefa-prioridade" style={{ background: PRIORIDADE_COLOR[t.prioridade] }} title={PRIORIDADE_LABELS[t.prioridade]} />
              <div className="tarefa-info">
                <div className="tarefa-titulo">{t.titulo}</div>
                <div className="tarefa-meta">
                  {t.lead ? `Lead: ${t.lead.nome}` : t.cliente?.nome || 'Sem cliente'} · {t.responsavel?.nome || 'Sem responsável'} · {formatarData(t.data)}
                  {t.horario && ` às ${t.horario.slice(0, 5)}`}
                </div>
              </div>
              <span className={`badge ${t.status === 'concluida' ? 'badge-green' : t.status === 'cancelada' ? 'badge-neutral' : 'badge-orange'}`}>
                {TAREFA_STATUS_LABELS[t.status]}
              </span>
            </div>
          ))
        )}
      </div>

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
