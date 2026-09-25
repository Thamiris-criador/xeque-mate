import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import ClientModal from './ClientModal.jsx'
import './EquipePage.css'

const FILTROS = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'proximos7', label: 'Próximos 7 dias' },
  { key: 'mes', label: 'Do mês' },
]

function proximoAniversario(dataNascStr, hoje) {
  const nasc = new Date(dataNascStr + 'T00:00:00')
  let proximo = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
  if (proximo < hoje) proximo = new Date(hoje.getFullYear() + 1, nasc.getMonth(), nasc.getDate())
  return { proximo, nasc }
}

export default function AniversariantesPage({ isAdmin }) {
  const [clientes, setClientes] = useState([])
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('hoje')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('clientes')
      .select('*, responsavel:equipe!responsavel_id(id, nome)')
      .not('data_nascimento', 'is', null)

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
    supabase.from('equipe').select('id, nome, area, vende').order('nome').then(({ data }) => setEquipe(data || []))
  }, [loadData])

  const vendedores = useMemo(() => equipe.filter((e) => e.area === 'Comercial' || e.vende), [equipe])
  const responsaveisPosVendas = useMemo(() => equipe.filter((e) => e.area === 'Pós-Vendas'), [equipe])

  const filtrados = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const em7Dias = new Date(hoje)
    em7Dias.setDate(hoje.getDate() + 7)

    return clientes
      .map((c) => {
        const { proximo, nasc } = proximoAniversario(c.data_nascimento, hoje)
        const idadeQueFaz = proximo.getFullYear() - nasc.getFullYear()
        return { ...c, _proximo: proximo, _idadeQueFaz: idadeQueFaz }
      })
      .filter((c) => {
        if (filtro === 'hoje') return c._proximo.getTime() === hoje.getTime()
        if (filtro === 'proximos7') return c._proximo >= hoje && c._proximo <= em7Dias
        return new Date(c.data_nascimento + 'T00:00:00').getMonth() === hoje.getMonth()
      })
      .sort((a, b) => {
        if (filtro === 'mes') {
          const diaA = new Date(a.data_nascimento + 'T00:00:00').getDate()
          const diaB = new Date(b.data_nascimento + 'T00:00:00').getDate()
          return diaA - diaB
        }
        return a._proximo - b._proximo
      })
  }, [clientes, filtro])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ANIVERSARIANTES</h1>
          <p className="page-subtitle">Datas de nascimento dos clientes, para relacionamento e fidelização.</p>
        </div>
      </div>

      <div className="tabs">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            className={`tab${filtro === f.key ? ' active' : ''}`}
            onClick={() => setFiltro(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="results-count">{filtrados.length} CLIENTE(S)</div>

      {error && <div className="error-box">Erro ao carregar aniversariantes: {error}</div>}

      <div className="equipe-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="table-empty">Nenhum aniversariante neste período.</div>
        ) : (
          filtrados.map((c) => (
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
                  {c.whatsapp || 'Sem telefone'} · {c.responsavel?.nome || 'Sem responsável'} · Faz {c._idadeQueFaz} anos
                </div>
              </div>
              <span className="badge badge-orange">
                {c._proximo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editing}
          responsaveisPosVendas={responsaveisPosVendas}
          vendedores={vendedores}
          isAdmin={isAdmin}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData() }}
          onDeleted={() => { setModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
