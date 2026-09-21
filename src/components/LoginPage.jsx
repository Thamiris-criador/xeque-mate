import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError('E-mail ou senha inválidos.')
    }
    // sucesso: App.jsx escuta onAuthStateChange e troca de tela sozinho
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-title">XEQUE MATE</div>
          <div className="login-brand-sub">— CONSÓRCIOS</div>
        </div>

        <h1 className="login-title">Entrar no painel</h1>
        <p className="login-subtitle">Pós-vendas · Xeque Mate</p>

        <form className="login-form" onSubmit={handleLogin}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
