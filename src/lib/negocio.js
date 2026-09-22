// Regras de negócio compartilhadas (cálculos automáticos, não dependem de preenchimento manual)

export function calcularDiasAtraso(cliente) {
  if (cliente.financeiro_status === 'em_dia' || cliente.financeiro_status === 'cancelado') return 0
  if (cliente.pagamento_compensado) return 0
  if (!cliente.dia_vencimento) return null

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), cliente.dia_vencimento)
  if (vencimento > hoje) {
    vencimento.setMonth(vencimento.getMonth() - 1)
  }

  const diffDias = Math.round((hoje - vencimento) / 86400000)
  return Math.max(0, diffDias)
}

// Sábado/domingo → empurra para o próximo dia útil (segunda). Não considera feriados.
export function proximoDiaUtil(dataStr) {
  if (!dataStr) return null
  const d = new Date(dataStr + 'T00:00:00')
  const diaSemana = d.getDay()
  if (diaSemana === 6) d.setDate(d.getDate() + 2)
  else if (diaSemana === 0) d.setDate(d.getDate() + 1)
  return d
}

export function formatarData(data) {
  if (!data) return '—'
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : data
  return d.toLocaleDateString('pt-BR')
}

export const PRIORIDADE_COLOR = {
  vermelho: 'var(--red)',
  amarelo: 'var(--orange)',
  verde: 'var(--green)',
}

export const PRIORIDADE_LABELS = {
  vermelho: 'Alta',
  amarelo: 'Média',
  verde: 'Normal',
}

export const TAREFA_STATUS_LABELS = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const REVERSAO_STATUS_LABELS = {
  nao_trabalhado: 'Não trabalhado',
  em_contato: 'Em contato',
  demonstrou_interesse: 'Demonstrou interesse',
  em_negociacao: 'Em negociação',
  revertido: 'Revertido',
  sem_interesse: 'Sem interesse',
}

export const REVERSAO_BADGE_CLASS = {
  nao_trabalhado: 'badge-neutral',
  em_contato: 'badge-orange',
  demonstrou_interesse: 'badge-orange',
  em_negociacao: 'badge-orange',
  revertido: 'badge-green',
  sem_interesse: 'badge-red',
}

export const INDICACAO_STATUS_LABELS = {
  solicitada: 'Solicitada',
  recebida: 'Recebida',
  em_contato: 'Em contato',
  oportunidade: 'Oportunidade',
  convertida: 'Convertida',
  sem_interesse: 'Sem interesse',
}

export const INDICACAO_BADGE_CLASS = {
  solicitada: 'badge-neutral',
  recebida: 'badge-orange',
  em_contato: 'badge-orange',
  oportunidade: 'badge-orange',
  convertida: 'badge-green',
  sem_interesse: 'badge-red',
}

export const VALOR_BONIFICACAO_REVERSAO = 50.0

function inicioDoDia(data) {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getPeriodoRange(periodo) {
  const hoje = inicioDoDia(new Date())

  if (periodo === 'hoje') {
    return { inicio: hoje, fim: hoje }
  }
  if (periodo === 'semana') {
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - hoje.getDay())
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 6)
    return { inicio, fim }
  }
  // mes
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  return { inicio, fim }
}

export function dentroDoPeriodo(dataStr, periodo) {
  if (!dataStr) return false
  const { inicio, fim } = getPeriodoRange(periodo)
  const d = inicioDoDia(new Date(dataStr.slice(0, 10) + 'T00:00:00'))
  return d >= inicio && d <= fim
}

export const PERIODO_LABELS = {
  hoje: 'Hoje',
  semana: 'Esta semana',
  mes: 'Este mês',
}

export const NOTA_TIPOS = {
  ocorrencia: 'Principais ocorrências',
  problema: 'Problemas',
  oportunidade: 'Oportunidades',
  decisao: 'Decisões da gestão',
  recomendacao: 'Recomendações',
}

export function classificarDataTarefa(dataStr) {
  const hoje = inicioDoDia(new Date())
  const data = inicioDoDia(new Date(dataStr + 'T00:00:00'))
  const diffDias = Math.round((data - hoje) / 86400000)

  const fimDaSemana = new Date(hoje)
  fimDaSemana.setDate(hoje.getDate() + (7 - hoje.getDay()))

  if (diffDias < 0) return 'atrasada'
  if (diffDias === 0) return 'hoje'
  if (diffDias === 1) return 'amanha'
  if (data <= fimDaSemana) return 'semana'
  return 'futura'
}
