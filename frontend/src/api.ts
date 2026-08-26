const API_BASE = '/api'
const CSRF_COOKIE = 'csrftoken'
const CSRF_HEADER = 'X-CSRFToken'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const NO_REFRESH_ON_401 = new Set(['/auth/refresh/', '/auth/login/'])

export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
}

export type RegisterInput = {
  username: string
  email: string
  password: string
  password_confirm: string
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

let csrfRequest: Promise<void> | null = null

async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE)
  if (existing) return existing

  csrfRequest ??= fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' })
    .then(() => undefined)
    .finally(() => {
      csrfRequest = null
    })

  await csrfRequest
  return readCookie(CSRF_COOKIE)
}

let refreshRequest: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshRequest ??= requestRaw('/auth/refresh/', { method: 'POST' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

async function requestRaw(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken()
    if (csrfToken) headers.set(CSRF_HEADER, csrfToken)
  }

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })
}

async function parse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) return await response.text()
  return await response.json()
}

function errorMessage(status: number, data: unknown): string {
  if (typeof data === 'string' && data) return data
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>
    const detail = body.detail ?? body.non_field_errors
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0] === 'string') return detail[0]
    const first = Object.values(body)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  }
  return `Erro ${status} na requisição.`
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  if (!error.data || typeof error.data !== 'object') return {}

  const result: Record<string, string> = {}
  for (const [field, value] of Object.entries(
    error.data as Record<string, unknown>,
  )) {
    if (typeof value === 'string') result[field] = value
    else if (Array.isArray(value) && typeof value[0] === 'string') {
      result[field] = value[0]
    }
  }
  return result
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  let response = await requestRaw(path, options)

  if (response.status === 401 && allowRefresh && !NO_REFRESH_ON_401.has(path)) {
    if (await refreshSession()) {
      response = await requestRaw(path, options)
    }
  }

  const data = await parse(response)
  if (!response.ok) {
    throw new ApiError(response.status, data, errorMessage(response.status, data))
  }
  return data as T
}

export const authApi = {
  me: () => request<User>('/auth/me/'),

  login: (username: string, password: string) =>
    request<User>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (input: RegisterInput) =>
    request<User>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  logout: () => request<void>('/auth/logout/', { method: 'POST' }),
}
