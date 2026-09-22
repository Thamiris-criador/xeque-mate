import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function ReversaoModal({ reversao, clientes, responsaveis, presetClienteId, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(reversao)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    cliente_id: reversao?.cliente_id || presetClienteId || '',
    responsavel_id: reversao?.responsavel_id || '',
    motivo_cancelamento: reversao?.motivo_cancelamento || '',
    data_pedido: reversao?.data_pedido || new Date().toISOString().slice(0, 10),
    data_contato: reversao?.data_contato || '',
    status: reversao?.status || 'nao_trabalhado',
    estrategia: reversao?.estrategia || '',
    resultado: reversao?.resultado || '',
    observacoes: reversao?.observacoes || '',
    data_reversao: reversao?.data_reversao || '',
    comprovante: reversao?.comprovante || '',
    valor_bonificacao: reversao?.valor_bonificacao ?? 50,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cliente_id) {
      setError('Selecione o cliente.')
      return
    }
    if (form.status === 'revertido' && !form.data_reversao) {
      setError('Status "Revertido" exige registro da data da reversão (só usar quando for real e comprovado).')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      cliente_id: form.cliente_id,
      responsavel_id: form.responsavel_id || null,
      motivo_cancelamento: form.motivo_cancelamento.trim() || null,
      data_pedido: form.data_pedido || null,
      data_contato: form.data_contato || null,
      status: form.status,
      estrategia: form.estrategia.trim() || null,
      resultado: form.resultado.trim() || null,
      observacoes: form.observacoes.trim() || null,
      data_reversao: form.data_reversao || null,
      comprovante: form.comprovante.trim() || null,
      valor_bonificacao: form.valor_bonificacao === '' ? null : form.valor_bonificacao,
    }

    const query = isEdit
      ? supabase.from('reversoes').update(payload).eq('id', reversao.id)
      : supabase.from('reversoes').insert(payload)

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
    const { error: deleteError } = await supabase.from('reversoes').delete().eq('id', reversao.id)
    setDeleting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onDeleted()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar reversão' : 'Nova reversão'}</h2>
          <div className="modal-header-actions">
            {isEdit && (
              <button type="button" className="modal-delete-trigger" title="Excluir" onClick={() => setConfirmingDelete(true)}>
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
            <span>Excluir este registro de reversão?</span>
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

        <form className="modal-form" onSubmit={handleSubmit}>
          {!presetClienteId && (
            <label>
              Cliente *
              <select value={form.cliente_id} onChange={(e) => update('cliente_id', e.target.value)}>
                <option value="">Selecione</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Responsável
            <select value={form.responsavel_id} onChange={(e) => update('responsavel_id', e.target.value)}>
              <option value="">Sem responsável</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            Motivo do cancelamento
            <input value={form.motivo_cancelamento} onChange={(e) => update('motivo_cancelamento', e.target.value)} />
          </label>

          <div className="modal-form-row">
            <label>
              Data do pedido
              <input type="date" value={form.data_pedido} onChange={(e) => update('data_pedido', e.target.value)} />
            </label>
            <label>
              Data do contato
              <input type="date" value={form.data_contato} onChange={(e) => update('data_contato', e.target.value)} />
            </label>
          </div>

          <label>
            Status
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="nao_trabalhado">Não trabalhado</option>
              <option value="em_contato">Em contato</option>
              <option value="demonstrou_interesse">Demonstrou interesse</option>
              <option value="em_negociacao">Em negociação</option>
              <option value="revertido">Revertido</option>
              <option value="sem_interesse">Sem interesse</option>
            </select>
          </label>

          <label>
            Estratégia utilizada
            <input value={form.estrategia} onChange={(e) => update('estrategia', e.target.value)} />
          </label>
          <label>
            Resultado
            <input value={form.resultado} onChange={(e) => update('resultado', e.target.value)} />
          </label>
          <label>
            Observações
            <input value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} />
          </label>

          <div className="modal-form-row">
            <label>
              Data da reversão
              <input type="date" value={form.data_reversao} onChange={(e) => update('data_reversao', e.target.value)} />
            </label>
            <label>
              Comprovante/registro
              <input value={form.comprovante} onChange={(e) => update('comprovante', e.target.value)} />
            </label>
          </div>

          <label>
            Valor da bonificação (R$)
            <input type="number" step="0.01" value={form.valor_bonificacao} onChange={(e) => update('valor_bonificacao', e.target.value)} />
          </label>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
