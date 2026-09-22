import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function TarefaModal({ tarefa, clientes, responsaveis, presetClienteId, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(tarefa)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    titulo: tarefa?.titulo || '',
    descricao: tarefa?.descricao || '',
    cliente_id: tarefa?.cliente_id || presetClienteId || '',
    responsavel_id: tarefa?.responsavel_id || '',
    data: tarefa?.data || new Date().toISOString().slice(0, 10),
    horario: tarefa?.horario || '',
    prioridade: tarefa?.prioridade || 'verde',
    status: tarefa?.status || 'pendente',
    categoria: tarefa?.categoria || '',
    observacao: tarefa?.observacao || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.data) {
      setError('Título e data são obrigatórios.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      cliente_id: form.cliente_id || null,
      responsavel_id: form.responsavel_id || null,
      data: form.data,
      horario: form.horario || null,
      prioridade: form.prioridade,
      status: form.status,
      categoria: form.categoria.trim() || null,
      observacao: form.observacao.trim() || null,
      data_conclusao: form.status === 'concluida' ? (tarefa?.data_conclusao || new Date().toISOString().slice(0, 10)) : null,
    }

    const query = isEdit
      ? supabase.from('tarefas').update(payload).eq('id', tarefa.id)
      : supabase.from('tarefas').insert(payload)

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

    const { error: deleteError } = await supabase.from('tarefas').delete().eq('id', tarefa.id)

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
          <h2>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>
          <div className="modal-header-actions">
            {isEdit && (
              <button
                type="button"
                className="modal-delete-trigger"
                title="Excluir tarefa"
                onClick={() => setConfirmingDelete(true)}
              >
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
            <span>Excluir esta tarefa? Essa ação não pode ser desfeita.</span>
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
          <label>
            Título *
            <input value={form.titulo} onChange={(e) => update('titulo', e.target.value)} />
          </label>

          <label>
            Descrição
            <input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} />
          </label>

          {!presetClienteId && (
            <label>
              Cliente
              <select value={form.cliente_id} onChange={(e) => update('cliente_id', e.target.value)}>
                <option value="">Sem cliente vinculado</option>
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

          <div className="modal-form-row">
            <label>
              Data *
              <input type="date" value={form.data} onChange={(e) => update('data', e.target.value)} />
            </label>
            <label>
              Horário
              <input type="time" value={form.horario} onChange={(e) => update('horario', e.target.value)} />
            </label>
          </div>

          <div className="modal-form-row">
            <label>
              Prioridade
              <select value={form.prioridade} onChange={(e) => update('prioridade', e.target.value)}>
                <option value="vermelho">Vermelho (crítica)</option>
                <option value="amarelo">Amarelo (importante)</option>
                <option value="verde">Verde (normal)</option>
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
          </div>

          <label>
            Categoria
            <input
              value={form.categoria}
              onChange={(e) => update('categoria', e.target.value)}
              placeholder="Ex: Boleto, Onboarding, Relacionamento"
            />
          </label>

          <label>
            Observação
            <input value={form.observacao} onChange={(e) => update('observacao', e.target.value)} />
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
