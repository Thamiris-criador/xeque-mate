import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import IndicacaoModal from './IndicacaoModal.jsx'
import { INDICACAO_STATUS_LABELS, INDICACAO_BADGE_CLASS, formatarData } from '../lib/negocio.js'
import './EquipePage.css'

export default function IndicacoesPage() {
  const [indicacoes, setIndicacoes] = useState([])
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
      .from('indicacoes')
      .select('*, cliente:clientes(id, nome), responsavel:equipe(id, nome)')
      .order('data_pedido', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setIndicacoes([])
    } else {
      setIndicacoes(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => setClientes(data || []))
    supabase.from('equipe').select('id, nome').order('nome').then(({ data }) => setResponsaveis(data || []))
  }, [loadData])

  const filtradas = useMemo(
    () => indicacoes.filter((i) => filtroStatus === 'todos' || i.status === filtroStatus),
    [indicacoes, filtroStatus]
  )

  function handleEdit(i) {
    setEditing(i)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">INDICAÇÕES</h1>
          <p className="page-subtitle">Clientes satisfeitos que indicaram novas oportunidades.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus size={16} /> Solicitar indicação
        </button>
      </div>

      <div className="filters-row">
        <select className="filter-select" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(INDICACAO_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="results-count">{filtradas.length} INDICAÇÃO(ÕES)</div>

      {error && <div className="error-box">Erro ao carregar indicações: {error}</div>}

      <div className="equipe-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="table-empty">Nenhuma indicação registrada.</div>
        ) : (
          filtradas.map((i) => (
            <div className="equipe-card" key={i.id} onClick={() => handleEdit(i)} style={{ cursor: 'pointer' }}>
              <div className="equipe-info">
                <div className="equipe-nome">{i.pessoa_indicada}</div>
                <div className="equipe-email">
                  Indicado por {i.cliente?.nome || 'cliente removido'} · {formatarData(i.data_pedido)}
                  {i.telefone_indicacao && ` · ${i.telefone_indicacao}`}
                </div>
              </div>
              <span className={`badge ${INDICACAO_BADGE_CLASS[i.status] || 'badge-neutral'}`}>
                {(INDICACAO_STATUS_LABELS[i.status] || i.status).toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <IndicacaoModal
          indicacao={editing}
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
