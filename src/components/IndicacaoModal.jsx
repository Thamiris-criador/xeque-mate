import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function IndicacaoModal({ indicacao, clientes, responsaveis, presetClienteId, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(indicacao)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    cliente_id: indicacao?.cliente_id || presetClienteId || '',
    data_pedido: indicacao?.data_pedido || new Date().toISOString().slice(0, 10),
    pessoa_indicada: indicacao?.pessoa_indicada || '',
    telefone_indicacao: indicacao?.telefone_indicacao || '',
    status: indicacao?.status || 'solicitada',
    responsavel_id: indicacao?.responsavel_id || '',
    observacoes: indicacao?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cliente_id) {
      setError('Selecione o cliente que indicou.')
      return
    }
    if (!form.pessoa_indicada.trim()) {
      setError('Informe o nome da pessoa indicada.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      cliente_id: form.cliente_id,
      data_pedido: form.data_pedido || null,
      pessoa_indicada: form.pessoa_indicada.trim(),
      telefone_indicacao: form.telefone_indicacao.trim() || null,
      status: form.status,
      responsavel_id: form.responsavel_id || null,
      observacoes: form.observacoes.trim() || null,
    }

    const query = isEdit
      ? supabase.from('indicacoes').update(payload).eq('id', indicacao.id)
      : supabase.from('indicacoes').insert(payload)

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
    const { error: deleteError } = await supabase.from('indicacoes').delete().eq('id', indicacao.id)
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
          <h2>{isEdit ? 'Editar indicação' : 'Solicitar indicação'}</h2>
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
            <span>Excluir este registro de indicação?</span>
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
              Cliente que indicou *
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

          <div className="modal-form-row">
            <label>
              Pessoa indicada *
              <input value={form.pessoa_indicada} onChange={(e) => update('pessoa_indicada', e.target.value)} />
            </label>
            <label>
              Telefone da indicação
              <input value={form.telefone_indicacao} onChange={(e) => update('telefone_indicacao', e.target.value)} />
            </label>
          </div>

          <div className="modal-form-row">
            <label>
              Data do pedido
              <input type="date" value={form.data_pedido} onChange={(e) => update('data_pedido', e.target.value)} />
            </label>
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
          </div>

          <label>
            Status
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option value="solicitada">Solicitada</option>
              <option value="recebida">Recebida</option>
              <option value="em_contato">Em contato</option>
              <option value="oportunidade">Oportunidade</option>
              <option value="convertida">Convertida</option>
              <option value="sem_interesse">Sem interesse</option>
            </select>
          </label>

          <label>
            Observações
            <input value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} />
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
