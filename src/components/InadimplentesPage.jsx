import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import ClientModal from './ClientModal.jsx'
import { calcularDiasAtraso } from '../lib/negocio.js'
import './EquipePage.css'

export default function InadimplentesPage() {
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
      .in('financeiro_status', ['atrasado', 'inadimplente'])

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

  const ordenados = useMemo(() => {
    return [...clientes]
      .map((c) => ({ ...c, _diasAtraso: calcularDiasAtraso(c) || 0 }))
      .sort((a, b) => b._diasAtraso - a._diasAtraso)
  }, [clientes])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">INADIMPLENTES</h1>
          <p className="page-subtitle">Clientes em atraso, ordenados pelos mais críticos primeiro.</p>
        </div>
      </div>

      <div className="results-count">{ordenados.length} CLIENTE(S)</div>

      {error && <div className="error-box">Erro ao carregar inadimplentes: {error}</div>}

      <div className="equipe-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : ordenados.length === 0 ? (
          <div className="table-empty">Nenhum cliente em atraso no momento.</div>
        ) : (
          ordenados.map((c) => (
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
                  {c.responsavel?.nome || 'Sem responsável'}
                  {c.parcela_valor && ` · Parcela R$ ${Number(c.parcela_valor).toFixed(2)}`}
                  {c.dia_vencimento && ` · Vence dia ${c.dia_vencimento}`}
                  {c.motivo_atraso && ` · ${c.motivo_atraso}`}
                </div>
              </div>
              <span className="badge badge-red">{c._diasAtraso} DIA(S) DE ATRASO</span>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editing}
          initialTab="financeiro"
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
