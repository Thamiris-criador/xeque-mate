import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, AlertTriangle, Handshake, CalendarClock,
  Wallet, XCircle, RotateCcw, Gift,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie } from 'recharts'
import { supabase } from '../lib/supabase.js'
import { BRINDES_OPCOES, formatarData } from '../lib/negocio.js'
import './Dashboard.css'
import './ClientesPage.css'
import './EquipePage.css'
import './FinanceiroPage.css'

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
  const { nome, valor, pct } = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{nome}</div>
      <div className="chart-tooltip-row">
        <strong>{valor}</strong> cliente(s) ({pct}%)
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
  const [graficoStatus, setGraficoStatus] = useState('barra')
  const [confirmando, setConfirmando] = useState(null) // { clienteId, brindeKey }
  const [formConfirmacao, setFormConfirmacao] = useState({ data: '', obs: '' })

  useEffect(() => {
    Promise.all([
      supabase
        .from('clientes')
        .select('id, nome, financeiro_status, data_promessa, pagamento_compensado, data_compensacao, brindes_prometidos, brindes_entregues, brindes_data, brindes_confirmacoes, obs_cliente'),
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
    const total = clientes.length || 1
    return FINANCEIRO_STATUS_ORDER.map((key) => ({
      key, nome: FINANCEIRO_STATUS_META[key].label, valor: contagem[key],
      pct: Math.round((contagem[key] / total) * 100),
    }))
  }, [clientes])

  const brindesPendentes = useMemo(() => {
    return clientes.filter((c) => (c.brindes_prometidos || []).some((b) => !(c.brindes_entregues || []).includes(b)))
  }, [clientes])

  async function handleConfirmarBrinde(clienteId, brindeKey, dataEnvio, obs) {
    const anterior = clientes
    const clienteAtual = anterior.find((c) => c.id === clienteId)
    const entreguesAtuais = clienteAtual?.brindes_entregues || []
    const novoEntregues = entreguesAtuais.includes(brindeKey) ? entreguesAtuais : [...entreguesAtuais, brindeKey]
    const novasConfirmacoes = { ...(clienteAtual?.brindes_confirmacoes || {}), [brindeKey]: { data: dataEnvio, obs: obs || null } }

    setClientes((cs) =>
      cs.map((c) => (c.id === clienteId ? { ...c, brindes_entregues: novoEntregues, brindes_confirmacoes: novasConfirmacoes } : c))
    )

    const { error: updateError } = await supabase
      .from('clientes')
      .update({ brindes_entregues: novoEntregues, brindes_confirmacoes: novasConfirmacoes })
      .eq('id', clienteId)

    if (updateError) {
      setClientes(anterior)
      setError(updateError.message)
    }
  }

  async function handleDesfazerBrinde(clienteId, brindeKey) {
    const anterior = clientes
    const clienteAtual = anterior.find((c) => c.id === clienteId)
    const novoEntregues = (clienteAtual?.brindes_entregues || []).filter((b) => b !== brindeKey)
    const novasConfirmacoes = { ...(clienteAtual?.brindes_confirmacoes || {}) }
    delete novasConfirmacoes[brindeKey]

    setClientes((cs) =>
      cs.map((c) => (c.id === clienteId ? { ...c, brindes_entregues: novoEntregues, brindes_confirmacoes: novasConfirmacoes } : c))
    )

    const { error: updateError } = await supabase
      .from('clientes')
      .update({ brindes_entregues: novoEntregues, brindes_confirmacoes: novasConfirmacoes })
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
            <div className="chart-card-title-row">
              <div />
              <div className="chart-toggle">
                <button
                  type="button"
                  className={`chart-toggle-btn${graficoStatus === 'barra' ? ' active' : ''}`}
                  onClick={() => setGraficoStatus('barra')}
                >
                  Barra
                </button>
                <button
                  type="button"
                  className={`chart-toggle-btn${graficoStatus === 'pizza' ? ' active' : ''}`}
                  onClick={() => setGraficoStatus('pizza')}
                >
                  Pizza
                </button>
              </div>
            </div>
            {graficoStatus === 'barra' ? (
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
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Tooltip content={<ChartTooltip />} />
                    <Pie data={distribuicaoStatus} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}>
                      {distribuicaoStatus.map((d) => (
                        <Cell key={d.key} fill={FINANCEIRO_STATUS_META[d.key].color} stroke="var(--bg-card)" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {distribuicaoStatus.map((d) => (
                    <div className="chart-legend-item" key={d.key}>
                      <span className="chart-legend-dot" style={{ background: FINANCEIRO_STATUS_META[d.key].color }} />
                      {d.nome} ({d.pct}%)
                    </div>
                  ))}
                </div>
              </>
            )}
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
                  {c.obs_cliente && <div className="brinde-obs-cliente">Obs. do cadastro: {c.obs_cliente}</div>}
                  <div className="etapa-stepper">
                    {(c.brindes_prometidos || []).map((brindeKey) => {
                      const opcao = BRINDES_OPCOES.find((b) => b.key === brindeKey)
                      const entregue = (c.brindes_entregues || []).includes(brindeKey)
                      const confirmacao = (c.brindes_confirmacoes || {})[brindeKey]
                      const estaAbrindo = confirmando?.clienteId === c.id && confirmando?.brindeKey === brindeKey
                      return (
                        <div key={brindeKey} className="brinde-item">
                          <button
                            type="button"
                            className={`etapa-step${entregue ? ' current' : ''}`}
                            onClick={() => {
                              if (entregue) return
                              setConfirmando({ clienteId: c.id, brindeKey })
                              setFormConfirmacao({ data: new Date().toISOString().slice(0, 10), obs: '' })
                            }}
                            title={entregue ? `Entregue em ${formatarData(confirmacao?.data)}` : 'Confirmar entrega'}
                          >
                            {opcao?.label || brindeKey}{entregue ? ' ✓' : ''}
                          </button>
                          {entregue && confirmacao && (
                            <span className="brinde-confirmado-info">
                              Enviado em {formatarData(confirmacao.data)}{confirmacao.obs && ` · ${confirmacao.obs}`}
                              <button type="button" className="brinde-desfazer" onClick={() => handleDesfazerBrinde(c.id, brindeKey)}>
                                Desfazer
                              </button>
                            </span>
                          )}
                          {estaAbrindo && (
                            <div className="brinde-confirmar-form">
                              <label>
                                Data de envio
                                <input
                                  type="date"
                                  value={formConfirmacao.data}
                                  onChange={(e) => setFormConfirmacao((f) => ({ ...f, data: e.target.value }))}
                                />
                              </label>
                              <label>
                                Observação
                                <input
                                  value={formConfirmacao.obs}
                                  onChange={(e) => setFormConfirmacao((f) => ({ ...f, obs: e.target.value }))}
                                  placeholder="Opcional"
                                />
                              </label>
                              <div className="brinde-confirmar-acoes">
                                <button type="button" className="btn-secondary" onClick={() => setConfirmando(null)}>
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={!formConfirmacao.data}
                                  onClick={() => {
                                    handleConfirmarBrinde(c.id, brindeKey, formConfirmacao.data, formConfirmacao.obs.trim())
                                    setConfirmando(null)
                                  }}
                                >
                                  Confirmar envio
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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
