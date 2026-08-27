import { useState } from 'react'
import type { ChangeEvent, SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { fieldErrors } from '../api'
import { useUser } from '../context/UserContext'
import './auth.css'

type Requisito = { texto: string; atendido: boolean | null }

const pareceCom = (senha: string, atributo: string) => {
  const alvo = atributo.trim().toLowerCase().split('@')[0]
  if (alvo.length < 3) return false
  const valor = senha.toLowerCase()
  return valor.includes(alvo) || alvo.includes(valor)
}

const requisitosDaSenha = (form: {
  username: string
  email: string
  password: string
  password_confirm: string
}): Requisito[] => {
  const { password: senha } = form
  const preenchida = senha.length > 0

  return [
    { texto: 'Ao menos 8 caracteres', atendido: senha.length >= 8 },
    { texto: 'Não pode conter apenas números', atendido: preenchida && !/^\d+$/.test(senha) },
    {
      texto: 'Não pode ser parecida com o usuário ou o e-mail',
      atendido:
        preenchida && !pareceCom(senha, form.username) && !pareceCom(senha, form.email),
    },
    { texto: 'Não pode ser uma senha comum, como “senha123”', atendido: null },
    {
      texto: 'As duas senhas devem coincidir',
      atendido: preenchida && senha === form.password_confirm,
    },
  ]
}

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
  const requisitos = requisitosDaSenha(form)

  return (
    <section className="auth-screen">
      <aside className="auth-brand">
        <span className="auth-mark" aria-hidden="true">
          H
        </span>

        <h1 className="auth-title">Nova conta de atendente</h1>
        <p className="auth-subtitle">
          Cada atendente da recepção usa a própria credencial. As operações de
          check-in e checkout ficam registradas com o nome de quem executou.
        </p>
      </aside>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <Link to="/login" className="auth-back">
            ‹ Voltar ao login
          </Link>

          <p className="auth-eyebrow">Cadastro de acesso</p>
          <h2 className="auth-heading">Criar conta</h2>

          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="camila.nunes"
            required
            value={form.username}
            onChange={update('username')}
          />
          {errors.username && (
            <p className="auth-field-error">{errors.username}</p>
          )}

          <label htmlFor="email">E-mail (opcional)</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="camila@hospeda.com.br"
            value={form.email}
            onChange={update('email')}
          />
          {errors.email && <p className="auth-field-error">{errors.email}</p>}

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={form.password}
                onChange={update('password')}
              />
              {errors.password && (
                <p className="auth-field-error">{errors.password}</p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password_confirm">Confirmar senha</label>
              <input
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={form.password_confirm}
                onChange={update('password_confirm')}
              />
              {errors.password_confirm && (
                <p className="auth-field-error">{errors.password_confirm}</p>
              )}
            </div>
          </div>

          {generalError && (
            <p className="auth-error" role="alert">
              {generalError}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Criando…' : 'Criar conta e entrar'}
          </button>

          <p className="auth-meta">Requisitos da senha</p>
          <ul className="auth-requisitos">
            {requisitos.map(({ texto, atendido }) => (
              <li
                key={texto}
                className={atendido ? 'is-ok' : undefined}
                data-informativo={atendido === null || undefined}
              >
                <span aria-hidden="true">{atendido ? '✓' : '•'}</span>
                {texto}
              </li>
            ))}
          </ul>
        </form>
      </div>
    </section>
  )
}

export default Cadastro
