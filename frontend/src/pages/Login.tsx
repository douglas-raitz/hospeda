import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useUser } from '../context/UserContext'
import './auth.css'

function turnoAtual(agora: Date) {
  const hora = agora.getHours()
  const turno = hora >= 6 && hora < 18 ? 'turno diurno' : 'turno noturno'
  const relogio = `${String(hora).padStart(2, '0')}h${String(agora.getMinutes()).padStart(2, '0')}`

  return `recepção · ${turno} · ${relogio}`
}

const Login = () => {
  const { login } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [meta, setMeta] = useState(() => turnoAtual(new Date()))

  useEffect(() => {
    const id = setInterval(() => setMeta(turnoAtual(new Date())), 30_000)
    return () => clearInterval(id)
  }, [])

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Não foi possível entrar.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-screen">
      <aside className="auth-brand">
        <span className="auth-mark" aria-hidden="true">
          H
        </span>

        <h1 className="auth-title">Hospeda</h1>
        <p className="auth-subtitle">
          Sistema de recepção: cadastro de hóspedes, reservas, check-in e
          checkout com cálculo automático de diárias.
        </p>
      </aside>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="auth-eyebrow">Acesso do atendente</p>
          <h2 className="auth-heading">Entrar no sistema</h2>

          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="atendente"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="auth-meta">{meta}</p>

          <p className="auth-link">
            Não tem conta? <Link to="/cadastro">Criar conta</Link>
          </p>
        </form>
      </div>
    </section>
  )
}

export default Login
