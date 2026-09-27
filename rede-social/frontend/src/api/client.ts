/**
 * Cliente HTTP da aplicação.
 *
 * Todas as chamadas passam por `apiRequest`, que:
 * - usa caminhos relativos (/api/...), então frontend e API ficam na mesma origem;
 * - envia o cookie de sessão automaticamente (credentials: 'same-origin');
 * - converte respostas de erro em `ApiError`, com mensagem pronta para exibir.
 */

export interface FieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldError[]

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type QueryValue = string | number | boolean | null | undefined

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Corpo enviado como JSON. */
  json?: unknown
  /** Corpo enviado como multipart/form-data (uploads). */
  formData?: FormData
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

const API_PREFIX = '/api'

let onUnauthorized: (() => void) | null = null

/** Registra o que fazer quando a sessão expira (ex.: limpar o usuário logado). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, formData, query, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined

  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (formData) {
    // Sem Content-Type manual: o navegador define o boundary do multipart.
    body = formData
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body,
      signal,
      credentials: 'same-origin',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.()
    throw toApiError(response.status, data)
  }
  return data as T
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `${API_PREFIX}${path}${search ? `?${search}` : ''}`
}

function toApiError(status: number, data: unknown): ApiError {
  const payload = (data ?? {}) as { detail?: unknown; errors?: FieldError[] }
  const message =
    typeof payload.detail === 'string' ? payload.detail : defaultMessageForStatus(status)
  return new ApiError(status, message, Array.isArray(payload.errors) ? payload.errors : [])
}

function defaultMessageForStatus(status: number): string {
  if (status === 413) return 'O arquivo enviado é grande demais.'
  if (status >= 500) return 'Erro no servidor. Tente novamente em instantes.'
  return 'Não foi possível concluir a operação.'
}

/** Mensagem amigável para qualquer erro (usada em toasts e estados de erro). */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Algo deu errado. Tente novamente.'
}
