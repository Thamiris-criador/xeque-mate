import { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import './DicaBanner.css'

function chaveArmazenamento(titulo) {
  return `xm_dica_fechada_${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
}

export default function DicaBanner({ titulo = 'DICA', texto, icon: Icon = Lightbulb }) {
  const chave = chaveArmazenamento(titulo)
  const [fechada, setFechada] = useState(() => {
    try {
      return localStorage.getItem(chave) === '1'
    } catch {
      return false
    }
  })

  if (fechada) return null

  function fechar() {
    setFechada(true)
    try {
      localStorage.setItem(chave, '1')
    } catch {
      // ignora — só um conforto visual, não precisa persistir
    }
  }

  return (
    <div className="dica-banner">
      <div className="dica-banner-icone">
        <Icon size={18} />
      </div>
      <div className="dica-banner-conteudo">
        <div className="dica-banner-titulo">{titulo}</div>
        <div className="dica-banner-texto">{texto}</div>
      </div>
      <button type="button" className="dica-banner-fechar" onClick={fechar} title="Fechar dica">
        <X size={15} />
      </button>
    </div>
  )
}
