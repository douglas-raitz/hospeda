import { useState } from 'react'
import type { ChangeEvent, SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { fieldErrors } from '../api'
import { useUser } from '../context/UserContext'

const Cadastro = () => {
  const { register } = useUser()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof typeof form) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setSubmitting(true)

    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (registerError) {
      const parsed = fieldErrors(registerError)
      setErrors(
        Object.keys(parsed).length > 0
          ? parsed
          : {
              detail:
                registerError instanceof Error
                  ? registerError.message
                  : 'Não foi possível criar a conta.',
            },
      )
    } finally {
      setSubmitting(false)
    }
  }

  const generalError = errors.detail ?? errors.non_field_errors

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Criar conta</h2>

        <label htmlFor="username">Usuário</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          value={form.username}
          onChange={update('username')}
        />
        {errors.username && <p className="auth-field-error">{errors.username}</p>}

        <label htmlFor="email">E-mail (opcional)</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
        />
        {errors.email && <p className="auth-field-error">{errors.email}</p>}

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
        />
        {errors.password && <p className="auth-field-error">{errors.password}</p>}

        <label htmlFor="password_confirm">Confirme a senha</label>
        <input
          id="password_confirm"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.password_confirm}
          onChange={update('password_confirm')}
        />
        {errors.password_confirm && (
          <p className="auth-field-error">{errors.password_confirm}</p>
        )}

        {generalError && (
          <p className="auth-error" role="alert">
            {generalError}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Criando…' : 'Criar conta'}
        </button>

        <p className="auth-link">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </section>
  )
}

export default Cadastro
