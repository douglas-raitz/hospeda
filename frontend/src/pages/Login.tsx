import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useUser } from '../context/UserContext'

const Login = () => {
  const { login } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Entrar</h2>

        <label htmlFor="username">Usuário</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
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

        <p className="auth-link">
          Não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </form>
    </section>
  )
}

export default Login
