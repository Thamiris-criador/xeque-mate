import { useState } from 'react'
import { X, Trash2, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function PlaybookItemModal({ item, area, onClose, onSaved, onDeleted }) {
  const isEdit = Boolean(item)
  const [form, setForm] = useState({
    titulo: item?.titulo || '',
    descricao: item?.descricao || '',
    arquivo_url: item?.arquivo_url || '',
    arquivo_nome: item?.arquivo_nome || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleArquivoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const caminho = `${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('playbook-arquivos').upload(caminho, file, { upsert: true })

    setUploading(false)

    if (uploadError) {
      setError('Não foi possível enviar o anexo: ' + uploadError.message)
      return
    }

    const { data } = supabase.storage.from('playbook-arquivos').getPublicUrl(caminho)
    update('arquivo_url', data.publicUrl)
    update('arquivo_nome', file.name)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setError('Título é obrigatório.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      arquivo_url: form.arquivo_url || null,
      arquivo_nome: form.arquivo_nome || null,
      area: item?.area || area,
    }

    const query = isEdit
      ? supabase.from('playbook_itens').update(payload).eq('id', item.id)
      : supabase.from('playbook_itens').insert(payload)

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

    const { error: deleteError } = await supabase.from('playbook_itens').delete().eq('id', item.id)

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
          <h2>{isEdit ? 'Editar item' : 'Novo item do playbook'}</h2>
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
            <span>Excluir "{item.titulo}"? Essa ação não pode ser desfeita.</span>
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
            <input value={form.titulo} onChange={(e) => update('titulo', e.target.value)} placeholder="Ex: Treinamento de onboarding, Ata da reunião de 20/09..." />
          </label>

          <label>
            Descrição
            <textarea rows={4} value={form.descricao} onChange={(e) => update('descricao', e.target.value)} />
          </label>

          <label>
            Anexo
            <input type="file" onChange={handleArquivoChange} disabled={uploading} />
          </label>
          {form.arquivo_nome && (
            <div className="modal-hint">
              <Paperclip size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {form.arquivo_nome} {uploading && '· enviando...'}
            </div>
          )}

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || uploading}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
