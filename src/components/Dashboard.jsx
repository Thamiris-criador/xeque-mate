import { useEffect, useMemo, useState } from 'react'
import { Users, CheckCircle2, Clock, AlertTriangle, XCircle, Award } from 'lucide-react'
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
import './Dashboard.css'

const STATUS_ORDER = ['em_dia', 'atrasado', 'inadimplente', 'cancelado']

const STATUS_META = {
  em_dia: { label: 'Em dia', color: 'var(--green)' },
  atrasado: { label: 'Atrasado', color: 'var(--orange)' },
  inadimplente: { label: 'Inadimplente', color: 'var(--red)' },
  cancelado: { label: 'Cancelado', color: 'var(--gray-chart)' },
}

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

export default function Dashboard() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('financeiro_status, jornada, responsavel:equipe(id, nome)')
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setClientes(data || [])
        }
        setLoading(false)
      })
  }, [])

  const totals = useMemo(() => {
    const byStatus = { em_dia: 0, atrasado: 0, inadimplente: 0, cancelado: 0 }
    let contemplados = 0
    for (const c of clientes) {
      if (byStatus[c.financeiro_status] !== undefined) byStatus[c.financeiro_status] += 1
      if (c.jornada === 'contemplado') contemplados += 1
    }
    return { total: clientes.length, byStatus, contemplados }
  }, [clientes])

  const distribuicaoGeral = useMemo(
    () => [
      {
        nome: 'Todos',
        ...totals.byStatus,
      },
    ],
    [totals]
  )

  const porResponsavel = useMemo(() => {
    const map = new Map()
    for (const c of clientes) {
      const nome = c.responsavel?.nome || 'Sem responsável'
      if (!map.has(nome)) {
        map.set(nome, { nome, em_dia: 0, atrasado: 0, inadimplente: 0, cancelado: 0 })
      }
      const row = map.get(nome)
      if (row[c.financeiro_status] !== undefined) row[c.financeiro_status] += 1
    }
    return Array.from(map.values()).sort((a, b) => b.em_dia + b.atrasado + b.inadimplente + b.cancelado - (a.em_dia + a.atrasado + a.inadimplente + a.cancelado))
  }, [clientes])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">DASHBOARD</h1>
          <p className="page-subtitle">Visão geral da carteira de clientes.</p>
        </div>
      </div>

      {error && <div className="error-box">Erro ao carregar dados: {error}</div>}

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : (
        <>
          <div className="stat-tiles-row">
            <StatTile icon={Users} label="Total de clientes" value={totals.total} color="var(--blue)" />
            <StatTile icon={CheckCircle2} label="Em dia" value={totals.byStatus.em_dia} color="var(--green)" />
            <StatTile icon={Clock} label="Atrasados" value={totals.byStatus.atrasado} color="var(--orange)" />
            <StatTile icon={AlertTriangle} label="Inadimplentes" value={totals.byStatus.inadimplente} color="var(--red)" />
            <StatTile icon={XCircle} label="Cancelados" value={totals.byStatus.cancelado} color="var(--gray-chart)" />
            <StatTile icon={Award} label="Contemplados" value={totals.contemplados} color="var(--blue)" />
          </div>

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
