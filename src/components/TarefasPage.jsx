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

export default function TarefasPage({ categoriaFixa, data: dataInicial, status: statusInicial }) {
  const [tarefas, setTarefas] = useState([])
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const [filtroData, setFiltroData] = useState(dataInicial || 'todas')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState(statusInicial || 'todas')

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
    supabase.from('equipe').select('id, nome').eq('area', 'Pós-Vendas').order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const gabrielId = useMemo(() => responsaveis.find((r) => r.nome === 'Gabriel')?.id, [responsaveis])

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (categoriaFixa === 'Boleto' && (t.categoria !== 'Boleto' || t.responsavel?.nome !== 'Gabriel')) return false
      else if (categoriaFixa && t.categoria !== categoriaFixa) return false
      if (filtroData !== 'todas' && classificarDataTarefa(t.data) !== filtroData) return false
      if (filtroResponsavel !== 'todos' && String(t.responsavel_id) !== filtroResponsavel) return false
      if (filtroPrioridade !== 'todas' && t.prioridade !== filtroPrioridade) return false
      if (filtroStatus === 'abertas' && ['concluida', 'cancelada'].includes(t.status)) return false
      if (filtroStatus === 'concluidas' && t.status !== 'concluida') return false
      if (filtroStatus === 'canceladas' && t.status !== 'cancelada') return false
      return true
    })
  }, [tarefas, categoriaFixa, filtroData, filtroResponsavel, filtroPrioridade, filtroStatus])

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
          <h1 className="page-title">{categoriaFixa ? categoriaFixa.toUpperCase() + 'S' : 'TAREFAS'}</h1>
          {!categoriaFixa && (
            <p className="page-subtitle">Pendências e ações da equipe, por cliente e prioridade.</p>
          )}
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
        <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todas">Todos os status</option>
          <option value="abertas">Abertas (pendente/andamento)</option>
          <option value="concluidas">Concluídas</option>
          <option value="canceladas">Canceladas</option>
        </select>
      </div>

      <div className="results-count">{filtradas.length} {categoriaFixa ? categoriaFixa.toUpperCase() + 'S' : 'TAREFA(S)'}</div>

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
                  {categoriaFixa === 'Boleto' && t.descricao && ` · ${t.descricao}`}
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
          presetCategoria={categoriaFixa}
          presetResponsavelId={categoriaFixa === 'Boleto' ? gabrielId : undefined}
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
