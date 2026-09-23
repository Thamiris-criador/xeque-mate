import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, AlertTriangle, Handshake, CalendarClock,
  Wallet, XCircle, RotateCcw, Gift,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { supabase } from '../lib/supabase.js'
import { BRINDES_OPCOES, formatarData } from '../lib/negocio.js'
import './Dashboard.css'
import './ClientesPage.css'
import './EquipePage.css'

const FINANCEIRO_STATUS_ORDER = ['em_dia', 'inadimplente', 'acordo', 'cancelado', 'contemplado']

const FINANCEIRO_STATUS_META = {
  em_dia: { label: 'Em dia', color: 'var(--green)' },
  inadimplente: { label: 'Inadimplente', color: 'var(--red)' },
  acordo: { label: 'Acordo', color: 'var(--blue)' },
  cancelado: { label: 'Cancelado', color: 'var(--gray-chart)' },
  contemplado: { label: 'Contemplado', color: 'var(--purple)' },
}

function StatTile({ icon: Icon, label, value, color, hint }) {
  return (
    <div className="stat-tile" title={hint}>
      <div className="stat-tile-icon" style={{ color }}>
        <Icon size={18} />
      </div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const { nome, valor } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{nome}</div>
      <div className="chart-tooltip-row">
        <strong>{valor}</strong> cliente(s)
      </div>
    </div>
  )
}

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function dentroDoIntervalo(dataStr, inicio, fim) {
  if (!dataStr) return false
  if (inicio && dataStr < inicio) return false
  if (fim && dataStr > fim) return false
  return true
}

export default function FinanceiroPage() {
  const [clientes, setClientes] = useState([])
  const [reversoes, setReversoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    Promise.all([
      supabase
        .from('clientes')
        .select('id, nome, financeiro_status, data_promessa, pagamento_compensado, data_compensacao, brindes_prometidos, brindes_entregues, brindes_data'),
      supabase.from('reversoes').select('status, data_pedido, data_reversao, valor_bonificacao'),
    ]).then(([c, r]) => {
      const fetchError = c.error || r.error
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setClientes(c.data || [])
        setReversoes(r.data || [])
      }
      setLoading(false)
    })
  }, [])

  const temFiltro = Boolean(dataInicio || dataFim)

  const metrics = useMemo(() => {
    const emDia = clientes.filter((c) => c.financeiro_status === 'em_dia').length
    const inadimplentes = clientes.filter((c) => c.financeiro_status === 'inadimplente').length
    const acordos = clientes.filter((c) => c.financeiro_status === 'acordo').length

    const promessas = clientes.filter((c) =>
      c.data_promessa && !c.pagamento_compensado && (!temFiltro || dentroDoIntervalo(c.data_promessa, dataInicio, dataFim))
    ).length
    const compensados = clientes.filter((c) =>
      c.pagamento_compensado && (!temFiltro || dentroDoIntervalo(c.data_compensacao, dataInicio, dataFim))
    ).length
    const cancelamentos = reversoes.filter((r) =>
      !temFiltro || dentroDoIntervalo(r.data_pedido, dataInicio, dataFim)
    ).length
    const revertidas = reversoes.filter((r) =>
      r.status === 'revertido' && (!temFiltro || dentroDoIntervalo(r.data_reversao, dataInicio, dataFim))
    )
    const bonificacoes = revertidas.reduce((soma, r) => soma + Number(r.valor_bonificacao || 0), 0)

    return {
      emDia, inadimplentes, acordos, promessas, compensados,
      cancelamentos, reversoesConfirmadas: revertidas.length, bonificacoes,
    }
  }, [clientes, reversoes, dataInicio, dataFim, temFiltro])

  const distribuicaoStatus = useMemo(() => {
    const contagem = { em_dia: 0, inadimplente: 0, acordo: 0, cancelado: 0, contemplado: 0 }
    for (const c of clientes) {
      if (contagem[c.financeiro_status] !== undefined) contagem[c.financeiro_status] += 1
    }
    return FINANCEIRO_STATUS_ORDER.map((key) => ({
      key, nome: FINANCEIRO_STATUS_META[key].label, valor: contagem[key],
    }))
  }, [clientes])

  const brindesPendentes = useMemo(() => {
    return clientes.filter((c) => (c.brindes_prometidos || []).some((b) => !(c.brindes_entregues || []).includes(b)))
  }, [clientes])

  async function handleEntregarBrinde(clienteId, brindeKey) {
    const anterior = clientes
    setClientes((cs) =>
      cs.map((c) => {
        if (c.id !== clienteId) return c
        const entregues = c.brindes_entregues || []
        const jaEntregue = entregues.includes(brindeKey)
        return {
          ...c,
          brindes_entregues: jaEntregue ? entregues.filter((b) => b !== brindeKey) : [...entregues, brindeKey],
        }
      })
    )

    const clienteAtual = anterior.find((c) => c.id === clienteId)
    const entreguesAtuais = clienteAtual?.brindes_entregues || []
    const novoValor = entreguesAtuais.includes(brindeKey)
      ? entreguesAtuais.filter((b) => b !== brindeKey)
      : [...entreguesAtuais, brindeKey]

    const { error: updateError } = await supabase
      .from('clientes')
      .update({ brindes_entregues: novoValor })
      .eq('id', clienteId)

    if (updateError) {
      setClientes(anterior)
      setError(updateError.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">FINANCEIRO</h1>
          <p className="page-subtitle">Visão geral da saúde financeira da carteira.</p>
        </div>
      </div>

      <div className="filters-row">
        <label className="filter-select" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          De
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)' }} />
        </label>
        <label className="filter-select" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Até
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)' }} />
        </label>
        {temFiltro && (
          <button className="filter-select" onClick={() => { setDataInicio(''); setDataFim('') }}>
            Limpar filtro
          </button>
        )}
      </div>
      <p className="page-subtitle" style={{ marginTop: -8, marginBottom: 16 }}>
        O filtro de data vale para promessas, compensações, cancelamentos, reversões e bonificações — os cards de
        "Situação da carteira" e o gráfico mostram sempre o status atual dos clientes.
      </p>

      {error && <div className="error-box">Erro ao carregar dados financeiros: {error}</div>}

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : (
        <>
          <div className="dashboard-section-title">Situação da carteira</div>
          <div className="stat-tiles-row">
            <StatTile icon={CheckCircle2} label="Clientes em dia" value={metrics.emDia} color="var(--green)" />
            <StatTile icon={AlertTriangle} label="Clientes inadimplentes" value={metrics.inadimplentes} color="var(--red)" />
            <StatTile icon={Handshake} label="Acordos em andamento" value={metrics.acordos} color="var(--blue)" />
          </div>

          <div className="dashboard-section-title">Promessas e compensações</div>
          <div className="stat-tiles-row">
            <StatTile icon={CalendarClock} label="Promessas de pagamento" value={metrics.promessas} color="var(--orange)" hint="Clientes com data de promessa registrada e pagamento ainda não compensado" />
            <StatTile icon={Wallet} label="Pagamentos compensados" value={metrics.compensados} color="var(--green)" />
          </div>

          <div className="dashboard-section-title">Cancelamentos e reversão</div>
          <div className="stat-tiles-row">
            <StatTile icon={XCircle} label="Cancelamentos" value={metrics.cancelamentos} color="var(--red)" />
            <StatTile icon={RotateCcw} label="Reversões confirmadas" value={metrics.reversoesConfirmadas} color="var(--green)" />
            <StatTile icon={Gift} label="Bonificações de reversão" value={formatarMoeda(metrics.bonificacoes)} color="var(--blue)" hint="Total pago aos responsáveis pelas reversões confirmadas" />
          </div>

          <div className="dashboard-section-title">Distribuição por status financeiro</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribuicaoStatus} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={56}>
                  {distribuicaoStatus.map((d) => (
                    <Cell key={d.key} fill={FINANCEIRO_STATUS_META[d.key].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboard-section-title">Brindes a entregar</div>
          <div className="equipe-list">
            {brindesPendentes.length === 0 ? (
              <div className="table-empty">Nenhum brinde pendente de entrega.</div>
            ) : (
              brindesPendentes.map((c) => (
                <div className="equipe-card" key={c.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                  <div className="equipe-nome">
                    {c.nome}
                    {c.brindes_data && <span className="equipe-email"> · combinado para {formatarData(c.brindes_data)}</span>}
                  </div>
                  <div className="etapa-stepper">
                    {(c.brindes_prometidos || []).map((brindeKey) => {
                      const opcao = BRINDES_OPCOES.find((b) => b.key === brindeKey)
                      const entregue = (c.brindes_entregues || []).includes(brindeKey)
                      return (
                        <button
                          key={brindeKey}
                          type="button"
                          className={`etapa-step${entregue ? ' current' : ''}`}
                          onClick={() => handleEntregarBrinde(c.id, brindeKey)}
                          title={entregue ? 'Marcar como não entregue' : 'Marcar como entregue'}
                        >
                          {opcao?.label || brindeKey}{entregue ? ' ✓' : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
