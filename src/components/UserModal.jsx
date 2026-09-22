import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function UserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: '', area: 'Pós-Vendas' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Novo usuário</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Nome *
            <input value={form.nome} onChange={(e) => update('nome', e.target.value)} />
          </label>

          <label>
            E-mail (login) *
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="pessoa@empresa.com"
            />
          </label>

          <label>
            Senha *
            <input
              type="password"
              value={form.senha}
              onChange={(e) => update('senha', e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </label>

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
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
