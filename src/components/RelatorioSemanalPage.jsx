import { useEffect, useMemo, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { dentroDoPeriodo, formatarData, NOTA_TIPOS } from '../lib/negocio.js'
import './Dashboard.css'

const PERIODOS = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mês' },
]

export default function RelatorioSemanalPage() {
  const [clientes, setClientes] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [reversoes, setReversoes] = useState([])
  const [indicacoes, setIndicacoes] = useState([])
  const [notas, setNotas] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [periodo, setPeriodo] = useState('semana')
  const [responsavelFiltro, setResponsavelFiltro] = useState('todos')
  const [novasNotas, setNovasNotas] = useState({})
  const [savingNota, setSavingNota] = useState(null)

  const loadNotas = useCallback(async () => {
    const { data } = await supabase
      .from('historico')
      .select('*')
      .is('cliente_id', null)
      .order('created_at', { ascending: false })
    setNotas(data || [])
  }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*, responsavel:equipe!responsavel_id(id, nome)'),
      supabase.from('tarefas').select('*'),
      supabase.from('reversoes').select('*'),
      supabase.from('indicacoes').select('*'),
      supabase.from('equipe').select('id, nome'),
    ]).then(([c, t, r, i, eq]) => {
      const fetchError = c.error || t.error || r.error || i.error || eq.error
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setClientes(c.data || [])
        setTarefas(t.data || [])
        setReversoes(r.data || [])
        setIndicacoes(i.data || [])
        setResponsaveis(eq.data || [])
      }
      setLoading(false)
    })
    loadNotas()
  }, [loadNotas])

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => responsavelFiltro === 'todos' || String(c.responsavel_id) === responsavelFiltro),
    [clientes, responsavelFiltro]
  )

  const resumo = useMemo(() => {
    const novosClientes = clientesFiltrados.filter((c) => dentroDoPeriodo(c.created_at, periodo)).length
    const contatos = clientesFiltrados.filter((c) => dentroDoPeriodo(c.ultimo_contato, periodo)).length
    const emAtraso = clientesFiltrados.filter((c) => c.financeiro_status === 'inadimplente').length
    const acordos = clientesFiltrados.filter((c) => c.financeiro_status === 'acordo').length
    const promessas = clientesFiltrados.filter((c) => dentroDoPeriodo(c.data_promessa, periodo)).length
    const contempladas = clientesFiltrados.filter((c) => dentroDoPeriodo(c.data_contemplacao, periodo)).length

    const clienteIds = new Set(clientesFiltrados.map((c) => c.id))
    const pendencias = tarefas.filter((t) => ['pendente', 'em_andamento'].includes(t.status) && clienteIds.has(t.cliente_id)).length
    const pendenciasResolvidas = tarefas.filter((t) => t.status === 'concluida' && dentroDoPeriodo(t.data_conclusao, periodo) && clienteIds.has(t.cliente_id)).length

    const cancelamentos = reversoes.filter((r) => dentroDoPeriodo(r.data_pedido, periodo) && clienteIds.has(r.cliente_id)).length
    const reversoesConfirmadas = reversoes.filter((r) => r.status === 'revertido' && dentroDoPeriodo(r.data_reversao, periodo) && clienteIds.has(r.cliente_id)).length
    const indicacoesPeriodo = indicacoes.filter((i) => dentroDoPeriodo(i.data_pedido, periodo) && clienteIds.has(i.cliente_id)).length

    return { novosClientes, contatos, emAtraso, acordos, promessas, contempladas, pendencias, pendenciasResolvidas, cancelamentos, reversoesConfirmadas, indicacoesPeriodo }
  }, [clientesFiltrados, tarefas, reversoes, indicacoes, periodo])

  const notasPeriodo = useMemo(() => notas.filter((n) => dentroDoPeriodo(n.created_at?.slice(0, 10), periodo)), [notas, periodo])

  async function handleAddNota(tipo) {
    const texto = (novasNotas[tipo] || '').trim()
    if (!texto) return
    setSavingNota(tipo)
    const { error: notaError } = await supabase.from('historico').insert({ tipo, descricao: texto, cliente_id: null })
    setSavingNota(null)
    if (!notaError) {
      setNovasNotas((n) => ({ ...n, [tipo]: '' }))
      loadNotas()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">RELATÓRIO SEMANAL</h1>
          <p className="page-subtitle">Base para as reuniões da gestão — resumo automático dos principais números.</p>
        </div>
      </div>

      {error && <div className="error-box">Erro ao carregar dados: {error}</div>}

      <div className="tabs">
        {PERIODOS.map((p) => (
          <button key={p.key} className={`tab${periodo === p.key ? ' active' : ''}`} onClick={() => setPeriodo(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <select className="filter-select" value={responsavelFiltro} onChange={(e) => setResponsavelFiltro(e.target.value)}>
          <option value="todos">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : (
        <>
          <div className="dashboard-section-title">Resumo do período</div>
          <div className="stat-tiles-row">
            <div className="stat-tile"><div className="stat-tile-value">{resumo.novosClientes}</div><div className="stat-tile-label">Novos clientes</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.contatos}</div><div className="stat-tile-label">Contatos/ligações realizados</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.pendencias}</div><div className="stat-tile-label">Pendências abertas</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.pendenciasResolvidas}</div><div className="stat-tile-label">Pendências resolvidas</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.emAtraso}</div><div className="stat-tile-label">Clientes em atraso</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.acordos}</div><div className="stat-tile-label">Acordos</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.promessas}</div><div className="stat-tile-label">Promessas de pagamento</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.cancelamentos}</div><div className="stat-tile-label">Cancelamentos</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.reversoesConfirmadas}</div><div className="stat-tile-label">Reversões</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.contempladas}</div><div className="stat-tile-label">Contemplações</div></div>
            <div className="stat-tile"><div className="stat-tile-value">{resumo.indicacoesPeriodo}</div><div className="stat-tile-label">Indicações</div></div>
          </div>

          <div className="dashboard-section-title">Anotações para a reunião</div>
          {Object.entries(NOTA_TIPOS).map(([tipo, label]) => (
            <div key={tipo} className="chart-card" style={{ marginBottom: 14 }}>
              <div className="chart-card-title">{label}</div>
              <div className="modal-form-row modal-obs-add">
                <input
                  value={novasNotas[tipo] || ''}
                  onChange={(e) => setNovasNotas((n) => ({ ...n, [tipo]: e.target.value }))}
                  placeholder={`Registrar em "${label}"...`}
                />
                <button type="button" className="btn-secondary" onClick={() => handleAddNota(tipo)} disabled={savingNota === tipo}>
                  <Plus size={14} /> {savingNota === tipo ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
              {notasPeriodo.filter((n) => n.tipo === tipo).length === 0 ? (
                <div className="table-empty">Nada registrado neste período.</div>
              ) : (
                <div className="historico-list">
                  {notasPeriodo.filter((n) => n.tipo === tipo).map((n) => (
                    <div className="historico-item" key={n.id}>
                      <div className="historico-data">{formatarData(n.created_at?.slice(0, 10))}</div>
                      <div className="historico-descricao">{n.descricao}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
