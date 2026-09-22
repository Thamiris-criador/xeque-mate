import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ReversaoModal from './ReversaoModal.jsx'
import { REVERSAO_STATUS_LABELS, REVERSAO_BADGE_CLASS, VALOR_BONIFICACAO_REVERSAO, formatarData } from '../lib/negocio.js'
import './EquipePage.css'

export default function ReversaoPage() {
  const [reversoes, setReversoes] = useState([])
  const [clientes, setClientes] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('reversoes')
      .select('*, cliente:clientes(id, nome), responsavel:equipe(id, nome)')
      .order('data_pedido', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setReversoes([])
    } else {
      setReversoes(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => setClientes(data || []))
    supabase.from('equipe').select('id, nome').order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const filtradas = useMemo(
    () => reversoes.filter((r) => filtroStatus === 'todos' || r.status === filtroStatus),
    [reversoes, filtroStatus]
  )

  const confirmadas = useMemo(() => reversoes.filter((r) => r.status === 'revertido'), [reversoes])
  const totalBonificacao = confirmadas.length * VALOR_BONIFICACAO_REVERSAO

  function handleEdit(r) {
    setEditing(r)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">REVERSÃO</h1>
          <p className="page-subtitle">Acompanhamento de clientes com intenção de cancelar ou sair do consórcio.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus size={16} /> Nova reversão
        </button>
      </div>

      <div className="stat-tiles-row">
        <div className="stat-tile">
          <div className="stat-tile-value">{confirmadas.length}</div>
          <div className="stat-tile-label">Total de reversões confirmadas</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-value">R$ {totalBonificacao.toFixed(2)}</div>
          <div className="stat-tile-label">Valor total de bonificações</div>
        </div>
      </div>

      <div className="filters-row">
        <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(REVERSAO_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="results-count">{filtradas.length} REGISTRO(S)</div>

      {error && <div className="error-box">Erro ao carregar reversões: {error}</div>}

      <div className="equipe-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="table-empty">Nenhum registro de reversão.</div>
        ) : (
          filtradas.map((r) => (
            <div className="equipe-card" key={r.id} onClick={() => handleEdit(r)} style={{ cursor: 'pointer' }}>
              <div className="equipe-info">
                <div className="equipe-nome">{r.cliente?.nome || 'Cliente removido'}</div>
                <div className="equipe-email">
                  {r.responsavel?.nome || 'Sem responsável'} · Pedido em {formatarData(r.data_pedido)}
                  {r.data_reversao && ` · Revertido em ${formatarData(r.data_reversao)}`}
                </div>
              </div>
              <span className={`badge ${REVERSAO_BADGE_CLASS[r.status] || 'badge-neutral'}`}>
                {(REVERSAO_STATUS_LABELS[r.status] || r.status).toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ReversaoModal
          reversao={editing}
          clientes={clientes}
          responsaveis={responsaveis}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData() }}
          onDeleted={() => { setModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
