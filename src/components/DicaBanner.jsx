import { Lightbulb } from 'lucide-react'
import './DicaBanner.css'

export default function DicaBanner({ titulo = 'DICA', texto, icon: Icon = Lightbulb }) {
  return (
    <div className="dica-banner">
      <div className="dica-banner-icone">
        <Icon size={24} />
      </div>
      <div>
        <div className="dica-banner-titulo">{titulo}</div>
        <div className="dica-banner-texto">{texto}</div>
      </div>
    </div>
  )
}
