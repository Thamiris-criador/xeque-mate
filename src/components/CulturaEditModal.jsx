import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function CulturaEditModal({ conteudo, onClose, onSaved }) {
  const [form, setForm] = useState({
    missao: conteudo?.missao || '',
    visao: conteudo?.visao || '',
    valores: conteudo?.valores || '',
    cultura: conteudo?.cultura || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: saveError } = await supabase
      .from('cultura_conteudo')
      .upsert({ id: 1, ...form, updated_at: new Date().toISOString() })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar conteúdo</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="modal-error">{error}</div>}

          <label>
            Missão
            <textarea rows={3} value={form.missao} onChange={(e) => update('missao', e.target.value)} />
          </label>
          <label>
            Visão
            <textarea rows={3} value={form.visao} onChange={(e) => update('visao', e.target.value)} />
          </label>
          <label>
            Valores
            <textarea rows={3} value={form.valores} onChange={(e) => update('valores', e.target.value)} />
          </label>
          <label>
            Cultura
            <textarea rows={3} value={form.cultura} onChange={(e) => update('cultura', e.target.value)} />
          </label>

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
