import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { ApiError, authApi } from '../api'
import type { RegisterInput, User } from '../api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

type UserContextValue = {
  user: User | null
  status: AuthStatus
  login: (username: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    authApi.me().then((data) => {
        if (cancelled) return
        setUser(data)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setUser(await authApi.login(username, password))
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    setUser(await authApi.register(input))
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo<UserContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <UserContext value={value}>{children}</UserContext>
}

export function useUser(): UserContextValue {
  const context = use(UserContext)

  if (!context) {
    throw new Error('useUser deve ser usado dentro de um UserContextProvider')
  }

  return context
}
