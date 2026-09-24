import { useEffect, useState, useCallback } from 'react'
import { Plus, Paperclip, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import PlaybookItemModal from './PlaybookItemModal.jsx'
import { formatarData } from '../lib/negocio.js'
import './EquipePage.css'

export default function PlaybookPage({ area }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('playbook_itens')
      .select('*')
      .eq('area', area)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItens([])
    } else {
      setItens(data || [])
    }
    setLoading(false)
  }, [area])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleNovo() {
    setEditing(null)
    setModalOpen(true)
  }

  function handleEdit(item) {
    setEditing(item)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">PLAYBOOK — {area.toUpperCase()}</h1>
          <p className="page-subtitle">
            Base de conhecimento da área {area}: treinamentos, atas de reunião e materiais de apoio, livres para todo mundo consultar.
          </p>
        </div>
        <button className="btn-primary" onClick={handleNovo}>
          <Plus size={16} /> Adicionar item
        </button>
      </div>

      {error && <div className="error-box">Erro ao carregar o playbook: {error}</div>}

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="table-empty">Nada cadastrado ainda. Clique em "Adicionar item" pra começar.</div>
      ) : (
        <div className="equipe-list">
          {itens.map((item) => (
            <div
              className="equipe-card"
              key={item.id}
              style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
              onClick={() => handleEdit(item)}
            >
              <div className="equipe-info">
                <div className="equipe-nome">
                  <FileText size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {item.titulo}
                </div>
                {item.descricao && <div className="equipe-email">{item.descricao}</div>}
              </div>
              <div className="equipe-email" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>{formatarData(item.created_at?.slice(0, 10))}</span>
                {item.arquivo_url && (
                  <a
                    href={item.arquivo_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)' }}
                  >
                    <Paperclip size={13} /> {item.arquivo_nome || 'Anexo'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PlaybookItemModal
          item={editing}
          area={area}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData() }}
          onDeleted={() => { setModalOpen(false); loadData() }}
        />
      )}
    </div>
  )
}
