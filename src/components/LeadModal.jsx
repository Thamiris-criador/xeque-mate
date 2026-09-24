import { useEffect, useState } from 'react'
import { X, Trash2, Plus, ArrowRightCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import {
  CANAIS_ORIGEM, LEAD_STATUS_LABELS, LEAD_TEMPERATURA_LABELS, TIPOS_CONTATO_LEAD,
  formatarData,
} from '../lib/negocio.js'
import './ClientModal.css'

const TABS = [
  { key: 'dados', label: 'Dados do lead' },
  { key: 'historico', label: 'Histórico de contato', requerEdit: true },
]

export default function LeadModal({ lead, vendedores, responsaveisPosVendas, onClose, onSaved, onDeleted, onConverted }) {
  const isEdit = Boolean(lead)
  const [tab, setTab] = useState('dados')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [duplicado, setDuplicado] = useState(null)
  const [confirmarMesmoAssim, setConfirmarMesmoAssim] = useState(false)

  const [form, setForm] = useState({
    nome: lead?.nome || '',
    whatsapp: lead?.whatsapp || '',
    cpf: lead?.cpf || '',
    data_entrada: lead?.data_entrada || new Date().toISOString().slice(0, 10),
    vendedor_id: lead?.vendedor_id || '',
    canal_origem: lead?.canal_origem || '',
    modelo_interesse: lead?.modelo_interesse || '',
    plano_interesse: lead?.plano_interesse || '',
    valor_bem: lead?.valor_bem ?? '',
    parcela_desejada: lead?.parcela_desejada ?? '',
    status: lead?.status || 'novo',
    temperatura: lead?.temperatura || 'morno',
    proxima_acao: lead?.proxima_acao || '',
    proximo_contato: lead?.proximo_contato || '',
    observacoes: lead?.observacoes || '',
  })

  const [historico, setHistorico] = useState([])
  const [novoContato, setNovoContato] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo_contato: 'WhatsApp',
    observacao: '',
    resultado: '',
    proxima_acao: '',
    proximo_contato: '',
  })
  const [savingContato, setSavingContato] = useState(false)

  const [convertendo, setConvertendo] = useState(false)
  const [responsavelConversao, setResponsavelConversao] = useState('')
  const [confirmandoConversao, setConfirmandoConversao] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'whatsapp') {
      setDuplicado(null)
      setConfirmarMesmoAssim(false)
    }
  }

  function loadHistorico() {
    if (!isEdit) return
    supabase
      .from('leads_historico')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHistorico(data || []))
  }

  useEffect(() => {
    if (tab === 'historico') loadHistorico()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function checarDuplicidade() {
    const whatsapp = form.whatsapp.trim()
    const cpf = form.cpf.trim()
    if (!whatsapp && !cpf) return null

    const { data: existe, error: rpcError } = await supabase.rpc('check_duplicidade_contato', {
      p_whatsapp: whatsapp || null,
      p_cpf: cpf || null,
    })

    if (rpcError) return null
    return existe ? { encontrado: true } : null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    if (!isEdit && !confirmarMesmoAssim) {
      const encontrado = await checarDuplicidade()
      if (encontrado) {
        setDuplicado(encontrado)
        return
      }
    }

    setSaving(true)
    setError(null)

    const payload = {
      nome: form.nome.trim(),
      whatsapp: form.whatsapp.trim() || null,
      cpf: form.cpf.trim() || null,
      data_entrada: form.data_entrada,
      vendedor_id: form.vendedor_id || null,
      canal_origem: form.canal_origem || null,
      modelo_interesse: form.modelo_interesse.trim() || null,
      plano_interesse: form.plano_interesse.trim() || null,
      valor_bem: form.valor_bem === '' ? null : form.valor_bem,
      parcela_desejada: form.parcela_desejada === '' ? null : form.parcela_desejada,
      status: form.status,
      temperatura: form.temperatura,
      proxima_acao: form.proxima_acao.trim() || null,
      proximo_contato: form.proximo_contato || null,
      observacoes: form.observacoes.trim() || null,
    }

    const query = isEdit
      ? supabase.from('leads').update(payload).eq('id', lead.id)
      : supabase.from('leads').insert(payload)

    const { error: saveError } = await query

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id)
    setDeleting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onDeleted()
  }

  async function handleAddContato() {
    if (!novoContato.observacao.trim() && !novoContato.resultado.trim()) return
    setSavingContato(true)
    setError(null)

    const { error: contatoError } = await supabase.from('leads_historico').insert({
      lead_id: lead.id,
      data: novoContato.data,
      tipo_contato: novoContato.tipo_contato,
      observacao: novoContato.observacao.trim() || null,
      resultado: novoContato.resultado.trim() || null,
      proxima_acao: novoContato.proxima_acao.trim() || null,
      proximo_contato: novoContato.proximo_contato || null,
    })

    if (contatoError) {
      setSavingContato(false)
      setError(contatoError.message)
      return
    }

    // Mantém o lead sincronizado com o último combinado
    const atualizacaoLead = {}
    if (novoContato.proxima_acao.trim()) atualizacaoLead.proxima_acao = novoContato.proxima_acao.trim()
    if (novoContato.proximo_contato) atualizacaoLead.proximo_contato = novoContato.proximo_contato
    if (Object.keys(atualizacaoLead).length > 0) {
      await supabase.from('leads').update(atualizacaoLead).eq('id', lead.id)
    }

    // Data futura de retorno → cria tarefa automaticamente na área Tarefas já existente
    if (novoContato.proximo_contato) {
      await supabase.from('tarefas').insert({
        lead_id: lead.id,
        titulo: `Retorno: ${lead.nome}`,
        descricao: novoContato.proxima_acao.trim() || null,
        responsavel_id: lead.vendedor_id || null,
        data: novoContato.proximo_contato,
        prioridade: 'amarelo',
        status: 'pendente',
        categoria: 'Comercial',
      })
    }

    setSavingContato(false)
    setNovoContato({
      data: new Date().toISOString().slice(0, 10),
      tipo_contato: 'WhatsApp',
      observacao: '',
      resultado: '',
      proxima_acao: '',
      proximo_contato: '',
    })
    loadHistorico()
  }

  async function handleConverter() {
    if (!responsavelConversao) {
      setError('Escolha o responsável de Pós-Vendas que vai cuidar do onboarding.')
      return
    }

    setConvertendo(true)
    setError(null)

    const payloadCliente = {
      nome: lead.nome,
      whatsapp: lead.whatsapp || null,
      cpf: lead.cpf || null,
      vendedor_id: lead.vendedor_id || null,
      responsavel_id: responsavelConversao,
      origem_cliente: lead.canal_origem || null,
      modelo: lead.modelo_interesse || null,
      plano: lead.plano_interesse || null,
      valor_credito: lead.valor_bem || null,
      parcela_valor: lead.parcela_desejada || null,
      obs_comerciais: lead.observacoes || null,
      data_venda: new Date().toISOString().slice(0, 10),
    }

    const { data: novoCliente, error: clienteError } = await supabase
      .from('clientes')
      .insert(payloadCliente)
      .select('id')
      .single()

    if (clienteError) {
      setConvertendo(false)
      setError('Não foi possível criar o cliente: ' + clienteError.message)
      return
    }

    if (historico.length > 0) {
      const registros = historico.map((h) => ({
        cliente_id: novoCliente.id,
        tipo: 'comercial',
        descricao: [h.tipo_contato, h.observacao, h.resultado].filter(Boolean).join(' — '),
      }))
      await supabase.from('historico').insert(registros)
    }

    await supabase.from('leads').update({ cliente_id: novoCliente.id, convertido: true, status: 'fechado' }).eq('id', lead.id)

    setConvertendo(false)
    onConverted()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? lead.nome : 'Novo lead'}</h2>
          <div className="modal-header-actions">
            {isEdit && (
              <button type="button" className="modal-delete-trigger" title="Excluir lead" onClick={() => setConfirmingDelete(true)}>
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
            <span>Excluir {lead.nome}? Essa ação não pode ser desfeita.</span>
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

        {isEdit && !lead.convertido && (
          <div style={{ padding: '0 24px 12px' }}>
            {!confirmandoConversao ? (
              <button type="button" className="btn-secondary" onClick={() => setConfirmandoConversao(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowRightCircle size={16} /> Converter em cliente
              </button>
            ) : (
              <div className="modal-confirm-delete">
                <span>Escolha o responsável de Pós-Vendas — isso já cria as tarefas de onboarding.</span>
                <div className="modal-confirm-delete-actions">
                  <select value={responsavelConversao} onChange={(e) => setResponsavelConversao(e.target.value)}>
                    <option value="">Selecione...</option>
                    {responsaveisPosVendas.map((r) => (
                      <option key={r.id} value={r.id}>{r.nome}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary" onClick={() => setConfirmandoConversao(false)} disabled={convertendo}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-primary" onClick={handleConverter} disabled={convertendo}>
                    {convertendo ? 'Convertendo...' : 'Confirmar conversão'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {isEdit && lead.convertido && (
          <div className="modal-hint" style={{ margin: '0 24px 12px' }}>
            Já convertido em cliente — veja em Clientes.
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
                Nome *
                <input value={form.nome} onChange={(e) => update('nome', e.target.value)} />
              </label>
              <div className="modal-form-row">
                <label>
                  Telefone/WhatsApp
                  <input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="(00) 90000-0000" />
                </label>
                <label>
                  CPF
                  <input value={form.cpf} onChange={(e) => update('cpf', e.target.value)} />
                </label>
              </div>

              {duplicado && (
                <div className="modal-error">
                  Já existe um cadastro (lead ou cliente) com esse telefone/CPF em outro lugar do sistema — pode ser
                  na carteira de outra vendedora.
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn-secondary" onClick={() => { setConfirmarMesmoAssim(true); setDuplicado(null) }}>
                      Cadastrar mesmo assim
                    </button>
                  </div>
                </div>
              )}

              <div className="modal-form-row">
                <label>
                  Data de entrada
                  <input type="date" value={form.data_entrada} onChange={(e) => update('data_entrada', e.target.value)} />
                </label>
                <label>
                  Vendedor responsável
                  <select value={form.vendedor_id} onChange={(e) => update('vendedor_id', e.target.value)}>
                    <option value="">Sem vendedor</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Canal de origem
                <select value={form.canal_origem} onChange={(e) => update('canal_origem', e.target.value)}>
                  <option value="">—</option>
                  {CANAIS_ORIGEM.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <div className="modal-form-row">
                <label>
                  Modelo/bem de interesse
                  <input value={form.modelo_interesse} onChange={(e) => update('modelo_interesse', e.target.value)} />
                </label>
                <label>
                  Plano de interesse
                  <input value={form.plano_interesse} onChange={(e) => update('plano_interesse', e.target.value)} />
                </label>
              </div>

              <div className="modal-form-row">
                <label>
                  Valor do bem
                  <input type="number" step="0.01" value={form.valor_bem} onChange={(e) => update('valor_bem', e.target.value)} />
                </label>
                <label>
                  Parcela desejada
                  <input type="number" step="0.01" value={form.parcela_desejada} onChange={(e) => update('parcela_desejada', e.target.value)} />
                </label>
              </div>

              <div className="modal-form-row">
                <label>
                  Status
                  <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                    {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Temperatura
                  <select value={form.temperatura} onChange={(e) => update('temperatura', e.target.value)}>
                    {Object.entries(LEAD_TEMPERATURA_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="modal-form-row">
                <label>
                  Próxima ação
                  <input value={form.proxima_acao} onChange={(e) => update('proxima_acao', e.target.value)} />
                </label>
                <label>
                  Data do próximo contato
                  <input type="date" value={form.proximo_contato} onChange={(e) => update('proximo_contato', e.target.value)} />
                </label>
              </div>

              <label>
                Observações
                <input value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} />
              </label>
            </>
          )}

          {tab === 'historico' && isEdit && (
            <div className="modal-subtab-content">
              <div className="modal-subsection">Registrar contato</div>
              <div className="modal-form-row">
                <label>
                  Data
                  <input type="date" value={novoContato.data} onChange={(e) => setNovoContato((n) => ({ ...n, data: e.target.value }))} />
                </label>
                <label>
                  Tipo de contato
                  <select value={novoContato.tipo_contato} onChange={(e) => setNovoContato((n) => ({ ...n, tipo_contato: e.target.value }))}>
                    {TIPOS_CONTATO_LEAD.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Observação
                <input value={novoContato.observacao} onChange={(e) => setNovoContato((n) => ({ ...n, observacao: e.target.value }))} />
              </label>
              <label>
                Resultado
                <input value={novoContato.resultado} onChange={(e) => setNovoContato((n) => ({ ...n, resultado: e.target.value }))} />
              </label>
              <div className="modal-form-row">
                <label>
                  Próxima ação
                  <input value={novoContato.proxima_acao} onChange={(e) => setNovoContato((n) => ({ ...n, proxima_acao: e.target.value }))} />
                </label>
                <label>
                  Data do próximo contato
                  <input type="date" value={novoContato.proximo_contato} onChange={(e) => setNovoContato((n) => ({ ...n, proximo_contato: e.target.value }))} />
                </label>
              </div>
              <button type="button" className="btn-secondary modal-subtab-add" onClick={handleAddContato} disabled={savingContato}>
                <Plus size={14} /> {savingContato ? 'Salvando...' : 'Registrar contato'}
              </button>
              {novoContato.proximo_contato && (
                <div className="modal-hint">Isso já vai criar uma tarefa de retorno em Tarefas, na data escolhida.</div>
              )}

              <div className="modal-subsection" style={{ marginTop: 18 }}>Histórico</div>
              {historico.length === 0 ? (
                <div className="table-empty">Nenhum contato registrado ainda.</div>
              ) : (
                <div className="historico-list">
                  {historico.map((h) => (
                    <div className="historico-item" key={h.id}>
                      <div className="historico-data">{formatarData(h.data)}</div>
                      <div className="historico-descricao">
                        <strong>{h.tipo_contato}</strong>
                        {h.observacao && ` — ${h.observacao}`}
                        {h.resultado && ` · Resultado: ${h.resultado}`}
                        {h.proxima_acao && ` · Próxima ação: ${h.proxima_acao}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="modal-error">{error}</div>}

          {tab === 'dados' && (
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : confirmarMesmoAssim ? 'Cadastrar mesmo assim' : 'Salvar'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
