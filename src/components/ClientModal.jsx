import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'

export default function ClientModal({ client, responsaveis, onClose, onSaved }) {
  const isEdit = Boolean(client)
  const [form, setForm] = useState({
    nome: client?.nome || '',
    whatsapp: client?.whatsapp || '',
    proposta: client?.proposta || '',
    grupo: client?.grupo || '',
    cota: client?.cota || '',
    modelo: client?.modelo || '',
    responsavel_id: client?.responsavel_id || '',
    jornada: client?.jornada || 'novo_pos_venda',
    financeiro_status: client?.financeiro_status || 'em_dia',
    proxima_acao: client?.proxima_acao || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      responsavel_id: form.responsavel_id || null,
      proxima_acao: form.proxima_acao || null,
    }

    const query = isEdit
      ? supabase.from('clientes').update(payload).eq('id', client.id)
      : supabase.from('clientes').insert(payload)

    const { error: saveError } = await query

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar cliente' : 'Cadastrar cliente'}</h2>
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
            WhatsApp
            <input
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              placeholder="(00) 90000-0000"
            />
          </label>

          <div className="modal-form-row">
            <label>
              Proposta
              <input value={form.proposta} onChange={(e) => update('proposta', e.target.value)} />
            </label>
            <label>
              Modelo
              <input value={form.modelo} onChange={(e) => update('modelo', e.target.value)} />
            </label>
          </div>

          <div className="modal-form-row">
            <label>
              Grupo
              <input value={form.grupo} onChange={(e) => update('grupo', e.target.value)} />
            </label>
            <label>
              Cota
              <input value={form.cota} onChange={(e) => update('cota', e.target.value)} />
            </label>
          </div>

          <label>
            Responsável
            <select
              value={form.responsavel_id}
              onChange={(e) => update('responsavel_id', e.target.value)}
            >
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
              Jornada
              <select value={form.jornada} onChange={(e) => update('jornada', e.target.value)}>
                <option value="novo_pos_venda">Novo pós-venda</option>
                <option value="em_andamento">Em andamento</option>
                <option value="contemplado">Contemplado</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </label>
            <label>
              Financeiro
              <select
                value={form.financeiro_status}
                onChange={(e) => update('financeiro_status', e.target.value)}
              >
                <option value="em_dia">Em dia</option>
                <option value="atrasado">Atrasado</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
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
