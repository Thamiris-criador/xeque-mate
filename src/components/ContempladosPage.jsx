import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import ClientModal from './ClientModal.jsx'
import { formatarData } from '../lib/negocio.js'
import './EquipePage.css'

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
      .select('*, responsavel:equipe(id, nome)')
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CONTEMPLADOS</h1>
          <p className="page-subtitle">Clientes contemplados, documentação e próximos passos.</p>
        </div>
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
              style={{ cursor: 'pointer' }}
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
              <span className="badge badge-red">
                {(c.status_documentacao || 'DOCUMENTAÇÃO PENDENTE').toUpperCase()}
              </span>
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
