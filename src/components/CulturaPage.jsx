import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import CulturaEditModal from './CulturaEditModal.jsx'
import './EquipePage.css'
import './CulturaPage.css'

const SECOES = [
  { key: 'missao', label: 'Missão' },
  { key: 'visao', label: 'Visão' },
  { key: 'valores', label: 'Valores' },
  { key: 'cultura', label: 'Cultura' },
]

export default function CulturaPage() {
  const [conteudo, setConteudo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cultura_conteudo').select('*').eq('id', 1).maybeSingle()
    setConteudo(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CULTURA</h1>
          <p className="page-subtitle">Missão, visão, valores e cultura da Xeque Mate Consórcios.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditOpen(true)}>
          Editar conteúdo
        </button>
      </div>

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : (
        <div className="cultura-grid">
          {SECOES.map((s) => (
            <div className="cultura-card" key={s.key}>
              <div className="cultura-card-title">{s.label}</div>
              <div className="cultura-card-body">
                {conteudo?.[s.key] || 'Ainda não preenchido. Use "Editar conteúdo".'}
              </div>
            </div>
          ))}
        </div>
      )}

      {editOpen && (
        <CulturaEditModal
          conteudo={conteudo}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
