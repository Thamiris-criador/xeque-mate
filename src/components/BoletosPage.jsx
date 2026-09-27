import { useEffect, useMemo, useState, useCallback } from 'react'
import { CircleDot, Send, Clock, CheckCircle2, AlertTriangle, CalendarClock } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import {
  BOLETO_STATUS_LABELS, BOLETO_STATUS_BADGE_CLASS, statusVisualBoleto, diasAtrasoBoleto, formatarData,
} from '../lib/negocio.js'
import './ClientesPage.css'
import './ComercialPage.css'
import './EquipePage.css'

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'a_enviar', label: 'A enviar' },
  { key: 'enviado', label: 'Enviados' },
  { key: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { key: 'pago', label: 'Pagos' },
  { key: 'em_atraso', label: 'Em atraso' },
  { key: 'promessa_pagamento', label: 'Promessa de pagamento' },
]

function KpiCard({ icon: Icon, value, label, tom }) {
  return (
    <div className={`kpi-card tint-${tom}`}>
      <div className={`kpi-card-icon tint-${tom}`}>
        <Icon size={19} />
      </div>
      <div>
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
      </div>
    </div>
  )
}

export default function BoletosPage() {
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [processando, setProcessando] = useState(null)
  const [promessaAbertaId, setPromessaAbertaId] = useState(null)
  const [promessaData, setPromessaData] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('boleto_ciclos')
      .select('*, cliente:clientes(id, nome, whatsapp)')
      .order('vencimento', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setCiclos([])
    } else {
      setCiclos(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const comVisual = useMemo(
    () => ciclos.map((c) => ({ ...c, statusVisual: statusVisualBoleto(c) })),
    [ciclos]
  )

  const contagem = useMemo(() => {
    const c = { a_enviar: 0, aguardando_pagamento: 0, pago: 0, em_atraso: 0, promessa_pagamento: 0 }
    for (const item of comVisual) {
      if (c[item.statusVisual] !== undefined) c[item.statusVisual] += 1
    }
    return c
  }, [comVisual])

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return comVisual
    return comVisual.filter((c) => c.statusVisual === filtro)
  }, [comVisual, filtro])

  async function handleMarcarEnviado(ciclo) {
    setProcessando(ciclo.id)
    const { error: rpcError } = await supabase.rpc('marcar_boleto_enviado', { p_ciclo_id: ciclo.id })
    setProcessando(null)
    if (rpcError) setError(rpcError.message)
    else loadData()
  }

  async function handleMarcarPago(ciclo) {
    setProcessando(ciclo.id)
    const { error: rpcError } = await supabase.rpc('marcar_boleto_pago', { p_ciclo_id: ciclo.id })
    setProcessando(null)
    if (rpcError) setError(rpcError.message)
    else loadData()
  }

  async function handleRegistrarPromessa(ciclo) {
    if (!promessaData) return
    setProcessando(ciclo.id)
    const { error: rpcError } = await supabase.rpc('registrar_promessa_boleto', {
      p_ciclo_id: ciclo.id,
      p_data: promessaData,
    })
    setProcessando(null)
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setPromessaAbertaId(null)
      setPromessaData('')
      loadData()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">BOLETOS</h1>
          <p className="page-subtitle">Régua de envio e pagamento, um ciclo por vencimento de cada cliente.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard tom="gray" icon={Send} value={contagem.a_enviar} label="Boletos a enviar" />
        <KpiCard tom="orange" icon={Clock} value={contagem.aguardando_pagamento} label="Aguardando pagamento" />
        <KpiCard tom="green" icon={CheckCircle2} value={contagem.pago} label="Pagos" />
        <KpiCard tom="red" icon={AlertTriangle} value={contagem.em_atraso} label="Em atraso" />
        <KpiCard tom="orange" icon={CalendarClock} value={contagem.promessa_pagamento} label="Promessas" />
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

      <div className="results-count">{filtrados.length} CICLO(S)</div>

      {error && <div className="error-box">Erro: {error}</div>}

      <div className="equipe-list">
        {loading ? (
          <div className="table-empty">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="table-empty">Nenhum boleto encontrado.</div>
        ) : (
          filtrados.map((c) => {
            const dias = diasAtrasoBoleto(c.vencimento)
            return (
              <div className="equipe-card" key={c.id}>
                <CircleDot size={16} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                <div className="equipe-info">
                  <div className="equipe-nome">{c.cliente?.nome || 'Cliente removido'}</div>
                  <div className="equipe-email">
                    Vencimento {formatarData(c.vencimento)}
                    {c.data_envio && ` · Enviado em ${formatarData(c.data_envio)}`}
                    {c.data_pagamento && ` · Pago em ${formatarData(c.data_pagamento)}`}
                    {c.promessa_data && c.status === 'promessa_pagamento' && ` · Prometeu pagar até ${formatarData(c.promessa_data)}`}
                    {(c.statusVisual === 'em_atraso' || c.statusVisual === 'aguardando_pagamento') && dias > 0 && ` · ${dias} dia(s) de atraso`}
                  </div>
                </div>

                <span className={`badge ${BOLETO_STATUS_BADGE_CLASS[c.statusVisual] || 'badge-neutral'}`}>
                  {(BOLETO_STATUS_LABELS[c.statusVisual] || c.statusVisual).toUpperCase()}
                </span>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {c.status === 'a_enviar' && (
                    <button type="button" className="btn-secondary" disabled={processando === c.id} onClick={() => handleMarcarEnviado(c)}>
                      Marcar como enviado
                    </button>
                  )}

                  {['enviado', 'em_atraso', 'promessa_pagamento'].includes(c.status) && (
                    <button type="button" className="btn-secondary" disabled={processando === c.id} onClick={() => handleMarcarPago(c)}>
                      Marcar como pago
                    </button>
                  )}

                  {['enviado', 'em_atraso'].includes(c.status) && promessaAbertaId !== c.id && (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={processando === c.id}
                      onClick={() => { setPromessaAbertaId(c.id); setPromessaData('') }}
                    >
                      Registrar promessa
                    </button>
                  )}

                  {promessaAbertaId === c.id && (
                    <>
                      <input
                        type="date"
                        value={promessaData}
                        onChange={(e) => setPromessaData(e.target.value)}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)' }}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={processando === c.id || !promessaData}
                        onClick={() => handleRegistrarPromessa(c)}
                      >
                        Confirmar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
