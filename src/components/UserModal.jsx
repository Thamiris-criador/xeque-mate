import { useState } from 'react'
import { X, Trash2, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function UserModal({ membro, onClose, onCreated, onSaved, onDeleted }) {
  const isEdit = Boolean(membro)
  const [form, setForm] = useState({
    nome: membro?.nome || '',
    email: membro?.email || '',
    senha: '',
    cargo: membro?.cargo || '',
    area: membro?.area || 'Pós-Vendas',
    foto_url: membro?.foto_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFoto(true)
    setError(null)

    const extensao = file.name.split('.').pop()
    const caminho = `${membro?.id || 'novo'}-${Date.now()}.${extensao}`

    const { error: uploadError } = await supabase.storage.from('equipe-fotos').upload(caminho, file, { upsert: true })

    setUploadingFoto(false)

    if (uploadError) {
      setError('Não foi possível enviar a foto: ' + uploadError.message)
      return
    }

    const { data } = supabase.storage.from('equipe-fotos').getPublicUrl(caminho)
    update('foto_url', data.publicUrl)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (isEdit) {
      if (!form.nome.trim()) {
        setError('Nome é obrigatório.')
        return
      }

      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('equipe')
        .update({
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          cargo: form.cargo.trim() || null,
          area: form.area,
          foto_url: form.foto_url || null,
        })
        .eq('id', membro.id)

      setSaving(false)

      if (updateError) {
        setError(updateError.message)
        return
      }

      onSaved()
      return
    }

    if (!form.nome.trim() || !form.email.trim() || !form.senha) {
      setError('Nome, e-mail e senha são obrigatórios.')
      return
    }
    if (form.senha.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setSaving(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('create-user', {
      body: {
        nome: form.nome.trim(),
        email: form.email.trim(),
        password: form.senha,
        cargo: form.cargo.trim() || null,
        area: form.area,
      },
    })

    setSaving(false)

    if (fnError) {
      setError('Não foi possível criar o usuário. Verifique se a função "create-user" está publicada no Supabase.')
      return
    }
    if (data?.error) {
      setError(data.error)
      return
    }

    onCreated()
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase.from('equipe').delete().eq('id', membro.id)

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
          <h2>{isEdit ? membro.nome : 'Novo usuário'}</h2>
          <div className="modal-header-actions">
            {isEdit && (
              <button type="button" className="modal-delete-trigger" title="Excluir usuário" onClick={() => setConfirmingDelete(true)}>
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
            <span>Excluir {membro.nome}? Essa ação não pode ser desfeita.</span>
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
          {isEdit && (
            <label>
              Foto
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="equipe-avatar" style={{ overflow: 'hidden' }}>
                  {form.foto_url ? (
                    <img src={form.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserRound size={18} />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleFotoChange} disabled={uploadingFoto} />
                {uploadingFoto && <span className="modal-hint">Enviando...</span>}
              </div>
            </label>
          )}

          <label>
            Nome *
            <input value={form.nome} onChange={(e) => update('nome', e.target.value)} />
          </label>

          <label>
            E-mail {isEdit ? '' : '(login) *'}
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="pessoa@empresa.com"
              disabled={isEdit && Boolean(membro.email)}
            />
          </label>
          {isEdit && membro.email && (
            <div className="modal-hint">
              O e-mail de login não é alterado por aqui. Isso só muda o cadastro na equipe.
            </div>
          )}

          {!isEdit && (
            <label>
              Senha *
              <input
                type="password"
                value={form.senha}
                onChange={(e) => update('senha', e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </label>
          )}

          <div className="modal-form-row">
            <label>
              Cargo
              <input value={form.cargo} onChange={(e) => update('cargo', e.target.value)} />
            </label>
            <label>
              Área
              <select value={form.area} onChange={(e) => update('area', e.target.value)}>
                <option value="Liderança">Liderança</option>
                <option value="Comercial">Comercial</option>
                <option value="Pós-Vendas">Pós-Vendas</option>
                <option value="Financeiro">Financeiro</option>
              </select>
            </label>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || uploadingFoto}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
