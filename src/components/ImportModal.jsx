import { useState } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import './ClientModal.css'
import './ImportModal.css'

const CAMPOS = [
  { key: 'nome', label: 'Nome', obrigatorio: true, aliases: ['nome', 'cliente', 'nome completo'] },
  { key: 'cpf', label: 'CPF', aliases: ['cpf'] },
  { key: 'whatsapp', label: 'Telefone/WhatsApp', aliases: ['telefone', 'whatsapp', 'celular', 'fone'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail'] },
  { key: 'proposta', label: 'Proposta', aliases: ['proposta', 'nº proposta', 'numero da proposta'] },
  { key: 'grupo', label: 'Grupo', aliases: ['grupo'] },
  { key: 'cota', label: 'Cota', aliases: ['cota', 'nº cota', 'numero da cota'] },
  { key: 'modelo', label: 'Modelo/moto', aliases: ['modelo', 'moto', 'modelo de interesse'] },
  { key: 'financeiro_status', label: 'Status financeiro', aliases: ['status', 'financeiro', 'status financeiro'] },
]

const STATUS_ALIASES = {
  'em dia': 'em_dia',
  em_dia: 'em_dia',
  atrasado: 'inadimplente',
  'em atraso': 'inadimplente',
  inadimplente: 'inadimplente',
  acordo: 'acordo',
  cancelado: 'cancelado',
  contemplado: 'contemplado',
}

function detectarMapeamento(headers) {
  const mapping = {}
  headers.forEach((h, idx) => {
    const normalizado = String(h).trim().toLowerCase()
    for (const campo of CAMPOS) {
      if (mapping[campo.key] !== undefined) continue
      if (campo.aliases.includes(normalizado)) mapping[campo.key] = idx
    }
  })
  return mapping
}

export default function ImportModal({ onClose, onFinished }) {
  const [step, setStep] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        if (data.length < 2) {
          setError('A planilha precisa ter uma linha de cabeçalho e pelo menos uma linha de dados.')
          return
        }
        const [head, ...body] = data
        setHeaders(head)
        setRows(body.filter((r) => r.some((v) => String(v).trim() !== '')))
        setMapping(detectarMapeamento(head))
        setStep('mapeamento')
      } catch {
        setError('Não foi possível ler esse arquivo. Confirme que é um .xlsx ou .csv válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function updateMapping(campo, valor) {
    setMapping((m) => ({ ...m, [campo]: valor === '' ? undefined : Number(valor) }))
  }

  async function handleConfirmar() {
    if (mapping.nome === undefined) {
      setError('Mapeie ao menos a coluna "Nome" antes de importar.')
      return
    }

    setImportando(true)
    setError(null)

    const { data: existentes, error: fetchError } = await supabase
      .from('clientes')
      .select('id, cpf, proposta, grupo, cota')

    if (fetchError) {
      setImportando(false)
      setError(fetchError.message)
      return
    }

    const porCpf = new Map(existentes.filter((c) => c.cpf).map((c) => [c.cpf.trim(), c]))
    const porProposta = new Map(existentes.filter((c) => c.proposta).map((c) => [c.proposta.trim(), c]))
    const porGrupoCota = new Map(
      existentes.filter((c) => c.grupo && c.cota).map((c) => [`${c.grupo.trim()}|${c.cota.trim()}`, c])
    )

    const vistosNoArquivo = new Set()
    let importados = 0
    let atualizados = 0
    let duplicados = 0
    let erros = 0
    const errosDetalhe = []

    for (const row of rows) {
      const registro = {}
      for (const campo of CAMPOS) {
        const idx = mapping[campo.key]
        if (idx === undefined) continue
        const valor = row[idx]
        if (valor === undefined || valor === null || String(valor).trim() === '') continue
        registro[campo.key] = String(valor).trim()
      }

      if (registro.financeiro_status) {
        const normalizado = STATUS_ALIASES[registro.financeiro_status.toLowerCase()]
        if (normalizado) registro.financeiro_status = normalizado
        else delete registro.financeiro_status
      }

      if (!registro.nome) {
        erros += 1
        errosDetalhe.push(`Linha sem nome (${JSON.stringify(row)})`)
        continue
      }

      const chave =
        registro.cpf || registro.proposta || (registro.grupo && registro.cota ? `${registro.grupo}|${registro.cota}` : null)

      if (chave) {
        if (vistosNoArquivo.has(chave)) {
          duplicados += 1
          continue
        }
        vistosNoArquivo.add(chave)
      }

      const existente =
        (registro.cpf && porCpf.get(registro.cpf)) ||
        (registro.proposta && porProposta.get(registro.proposta)) ||
        (registro.grupo && registro.cota && porGrupoCota.get(`${registro.grupo}|${registro.cota}`))

      if (existente) {
        const { error: updError } = await supabase.from('clientes').update(registro).eq('id', existente.id)
        if (updError) {
          erros += 1
          errosDetalhe.push(`${registro.nome}: ${updError.message}`)
        } else {
          atualizados += 1
        }
      } else {
        const { error: insError } = await supabase.from('clientes').insert(registro)
        if (insError) {
          erros += 1
          errosDetalhe.push(`${registro.nome}: ${insError.message}`)
        } else {
          importados += 1
        }
      }
    }

    setImportando(false)
    setResultado({ total: rows.length, importados, atualizados, duplicados, erros, errosDetalhe })
    setStep('resultado')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Importar clientes</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          {step === 'upload' && (
            <div className="import-upload">
              <Upload size={28} />
              <p>Selecione um arquivo .xlsx ou .csv com os clientes.</p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
            </div>
          )}

          {step === 'mapeamento' && (
            <>
              <div className="modal-hint">
                Arquivo: <strong>{fileName}</strong> · {rows.length} linha(s) de dados encontradas.
              </div>

              <div className="modal-subsection">Mapeamento de colunas</div>
              {CAMPOS.map((campo) => (
                <label key={campo.key}>
                  {campo.label} {campo.obrigatorio && '*'}
                  <select value={mapping[campo.key] ?? ''} onChange={(e) => updateMapping(campo.key, e.target.value)}>
                    <option value="">Não importar</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h || `Coluna ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <div className="modal-subsection">Pré-visualização (5 primeiras linhas)</div>
              <div className="import-preview">
                <table>
                  <thead>
                    <tr>
                      {CAMPOS.filter((c) => mapping[c.key] !== undefined).map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {CAMPOS.filter((c) => mapping[c.key] !== undefined).map((c) => (
                          <td key={c.key}>{row[mapping[c.key]]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" onClick={handleConfirmar} disabled={importando}>
                  {importando ? 'Importando...' : `Confirmar importação (${rows.length} linhas)`}
                </button>
              </div>
            </>
          )}

          {step === 'resultado' && resultado && (
            <>
              <div className="import-resultado-grid">
                <div className="stat-tile">
                  <div className="stat-tile-value">{resultado.total}</div>
                  <div className="stat-tile-label">Linhas no arquivo</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-value">{resultado.importados}</div>
                  <div className="stat-tile-label">Importados</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-value">{resultado.atualizados}</div>
                  <div className="stat-tile-label">Atualizados</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-value">{resultado.duplicados}</div>
                  <div className="stat-tile-label">Duplicados no arquivo</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-tile-value">{resultado.erros}</div>
                  <div className="stat-tile-label">Erros</div>
                </div>
              </div>

              {resultado.errosDetalhe.length > 0 && (
                <div className="modal-hint">
                  {resultado.errosDetalhe.slice(0, 10).map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={onFinished}>
                  Concluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
