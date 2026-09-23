import { useEffect, useMemo, useState, useCallback } from 'react'
import { FileText, KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ClientModal from './ClientModal.jsx'
import { formatarData } from '../lib/negocio.js'
import './EquipePage.css'
import './Dashboard.css'

const ETAPAS = [
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

function EtapaStepper({ etapaAtual }) {
  const indiceAtual = ETAPAS.findIndex((e) => e.key === (etapaAtual || 'documentacao'))
  return (
    <div className="etapa-stepper">
      {ETAPAS.map((e, i) => (
        <span key={e.key} className={`etapa-step${i <= indiceAtual ? ' done' : ''}${i === indiceAtual ? ' current' : ''}`}>
          {e.label}
        </span>
      ))}
    </div>
  )
}

export default function ContempladosPage() {
  const [clientes, setClientes] = useState([])
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('clientes')
      .select('*, responsavel:equipe!responsavel_id(id, nome)')
      .eq('financeiro_status', 'contemplado')
      .order('data_contemplacao', { ascending: false })

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
    supabase.from('equipe').select('id, nome, area').order('nome').then(({ data }) => setEquipe(data || []))
  }, [loadData])

  const vendedores = useMemo(() => equipe.filter((e) => e.area === 'Comercial'), [equipe])
  const responsaveisPosVendas = useMemo(() => equipe.filter((e) => e.area === 'Pós-Vendas'), [equipe])

  const contagem = useMemo(() => {
    const c = { documentacao: 0, carta_liberada: 0, concluido: 0 }
    for (const cliente of clientes) {
      const etapa = cliente.status_documentacao || 'documentacao'
      if (c[etapa] !== undefined) c[etapa] += 1
    }
    return c
  }, [clientes])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CLIENTES CONTEMPLADOS</h1>
          <p className="page-subtitle">
            A contemplação não encerra o relacionamento: acompanhe a documentação, a utilização da carta e a
            pós-contemplação.
          </p>
        </div>
      </div>

      <div className="stat-tiles-row">
        {ETAPAS.map((e) => (
          <StatTile key={e.key} icon={e.icon} label={e.label} value={contagem[e.key]} color={e.color} />
        ))}
      </div>

      <div className="results-count">{clientes.length} CLIENTE(S)</div>

      {error && <div className="error-box">Erro ao carregar contemplados: {error}</div>}

      <div className="equipe-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="table-empty">Nenhum cliente contemplado ainda.</div>
        ) : (
          clientes.map((c) => (
            <div
              className="equipe-card"
              key={c.id}
              style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}
              onClick={() => {
                setEditing(c)
                setModalOpen(true)
              }}
            >
              <div className="equipe-info">
                <div className="equipe-nome">{c.nome}</div>
                <div className="equipe-email">
                  {c.tipo_contemplacao || 'Tipo não informado'}
                  {c.contemplacao_forma && ` · ${c.contemplacao_forma === 'lance' ? 'Lance' : 'Sorteio'}`}
                  {' · '}Contemplado em {formatarData(c.data_contemplacao)}
                  {' · '}{c.responsavel?.nome || 'Sem responsável'}
                </div>
              </div>
              <EtapaStepper etapaAtual={c.status_documentacao} />
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editing}
          initialTab="contemplacao"
          responsaveisPosVendas={responsaveisPosVendas}
          vendedores={vendedores}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData() }}
          onDeleted={() => { setModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
