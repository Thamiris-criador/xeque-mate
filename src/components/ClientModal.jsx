import { useEffect, useState } from 'react'
import { X, Trash2, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import TarefaModal from './TarefaModal.jsx'
import {
  calcularDiasAtraso,
  proximoDiaUtil,
  formatarData,
  PRIORIDADE_COLOR,
  TAREFA_STATUS_LABELS,
  BRINDES_OPCOES,
} from '../lib/negocio.js'
import './ClientModal.css'

const TABS = [
  { key: 'dados', label: 'Dados do cliente' },
  { key: 'comercial', label: 'Dados comerciais' },
  { key: 'consorcio', label: 'Dados do consórcio' },
  { key: 'financeiro', label: 'Status financeiro' },
  { key: 'acompanhamento', label: 'Onboarding' },
  { key: 'contemplacao', label: 'Contemplação' },
  { key: 'tarefas', label: 'Tarefas', requerEdit: true },
  { key: 'historico', label: 'Histórico', requerEdit: true },
]

export default function ClientModal({ client, responsaveisPosVendas, vendedores, initialTab, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(client)
  const [tab, setTab] = useState(initialTab || 'dados')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    nome: client?.nome || '',
    cpf: client?.cpf || '',
    whatsapp: client?.whatsapp || '',
    email: client?.email || '',
    data_nascimento: client?.data_nascimento || '',
    cidade: client?.cidade || '',
    estado: client?.estado || '',
    endereco: client?.endereco || '',
    obs_cliente: client?.obs_cliente || '',
    brindes_prometidos: client?.brindes_prometidos || [],
    brindes_data: client?.brindes_data || '',

    vendedor_id: client?.vendedor_id || '',
    data_venda: client?.data_venda || '',
    origem_cliente: client?.origem_cliente || '',
    obs_comerciais: client?.obs_comerciais || '',

    proposta: client?.proposta || '',
    grupo: client?.grupo || '',
    cota: client?.cota || '',
    plano: client?.plano || '',
    marca: client?.marca || '',
    modelo: client?.modelo || '',
    valor_credito: client?.valor_credito ?? '',
    prazo_grupo: client?.prazo_grupo ?? '',
    parcela_valor: client?.parcela_valor ?? '',
    data_inicio: client?.data_inicio || '',
    proxima_assembleia: client?.proxima_assembleia || '',
    dia_vencimento: client?.dia_vencimento || '',
    situacao_cota: client?.situacao_cota || '',

    financeiro_status: client?.financeiro_status || 'em_dia',
    motivo_atraso: client?.motivo_atraso || '',
    intencao_continuar: client?.intencao_continuar || '',
    acordo_realizado: client?.acordo_realizado || '',
    data_promessa: client?.data_promessa || '',
    pagamento_compensado: client?.pagamento_compensado || false,
    data_compensacao: client?.data_compensacao || '',
    obs_atraso: client?.obs_atraso || '',

    responsavel_id: client?.responsavel_id || '',
    jornada: client?.jornada || 'novo_pos_venda',
    primeiro_contato: client?.primeiro_contato || '',
    onboarding_realizado: client?.onboarding_realizado || false,
    boas_vindas_realizada: client?.boas_vindas_realizada || false,
    cliente_orientado: client?.cliente_orientado || false,
    ultimo_contato: client?.ultimo_contato || '',
    proximo_contato: client?.proximo_contato || '',
    acompanhamento_status: client?.acompanhamento_status || 'novo',
    proxima_acao: client?.proxima_acao || '',
    obs_acompanhamento: client?.obs_acompanhamento || '',

    data_contemplacao: client?.data_contemplacao || '',
    tipo_contemplacao: client?.tipo_contemplacao || '',
    contemplacao_forma: client?.contemplacao_forma || '',
    status_documentacao: client?.status_documentacao || 'documentacao',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [tarefas, setTarefas] = useState([])
  const [tarefaModalOpen, setTarefaModalOpen] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState(null)

  const [historico, setHistorico] = useState([])
  const [novaObservacao, setNovaObservacao] = useState('')
  const [savingObs, setSavingObs] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleBrinde(key) {
    setForm((f) => ({
      ...f,
      brindes_prometidos: f.brindes_prometidos.includes(key)
        ? f.brindes_prometidos.filter((b) => b !== key)
        : [...f.brindes_prometidos, key],
    }))
  }

  function loadTarefas() {
    if (!isEdit) return
    supabase
      .from('tarefas')
      .select('*, responsavel:equipe(id, nome)')
      .eq('cliente_id', client.id)
      .order('data', { ascending: true })
      .then(({ data }) => setTarefas(data || []))
  }

  function loadHistorico() {
    if (!isEdit) return
    supabase
      .from('historico')
      .select('*')
      .eq('cliente_id', client.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHistorico(data || []))
  }

  useEffect(() => {
    if (tab === 'tarefas') loadTarefas()
    if (tab === 'historico') loadHistorico()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      setTab('dados')
      return
    }
    if (!isEdit && !form.cpf.trim()) {
      setError('CPF é obrigatório para novos clientes.')
      setTab('dados')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      cpf: form.cpf.trim() || null,
      email: form.email.trim() || null,
      data_nascimento: form.data_nascimento || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      endereco: form.endereco.trim() || null,
      obs_cliente: form.obs_cliente.trim() || null,
      brindes_prometidos: form.brindes_prometidos,
      brindes_data: form.brindes_data || null,
      vendedor_id: form.vendedor_id || null,
      data_venda: form.data_venda || null,
      origem_cliente: form.origem_cliente.trim() || null,
      valor_credito: form.valor_credito === '' ? null : form.valor_credito,
      obs_comerciais: form.obs_comerciais.trim() || null,
      plano: form.plano.trim() || null,
      marca: form.marca.trim() || null,
      prazo_grupo: form.prazo_grupo === '' ? null : form.prazo_grupo,
      parcela_valor: form.parcela_valor === '' ? null : form.parcela_valor,
      data_inicio: form.data_inicio || null,
      proxima_assembleia: form.proxima_assembleia || null,
      dia_vencimento: form.dia_vencimento === '' ? null : Number(form.dia_vencimento),
      situacao_cota: form.situacao_cota.trim() || null,
      motivo_atraso: form.motivo_atraso.trim() || null,
      intencao_continuar: form.intencao_continuar || null,
      acordo_realizado: form.acordo_realizado.trim() || null,
      data_promessa: form.data_promessa || null,
      data_compensacao: form.data_compensacao || null,
      obs_atraso: form.obs_atraso.trim() || null,
      responsavel_id: form.responsavel_id || null,
      primeiro_contato: form.primeiro_contato || null,
      ultimo_contato: form.ultimo_contato || null,
      proximo_contato: form.proximo_contato || null,
      proxima_acao: form.proxima_acao || null,
      obs_acompanhamento: form.obs_acompanhamento.trim() || null,
      data_contemplacao: form.data_contemplacao || null,
      tipo_contemplacao: form.tipo_contemplacao.trim() || null,
      contemplacao_forma: form.contemplacao_forma || null,
      status_documentacao: form.status_documentacao.trim() || null,
    }

    const query = isEdit
      ? supabase.from('clientes').update(payload).eq('id', client.id)
      : supabase.from('clientes').insert(payload)

    const { error: saveError } = await query

    setSaving(false)

    if (saveError) {
      if (saveError.message.includes('clientes_cpf')) {
        setError('Já existe um cliente cadastrado com esse CPF.')
      } else {
        setError(saveError.message)
      }
      return
    }

    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase.from('clientes').delete().eq('id', client.id)

    setDeleting(false)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    onDeleted()
  }

  async function handleAddObservacao() {
    if (!novaObservacao.trim()) return
    setSavingObs(true)

    const { error: obsError } = await supabase.from('historico').insert({
      cliente_id: client.id,
      tipo: 'observacao',
      descricao: novaObservacao.trim(),
    })

    setSavingObs(false)

    if (!obsError) {
      setNovaObservacao('')
      loadHistorico()
    }
  }

  const diasAtraso = isEdit ? calcularDiasAtraso({ ...client, ...form }) : null
  const assembleiaAjustada = form.proxima_assembleia ? proximoDiaUtil(form.proxima_assembleia) : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? client.nome : 'Cadastrar cliente'}</h2>
          <div className="modal-header-actions">
            {isEdit && (
              <button type="button" className="modal-delete-trigger" title="Excluir cliente" onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={16} />
              </button>
            )}
            <button className="modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {confirmingDelete && (
          <div className="modal-confirm-delete">
            <span>Excluir {client.nome}? Essa ação não pode ser desfeita.</span>
            <div className="modal-confirm-delete-actions">
              <button type="button" className="btn-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        )}

        <div className="modal-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`modal-tab${tab === t.key ? ' active' : ''}`}
              disabled={t.requerEdit && !isEdit}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {tab === 'dados' && (
            <>
              <label>
                Nome completo *
                <input value={form.nome} onChange={(e) => update('nome', e.target.value)} />
              </label>
              <div className="modal-form-row">
                <label>
                  CPF {!isEdit && '*'}
                  <input value={form.cpf} onChange={(e) => update('cpf', e.target.value)} placeholder="000.000.000-00" />
                </label>
                <label>
                  Telefone
                  <input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="(00) 90000-0000" />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  E-mail
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </label>
                <label>
                  Data de nascimento
                  <input type="date" value={form.data_nascimento} onChange={(e) => update('data_nascimento', e.target.value)} />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  Cidade
                  <input value={form.cidade} onChange={(e) => update('cidade', e.target.value)} />
                </label>
                <label>
                  Estado
                  <input value={form.estado} onChange={(e) => update('estado', e.target.value)} placeholder="UF" />
                </label>
              </div>
              <label>
                Endereço
                <input value={form.endereco} onChange={(e) => update('endereco', e.target.value)} />
              </label>
              <label>
                Brindes prometidos ao cliente
                <div className="etapa-stepper">
                  {BRINDES_OPCOES.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      className={`etapa-step${form.brindes_prometidos.includes(b.key) ? ' current' : ''}`}
                      onClick={() => toggleBrinde(b.key)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                Data combinada
                <input type="date" value={form.brindes_data} onChange={(e) => update('brindes_data', e.target.value)} />
              </label>
              <label>
                Observações
                <input value={form.obs_cliente} onChange={(e) => update('obs_cliente', e.target.value)} />
              </label>
            </>
          )}

          {tab === 'comercial' && (
            <>
              <label>
                Vendedor
                <select value={form.vendedor_id} onChange={(e) => update('vendedor_id', e.target.value)}>
                  <option value="">Sem vendedor</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-form-row">
                <label>
                  Data da venda
                  <input type="date" value={form.data_venda} onChange={(e) => update('data_venda', e.target.value)} />
                </label>
                <label>
                  Origem do cliente
                  <input
                    value={form.origem_cliente}
                    onChange={(e) => update('origem_cliente', e.target.value)}
                    list="origem-cliente-opcoes"
                    placeholder="Indicação, Instagram, WhatsApp..."
                  />
                  <datalist id="origem-cliente-opcoes">
                    <option value="Indicação" />
                    <option value="Instagram" />
                    <option value="WhatsApp" />
                    <option value="Anúncio" />
                    <option value="Evento" />
                  </datalist>
                </label>
              </div>
              <label>
                Observações comerciais
                <input value={form.obs_comerciais} onChange={(e) => update('obs_comerciais', e.target.value)} />
              </label>
            </>
          )}

          {tab === 'consorcio' && (
            <>
              <div className="modal-form-row">
                <label>
                  Proposta
                  <input value={form.proposta} onChange={(e) => update('proposta', e.target.value)} />
                </label>
                <label>
                  Grupo
                  <input value={form.grupo} onChange={(e) => update('grupo', e.target.value)} />
                </label>
                <label>
                  Cota
                  <input value={form.cota} onChange={(e) => update('cota', e.target.value)} />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  Marca
                  <input value={form.marca} onChange={(e) => update('marca', e.target.value)} />
                </label>
                <label>
                  Modelo contratado
                  <input value={form.modelo} onChange={(e) => update('modelo', e.target.value)} />
                </label>
                <label>
                  Plano
                  <input value={form.plano} onChange={(e) => update('plano', e.target.value)} />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  Valor da carta de crédito
                  <input type="number" step="0.01" value={form.valor_credito} onChange={(e) => update('valor_credito', e.target.value)} />
                </label>
                <label>
                  Valor da parcela
                  <input type="number" step="0.01" value={form.parcela_valor} onChange={(e) => update('parcela_valor', e.target.value)} />
                </label>
                <label>
                  Prazo (meses)
                  <input type="number" value={form.prazo_grupo} onChange={(e) => update('prazo_grupo', e.target.value)} />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  Dia de vencimento
                  <select value={form.dia_vencimento} onChange={(e) => update('dia_vencimento', e.target.value)}>
                    <option value="">—</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                  </select>
                </label>
                <label>
                  Data de início
                  <input type="date" value={form.data_inicio} onChange={(e) => update('data_inicio', e.target.value)} />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  Próxima assembleia
                  <input type="date" value={form.proxima_assembleia} onChange={(e) => update('proxima_assembleia', e.target.value)} />
                </label>
                <label>
                  Situação da cota
                  <input value={form.situacao_cota} onChange={(e) => update('situacao_cota', e.target.value)} />
                </label>
              </div>
              {assembleiaAjustada && (
                <div className="modal-hint">
                  Data efetiva (ajustada para dia útil): <strong>{formatarData(assembleiaAjustada)}</strong>
                </div>
              )}
            </>
          )}

          {tab === 'financeiro' && (
            <>
              <label>
                Status financeiro
                <select value={form.financeiro_status} onChange={(e) => update('financeiro_status', e.target.value)}>
                  <option value="em_dia">Em dia</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="acordo">Acordo</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="contemplado">Contemplado</option>
                </select>
              </label>
              {isEdit && (
                <div className="modal-hint">
                  Dias de atraso (calculado automaticamente): <strong>{diasAtraso ?? '—'}</strong>
                </div>
              )}

              <div className="modal-subsection">Rotina de inadimplência</div>
              <label>
                Motivo do atraso
                <input value={form.motivo_atraso} onChange={(e) => update('motivo_atraso', e.target.value)} />
              </label>
              <div className="modal-form-row">
                <label>
                  Intenção de continuar
                  <select value={form.intencao_continuar} onChange={(e) => update('intencao_continuar', e.target.value)}>
                    <option value="">—</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                    <option value="talvez">Talvez</option>
                    <option value="aguardando_retorno">Aguardando retorno</option>
                  </select>
                </label>
                <label>
                  Data da promessa
                  <input type="date" value={form.data_promessa} onChange={(e) => update('data_promessa', e.target.value)} />
                </label>
              </div>
              <label>
                Acordo realizado
                <input value={form.acordo_realizado} onChange={(e) => update('acordo_realizado', e.target.value)} />
              </label>
              <div className="modal-form-row">
                <label className="modal-checkbox">
                  <input
                    type="checkbox"
                    checked={form.pagamento_compensado}
                    onChange={(e) => update('pagamento_compensado', e.target.checked)}
                  />
                  Pagamento compensado
                </label>
                <label>
                  Data da compensação
                  <input type="date" value={form.data_compensacao} onChange={(e) => update('data_compensacao', e.target.value)} />
                </label>
              </div>
              <label>
                Observações sobre o atraso
                <input value={form.obs_atraso} onChange={(e) => update('obs_atraso', e.target.value)} />
              </label>
            </>
          )}

          {tab === 'acompanhamento' && (
            <>
              <label>
                Responsável pelo onboarding
                <select value={form.responsavel_id} onChange={(e) => update('responsavel_id', e.target.value)}>
                  <option value="">Sem responsável</option>
                  {responsaveisPosVendas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-form-row">
                <label>
                  Jornada
                  <select value={form.jornada} onChange={(e) => update('jornada', e.target.value)}>
                    <option value="novo_pos_venda">Novo pós-venda</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="contemplado">Contemplado</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </label>
                <label>
                  Status do acompanhamento
                  <select value={form.acompanhamento_status} onChange={(e) => update('acompanhamento_status', e.target.value)}>
                    <option value="novo">Novo</option>
                    <option value="em_acompanhamento">Em acompanhamento</option>
                    <option value="aguardando_cliente">Aguardando cliente</option>
                    <option value="pendencia">Pendência</option>
                    <option value="resolvido">Resolvido</option>
                    <option value="contemplado">Contemplado</option>
                    <option value="cancelamento">Cancelamento</option>
                    <option value="reversao">Reversão</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </label>
              </div>

              <div className="modal-form-row">
                <label className="modal-checkbox">
                  <input type="checkbox" checked={form.onboarding_realizado} onChange={(e) => update('onboarding_realizado', e.target.checked)} />
                  Onboarding realizado
                </label>
                <label className="modal-checkbox">
                  <input type="checkbox" checked={form.boas_vindas_realizada} onChange={(e) => update('boas_vindas_realizada', e.target.checked)} />
                  Boas-vindas realizadas
                </label>
                <label className="modal-checkbox">
                  <input type="checkbox" checked={form.cliente_orientado} onChange={(e) => update('cliente_orientado', e.target.checked)} />
                  Cliente orientado
                </label>
              </div>

              <div className="modal-form-row">
                <label>
                  Primeiro contato
                  <input type="date" value={form.primeiro_contato} onChange={(e) => update('primeiro_contato', e.target.value)} />
                </label>
                <label>
                  Último contato
                  <input type="date" value={form.ultimo_contato} onChange={(e) => update('ultimo_contato', e.target.value)} />
                </label>
                <label>
                  Próximo contato
                  <input type="date" value={form.proximo_contato} onChange={(e) => update('proximo_contato', e.target.value)} />
                </label>
              </div>

              <label>
                Próxima ação
                <input
                  value={form.proxima_acao}
                  onChange={(e) => update('proxima_acao', e.target.value)}
                  placeholder="Ex: Ligar para confirmar documentos"
                />
              </label>
              <label>
                Observações
                <input value={form.obs_acompanhamento} onChange={(e) => update('obs_acompanhamento', e.target.value)} />
              </label>
            </>
          )}

          {tab === 'contemplacao' && (
            <>
              <div className="modal-form-row">
                <label>
                  Data da contemplação
                  <input type="date" value={form.data_contemplacao} onChange={(e) => update('data_contemplacao', e.target.value)} />
                </label>
                <label>
                  Tipo de contemplação
                  <input value={form.tipo_contemplacao} onChange={(e) => update('tipo_contemplacao', e.target.value)} />
                </label>
              </div>
              <div className="modal-form-row">
                <label>
                  Lance ou sorteio
                  <select value={form.contemplacao_forma} onChange={(e) => update('contemplacao_forma', e.target.value)}>
                    <option value="">—</option>
                    <option value="lance">Lance</option>
                    <option value="sorteio">Sorteio</option>
                  </select>
                </label>
                <label>
                  Etapa da pós-contemplação
                  <select value={form.status_documentacao} onChange={(e) => update('status_documentacao', e.target.value)}>
                    <option value="documentacao">Em documentação</option>
                    <option value="carta_liberada">Carta liberada para uso</option>
                    <option value="concluido">Processo concluído</option>
                  </select>
                </label>
              </div>
              <div className="modal-hint">
                Crédito, modelo/moto e responsável já estão nas abas Comercial e Onboarding. Marque o Status
                financeiro como "Contemplado" na aba Financeiro para sinalizar o cliente no sistema.
              </div>
            </>
          )}

          {tab === 'tarefas' && isEdit && (
            <div className="modal-subtab-content">
              <button
                type="button"
                className="btn-secondary modal-subtab-add"
                onClick={() => {
                  setEditingTarefa(null)
                  setTarefaModalOpen(true)
                }}
              >
                <Plus size={14} /> Nova tarefa
              </button>

              {tarefas.length === 0 ? (
                <div className="table-empty">Nenhuma tarefa para este cliente.</div>
              ) : (
                <div className="tarefas-list">
                  {tarefas.map((t) => (
                    <div
                      className="tarefa-row"
                      key={t.id}
                      onClick={() => {
                        setEditingTarefa(t)
                        setTarefaModalOpen(true)
                      }}
                    >
                      <span className="tarefa-prioridade" style={{ background: PRIORIDADE_COLOR[t.prioridade] }} />
                      <div className="tarefa-info">
                        <div className="tarefa-titulo">{t.titulo}</div>
                        <div className="tarefa-meta">
                          {t.responsavel?.nome || 'Sem responsável'} · {formatarData(t.data)}
                        </div>
                      </div>
                      <span className={`badge ${t.status === 'concluida' ? 'badge-green' : t.status === 'cancelada' ? 'badge-neutral' : 'badge-orange'}`}>
                        {TAREFA_STATUS_LABELS[t.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'historico' && isEdit && (
            <div className="modal-subtab-content">
              <div className="modal-form-row modal-obs-add">
                <input
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Registrar uma observação no histórico..."
                />
                <button type="button" className="btn-secondary" onClick={handleAddObservacao} disabled={savingObs}>
                  {savingObs ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>

              {historico.length === 0 ? (
                <div className="table-empty">Nenhum registro no histórico ainda.</div>
              ) : (
                <div className="historico-list">
                  {historico.map((h) => (
                    <div className="historico-item" key={h.id}>
                      <div className="historico-data">{formatarData(h.created_at?.slice(0, 10))}</div>
                      <div className="historico-descricao">
                        {h.tipo === 'auditoria' && <span className="badge badge-neutral" style={{ marginRight: 8 }}>AUDITORIA</span>}
                        {h.descricao}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="modal-error">{error}</div>}

          {!['tarefas', 'historico'].includes(tab) && (
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </form>
      </div>

      {tarefaModalOpen && (
        <TarefaModal
          tarefa={editingTarefa}
          clientes={[]}
          responsaveis={responsaveisPosVendas}
          presetClienteId={client.id}
          onClose={() => setTarefaModalOpen(false)}
          onSaved={() => {
            setTarefaModalOpen(false)
            loadTarefas()
          }}
          onDeleted={() => {
            setTarefaModalOpen(false)
            loadTarefas()
          }}
        />
      )}

    </div>
  )
}
