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

export const JORNADA_LABELS = {
  novo_pos_venda: 'Novo pós-venda',
  em_andamento: 'Em andamento',
  contemplado: 'Contemplado',
  finalizado: 'Finalizado',
}

export const FINANCEIRO_LABELS = {
  em_dia: 'Em dia',
  inadimplente: 'Inadimplente',
  acordo: 'Acordo',
  cancelado: 'Cancelado',
  contemplado: 'Contemplado',
}

export const STATUS_DOCUMENTACAO_LABELS = {
  documentacao: 'Em documentação',
  carta_liberada: 'Carta liberada para uso',
  concluido: 'Processo concluído',
}

export const ACOMPANHAMENTO_STATUS_LABELS = {
  novo: 'Novo',
  em_acompanhamento: 'Em acompanhamento',
  aguardando_cliente: 'Aguardando cliente',
  pendencia: 'Pendência',
  resolvido: 'Resolvido',
  contemplado: 'Contemplado',
  cancelamento: 'Cancelamento',
  reversao: 'Reversão',
  finalizado: 'Finalizado',
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

export const BRINDES_OPCOES = [
  { key: 'pix', label: 'Pix' },
  { key: 'parcela', label: 'Parcela' },
  { key: 'moletom', label: 'Moletom' },
  { key: 'emplacamento', label: 'Emplacamento' },
  { key: 'chaveiro', label: 'Chaveiro' },
]

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

// ---- Módulo Comercial (leads) ----

export const CANAIS_ORIGEM = [
  'Instagram', 'TikTok', 'WhatsApp', 'Redes sociais', 'Indicação',
  'Site', 'Evento', 'Cliente antigo', 'Anúncio', 'Outro',
]

export const LEAD_STATUS_LABELS = {
  novo: 'Novo',
  em_contato: 'Em contato',
  interessado: 'Interessado',
  proposta_enviada: 'Proposta enviada',
  em_negociacao: 'Em negociação',
  follow_up: 'Follow-up',
  aguardando_cliente: 'Aguardando cliente',
  fechado: 'Fechado',
  sem_interesse: 'Sem interesse',
  sem_retorno: 'Sem retorno',
  adiado: 'Adiado',
  perdido: 'Perdido',
}

export const LEAD_STATUS_BADGE_CLASS = {
  novo: 'badge-blue',
  em_contato: 'badge-orange',
  interessado: 'badge-orange',
  proposta_enviada: 'badge-orange',
  em_negociacao: 'badge-orange',
  follow_up: 'badge-orange',
  aguardando_cliente: 'badge-neutral',
  fechado: 'badge-green',
  sem_interesse: 'badge-neutral',
  sem_retorno: 'badge-neutral',
  adiado: 'badge-neutral',
  perdido: 'badge-red',
}

export const LEAD_TEMPERATURA_LABELS = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
}

export const LEAD_TEMPERATURA_COLOR = {
  frio: 'var(--blue)',
  morno: 'var(--orange)',
  quente: 'var(--red)',
}

export const TIPOS_CONTATO_LEAD = ['Ligação', 'WhatsApp', 'E-mail', 'Presencial', 'Outro']

// ---- Experiência do cliente (NPS) ----

export function classificarNps(nota) {
  if (nota === null || nota === undefined || nota === '') return null
  const n = Number(nota)
  if (n <= 6) return 'detrator'
  if (n <= 8) return 'neutro'
  return 'promotor'
}

export const NPS_CLASSIFICACAO_LABELS = {
  detrator: 'Detrator',
  neutro: 'Neutro',
  promotor: 'Promotor',
}

export const NPS_CLASSIFICACAO_COLOR = {
  detrator: 'var(--red)',
  neutro: 'var(--orange)',
  promotor: 'var(--green)',
}

export const NPS_CLASSIFICACAO_BADGE_CLASS = {
  detrator: 'badge-red',
  neutro: 'badge-orange',
  promotor: 'badge-green',
}

export const NPS_ORIGEM_OPCOES = [
  'Onboarding',
  'Acompanhamento',
  'Pós-assembleia',
  'Pós-contemplação',
  'Pré-cancelamento',
  'Pesquisa periódica',
]

// ---- Régua de boletos ----

export const BOLETO_STATUS_LABELS = {
  a_enviar: 'A enviar',
  enviado: 'Enviado',
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  em_atraso: 'Em atraso',
  promessa_pagamento: 'Promessa de pagamento',
}

export const BOLETO_STATUS_BADGE_CLASS = {
  a_enviar: 'badge-neutral',
  enviado: 'badge-blue',
  aguardando_pagamento: 'badge-orange',
  pago: 'badge-green',
  em_atraso: 'badge-red',
  promessa_pagamento: 'badge-orange',
}

// "Aguardando pagamento" é um recorte de "enviado" cujo vencimento já passou — não é um valor
// salvo no banco, é calculado aqui pra não duplicar o significado de "enviado".
export function statusVisualBoleto(ciclo) {
  const hoje = new Date().toISOString().slice(0, 10)
  if (ciclo.status === 'enviado' && ciclo.vencimento < hoje) return 'aguardando_pagamento'
  return ciclo.status
}

export function diasAtrasoBoleto(vencimento) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(vencimento + 'T00:00:00')
  return Math.max(0, Math.round((hoje - venc) / 86400000))
}

// ---- Acompanhamento Pós-Vendas (conteúdo/relacionamento) ----

export const TIPOS_CONTEUDO_POS_VENDAS = [
  { key: 'resultado_assembleia', label: 'Resultado de assembleia', exemplo: 'Pessoal, passando para compartilhar o resultado da assembleia de hoje e lembrar vocês de acompanharem suas cotas…' },
  { key: 'lembrete_pagamento', label: 'Lembrete de pagamento', exemplo: 'Passando para lembrar quem tem vencimento próximo. Se precisar do boleto ou tiver qualquer dificuldade, chama a gente.' },
  { key: 'lance', label: 'Lance', exemplo: 'Você sabe como funciona o lance no consórcio? Hoje vou explicar rapidinho…' },
  { key: 'contemplacao', label: 'Contemplação', exemplo: 'Foi contemplado? Entenda quais são os próximos passos…' },
  { key: 'educacao', label: 'Educação', exemplo: 'Você sabia que existem diferentes estratégias para utilizar o lance?' },
  { key: 'bastidores', label: 'Bastidores', exemplo: 'Mostrar equipe, atendimento, organização e acompanhamento.' },
  { key: 'relacionamento', label: 'Relacionamento', exemplo: 'Como está seu projeto da Kawasaki? Alguma dúvida que podemos ajudar a resolver?' },
]

export const TIPOS_CONTEUDO_LABELS = Object.fromEntries(TIPOS_CONTEUDO_POS_VENDAS.map((t) => [t.key, t.label]))

export const CANAIS_CONTEUDO = ['Texto', 'Vídeo', 'Áudio', 'Imagem']

export const IDEIAS_CONTEUDO_POS_VENDAS = [
  '3 coisas que todo cliente deveria saber antes da assembleia.',
  'Você sabe o que acontece depois que é contemplado?',
  'Lance embutido: quando ele pode fazer sentido?',
  'O que fazer quando a parcela apertou?',
  'Por que seu Pós-Vendas é importante depois da contratação?',
  'O que nossa equipe acompanha enquanto você espera sua contemplação?',
]
