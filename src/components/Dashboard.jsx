import { useEffect, useMemo, useState } from 'react'
import {
  Users, CheckCircle2, AlertTriangle, XCircle, Award,
  PhoneCall, ListTodo, CalendarClock, Undo2, RotateCcw, Share2,
  UserCheck, CalendarCheck, Gauge, HelpCircle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabase.js'
import { getPeriodoRange, dentroDoPeriodo, PERIODO_LABELS, formatarData, PRIORIDADE_COLOR } from '../lib/negocio.js'
import './Dashboard.css'

const STATUS_ORDER = ['em_dia', 'inadimplente', 'cancelado']

const STATUS_META = {
  em_dia: { label: 'Em dia', color: 'var(--green)' },
  inadimplente: { label: 'Inadimplente', color: 'var(--red)' },
  cancelado: { label: 'Cancelado', color: 'var(--gray-chart)' },
}

function StatTile({ icon: Icon, label, value, color, hint, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`stat-tile${onClick ? ' clickable' : ''}`}
      title={hint}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
    >
      <div className="stat-tile-icon" style={{ color }}>
        <Icon size={18} />
      </div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </Tag>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div className="chart-tooltip-row" key={p.dataKey}>
            <span className="chart-tooltip-dot" style={{ background: p.color }} />
            {STATUS_META[p.dataKey]?.label || p.dataKey}: <strong>{p.value}</strong>
          </div>
        ))}
    </div>
  )
}

function StatusLegend() {
  return (
    <div className="chart-legend">
      {STATUS_ORDER.map((key) => (
        <div className="chart-legend-item" key={key}>
          <span className="chart-legend-dot" style={{ background: STATUS_META[key].color }} />
          {STATUS_META[key].label}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [clientes, setClientes] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [reversoes, setReversoes] = useState([])
  const [indicacoes, setIndicacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState('semana')

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*, responsavel:equipe!responsavel_id(id, nome)'),
      supabase.from('tarefas').select('*, cliente:clientes(id, nome, proxima_acao), responsavel:equipe(id, nome)'),
      supabase.from('reversoes').select('status, data_pedido, data_reversao'),
      supabase.from('indicacoes').select('status, data_pedido'),
    ]).then(([c, t, r, i]) => {
      const fetchError = c.error || t.error || r.error || i.error
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setClientes(c.data || [])
        setTarefas(t.data || [])
        setReversoes(r.data || [])
        setIndicacoes(i.data || [])
      }
      setLoading(false)
    })
  }, [])

  const totals = useMemo(() => {
    const byStatus = { em_dia: 0, inadimplente: 0, cancelado: 0 }
    for (const c of clientes) {
      if (byStatus[c.financeiro_status] !== undefined) byStatus[c.financeiro_status] += 1
    }
    return { total: clientes.length, byStatus }
  }, [clientes])

  const metrics = useMemo(() => {
    const { fim: fimPeriodo } = getPeriodoRange(periodo)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const novosClientes = clientes.filter((c) => dentroDoPeriodo(c.created_at, periodo)).length
    const clientesContatados = clientes.filter((c) => dentroDoPeriodo(c.ultimo_contato, periodo)).length
    const inadimplentes = clientes.filter((c) => c.financeiro_status === 'inadimplente').length
    const contempladosPeriodo = clientes.filter((c) => dentroDoPeriodo(c.data_contemplacao, periodo)).length
    const proximasAssembleias = clientes.filter((c) => {
      if (!c.proxima_assembleia) return false
      const d = new Date(c.proxima_assembleia + 'T00:00:00')
      return d >= hoje && d <= fimPeriodo
    }).length

    const clientesComPendencia = new Set(
      tarefas.filter((t) => ['pendente', 'em_andamento'].includes(t.status) && t.cliente_id).map((t) => t.cliente_id)
    ).size
    const pendenciasResolvidas = tarefas.filter((t) => t.status === 'concluida' && dentroDoPeriodo(t.data_conclusao, periodo)).length
    const tarefasHoje = tarefas.filter((t) => t.data === hoje.toISOString().slice(0, 10) && !['concluida', 'cancelada'].includes(t.status)).length
    const tarefasAtrasadas = tarefas.filter((t) => t.data < hoje.toISOString().slice(0, 10) && !['concluida', 'cancelada'].includes(t.status)).length

    const cancelamentos = reversoes.filter((r) => dentroDoPeriodo(r.data_pedido, periodo)).length
    const emReversao = reversoes.filter((r) => ['em_contato', 'demonstrou_interesse', 'em_negociacao'].includes(r.status)).length
    const reversoesConfirmadas = reversoes.filter((r) => r.status === 'revertido' && dentroDoPeriodo(r.data_reversao, periodo)).length

    const indicacoesSolicitadas = indicacoes.filter((i) => dentroDoPeriodo(i.data_pedido, periodo)).length
    const indicacoesRecebidas = indicacoes.filter((i) => i.status !== 'solicitada').length

    const proximasAcoes = tarefas
      .filter((t) => ['pendente', 'em_andamento'].includes(t.status) && t.data <= hoje.toISOString().slice(0, 10))
      .sort((a, b) => {
        const ordem = { vermelho: 0, amarelo: 1, verde: 2 }
        return (ordem[a.prioridade] ?? 3) - (ordem[b.prioridade] ?? 3) || a.data.localeCompare(b.data)
      })
      .slice(0, 15)

    return {
      novosClientes, clientesContatados, inadimplentes, contempladosPeriodo, proximasAssembleias,
      clientesComPendencia, pendenciasResolvidas, tarefasHoje, tarefasAtrasadas,
      cancelamentos, emReversao, reversoesConfirmadas,
      indicacoesSolicitadas, indicacoesRecebidas,
      proximasAcoes,
    }
  }, [clientes, tarefas, reversoes, indicacoes, periodo])

  const distribuicaoGeral = useMemo(() => [{ nome: 'Todos', ...totals.byStatus }], [totals])

  const porResponsavel = useMemo(() => {
    const map = new Map()
    for (const c of clientes) {
      const nome = c.responsavel?.nome || 'Sem responsável'
      if (!map.has(nome)) {
        map.set(nome, { nome, em_dia: 0, inadimplente: 0, cancelado: 0 })
      }
      const row = map.get(nome)
      if (row[c.financeiro_status] !== undefined) row[c.financeiro_status] += 1
    }
    return Array.from(map.values()).sort((a, b) => b.em_dia + b.inadimplente + b.cancelado - (a.em_dia + a.inadimplente + a.cancelado))
  }, [clientes])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">DASHBOARD</h1>
          <p className="page-subtitle">Visão gerencial da operação de pós-vendas.</p>
        </div>
      </div>

      {error && <div className="error-box">Erro ao carregar dados: {error}</div>}

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : (
        <>
          <div className="stat-tiles-row">
            <StatTile icon={Users} label="Total de clientes" value={totals.total} color="var(--blue)" />
          </div>

          <div className="tabs">
            {Object.entries(PERIODO_LABELS).map(([key, label]) => (
              <button key={key} className={`tab${periodo === key ? ' active' : ''}`} onClick={() => setPeriodo(key)}>
                {label}
              </button>
            ))}
          </div>

          <div className="dashboard-section-title">Clientes</div>
          <div className="stat-tiles-row">
            <StatTile icon={Users} label="Novos clientes" value={metrics.novosClientes} color="var(--blue)" />
            <StatTile icon={PhoneCall} label="Clientes contatados" value={metrics.clientesContatados} color="var(--green)" />
            <StatTile icon={AlertTriangle} label="Clientes inadimplentes" value={metrics.inadimplentes} color="var(--red)" />
            <StatTile icon={XCircle} label="Cancelamentos" value={metrics.cancelamentos} color="var(--red)" />
            <StatTile icon={Award} label="Clientes contemplados" value={metrics.contempladosPeriodo} color="var(--red)" />
          </div>

          <div className="dashboard-section-title">Pendências e tarefas</div>
          <div className="stat-tiles-row">
            <StatTile icon={ListTodo} label="Clientes com pendências abertas" value={metrics.clientesComPendencia} color="var(--orange)" onClick={() => onNavigate?.('tarefas', { status: 'abertas' })} />
            <StatTile icon={CheckCircle2} label="Pendências resolvidas" value={metrics.pendenciasResolvidas} color="var(--green)" onClick={() => onNavigate?.('tarefas', { status: 'concluidas' })} />
            <StatTile icon={CalendarCheck} label="Tarefas do dia" value={metrics.tarefasHoje} color="var(--blue)" onClick={() => onNavigate?.('tarefas', { data: 'hoje' })} />
            <StatTile icon={CalendarClock} label="Tarefas atrasadas" value={metrics.tarefasAtrasadas} color="var(--red)" onClick={() => onNavigate?.('tarefas', { data: 'atrasada' })} />
          </div>

          <div className="dashboard-section-title">Reversão e indicações</div>
          <div className="stat-tiles-row">
            <StatTile icon={RotateCcw} label="Em processo de reversão" value={metrics.emReversao} color="var(--orange)" onClick={() => onNavigate?.('reversao', { filtroStatus: 'em_processo' })} />
            <StatTile icon={Undo2} label="Reversões confirmadas" value={metrics.reversoesConfirmadas} color="var(--green)" onClick={() => onNavigate?.('reversao', { filtroStatus: 'revertido' })} />
            <StatTile icon={Share2} label="Indicações solicitadas" value={metrics.indicacoesSolicitadas} color="var(--blue)" onClick={() => onNavigate?.('indicacoes', { filtroStatus: 'solicitada' })} />
            <StatTile icon={UserCheck} label="Indicações recebidas" value={metrics.indicacoesRecebidas} color="var(--green)" onClick={() => onNavigate?.('indicacoes', { filtroStatus: 'recebidas' })} />
          </div>

          <div className="dashboard-section-title">Consórcio</div>
          <div className="stat-tiles-row">
            <StatTile icon={CalendarClock} label="Próximas assembleias" value={metrics.proximasAssembleias} color="var(--orange)" />
            <StatTile
              icon={HelpCircle}
              label="Clientes elegíveis para lance"
              value="—"
              color="var(--gray-chart)"
              hint="Regra de elegibilidade para lance ainda não foi definida com a gestão."
            />
          </div>

          <div className="dashboard-section-title">Próximas ações — clientes que precisam de contato hoje</div>
          <div className="equipe-list">
            {metrics.proximasAcoes.length === 0 ? (
              <div className="table-empty">Nenhuma ação pendente para hoje.</div>
            ) : (
              metrics.proximasAcoes.map((t) => (
                <div className="tarefa-row" key={t.id} style={{ cursor: 'default' }}>
                  <span className="tarefa-prioridade" style={{ background: PRIORIDADE_COLOR[t.prioridade] }} />
                  <div className="tarefa-info">
                    <div className="tarefa-titulo">{t.cliente?.nome || 'Sem cliente'} — {t.titulo}</div>
                    <div className="tarefa-meta">
                      {t.responsavel?.nome || 'Sem responsável'} · prazo {formatarData(t.data)}
                      {t.cliente?.proxima_acao && ` · ${t.cliente.proxima_acao}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dashboard-section-title">Gráficos</div>
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-card-title">Distribuição por status financeiro</div>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={distribuicaoGeral} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" hide />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                  {STATUS_ORDER.map((key) => (
                    <Bar key={key} dataKey={key} stackId="status" fill={STATUS_META[key].color} radius={[4, 4, 4, 4]} barSize={36} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <StatusLegend />
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Clientes por responsável</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porResponsavel} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                  {STATUS_ORDER.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="status"
                      fill={STATUS_META[key].color}
                      radius={i === STATUS_ORDER.length - 1 ? [4, 4, 0, 0] : 0}
                      barSize={48}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <StatusLegend />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
