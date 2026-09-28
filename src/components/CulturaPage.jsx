import { useEffect, useState, useCallback } from 'react'
import { Target, Eye, HeartHandshake, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import CulturaEditModal from './CulturaEditModal.jsx'
import './EquipePage.css'
import './CulturaPage.css'

const SECOES = [
  { key: 'missao', label: 'Missão', icon: Target, cor: 'var(--blue)', bg: 'rgba(80, 150, 255, 0.15)' },
  { key: 'visao', label: 'Visão', icon: Eye, cor: 'var(--purple)', bg: 'rgba(177, 140, 245, 0.15)' },
  { key: 'valores', label: 'Valores', icon: HeartHandshake, cor: 'var(--green)', bg: 'rgba(163, 230, 53, 0.15)' },
  { key: 'cultura', label: 'Cultura', icon: Sparkles, cor: 'var(--orange)', bg: 'rgba(224, 147, 47, 0.15)' },
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
          {SECOES.map((s) => {
            const Icon = s.icon
            return (
              <div className="cultura-card" key={s.key} style={{ borderTopColor: s.cor }}>
                <div className="cultura-card-title">
                  <div className="cultura-card-icon" style={{ color: s.cor, background: s.bg }}>
                    <Icon size={18} />
                  </div>
                  {s.label}
                </div>
                <div className="cultura-card-body">
                  {conteudo?.[s.key] || 'Ainda não preenchido. Use "Editar conteúdo".'}
                </div>
              </div>
            )
          })}
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
