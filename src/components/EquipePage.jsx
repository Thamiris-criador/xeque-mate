import { useEffect, useState, useCallback } from 'react'
import { Plus, UserRound, Crown } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import UserModal from './UserModal.jsx'
import './EquipePage.css'

const AREAS = [
  {
    key: 'Comercial',
    titulo: 'COMERCIAL',
    subtitulo: 'Relacionamento, oportunidades e novos negócios.',
    descricao:
      'O time Comercial é responsável pelos primeiros passos da jornada do cliente. É aqui que entendemos seus objetivos, apresentamos as melhores soluções e conduzimos cada negociação com clareza, estratégia e transparência.',
  },
  {
    key: 'Pós-Vendas',
    titulo: 'PÓS-VENDAS',
    subtitulo: 'Onboarding, relacionamento e acompanhamento da jornada.',
    descricao:
      'Onboarding, boas-vindas, relacionamento, acompanhamento da jornada, orientações, atendimento, suporte, acompanhamento financeiro, acompanhamento de assembleias, orientações sobre lance, recuperação/reversão, pedido de indicação e fidelização.',
  },
  {
    key: 'Financeiro',
    titulo: 'FINANCEIRO',
    subtitulo: null,
    descricao: null,
  },
]

function MemberCard({ m, onClick }) {
  return (
    <div className="equipe-card" key={m.id} style={{ cursor: 'pointer' }} onClick={() => onClick(m)}>
      <div className="equipe-avatar" style={{ overflow: 'hidden' }}>
        {m.foto_url ? (
          <img src={m.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <UserRound size={18} />
        )}
      </div>
      <div className="equipe-info">
        <div className="equipe-nome">{m.nome}</div>
        <div className="equipe-email">{m.email || 'sem login cadastrado'}</div>
      </div>
      {m.cargo && <span className="badge badge-neutral">{m.cargo.toUpperCase()}</span>}
    </div>
  )
}

export default function EquipePage() {
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMembro, setEditingMembro] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('equipe')
      .select('*')
      .order('nome', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setEquipe([])
    } else {
      setEquipe(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const lideranca = equipe.filter((m) => m.area === 'Liderança')
  const semArea = equipe.filter((m) => !m.area)

  function handleEdit(membro) {
    setEditingMembro(membro)
    setModalOpen(true)
  }

  function handleNovo() {
    setEditingMembro(null)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">EQUIPE</h1>
          <p className="page-subtitle">
            Conheça as pessoas que fazem nossa operação acontecer e entenda como cada área
            contribui para a jornada dos nossos clientes.
          </p>
        </div>
        <button className="btn-primary" onClick={handleNovo}>
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      {error && <div className="error-box">Erro ao carregar equipe: {error}</div>}

      {loading ? (
        <div className="table-empty">Carregando...</div>
      ) : equipe.length === 0 ? (
        <div className="table-empty">Nenhum usuário cadastrado.</div>
      ) : (
        <>
          {lideranca.length > 0 && (
            <div className="equipe-area">
              <div className="equipe-area-header">
                <Crown size={16} className="equipe-area-icon" />
                <div className="equipe-area-titulo">LIDERANÇA</div>
              </div>
              <div className="equipe-list equipe-list-lideranca">
                {lideranca.map((m) => (
                  <MemberCard m={m} key={m.id} onClick={handleEdit} />
                ))}
              </div>
            </div>
          )}

          {AREAS.map((area) => {
            const membros = equipe.filter((m) => m.area === area.key)
            return (
              <div className="equipe-area" key={area.key}>
                <div className="equipe-area-header">
                  <div className="equipe-area-titulo">{area.titulo}</div>
                  {area.subtitulo && <div className="equipe-area-subtitulo">{area.subtitulo}</div>}
                </div>
                {area.descricao && <p className="equipe-area-descricao">{area.descricao}</p>}
                {membros.length > 0 ? (
                  <div className="equipe-list">
                    {membros.map((m) => (
                      <MemberCard m={m} key={m.id} onClick={handleEdit} />
                    ))}
                  </div>
                ) : (
                  <div className="equipe-area-vazia">Nenhuma pessoa cadastrada nessa área ainda.</div>
                )}
              </div>
            )
          })}

          {semArea.length > 0 && (
            <div className="equipe-area">
              <div className="equipe-area-header">
                <div className="equipe-area-titulo">SEM ÁREA DEFINIDA</div>
              </div>
              <div className="equipe-list">
                {semArea.map((m) => (
                  <MemberCard m={m} key={m.id} onClick={handleEdit} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <UserModal
          membro={editingMembro}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false)
            loadData()
          }}
          onSaved={() => {
            setModalOpen(false)
            loadData()
          }}
          onDeleted={() => {
            setModalOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
