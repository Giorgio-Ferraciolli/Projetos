import { afterEach, describe, expect, it, vi } from 'vitest'

import { jsonResponse } from '../test/fetch'
import { ApiError, apiRequest, setUnauthorizedHandler } from './client'

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubFailingFetch(error: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
}

/** Retorna o erro lançado pela promise (ou falha o teste se ela não rejeitar). */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => expect.fail('expected the request to fail'),
    (error: unknown) => error,
  )
}

afterEach(() => {
  setUnauthorizedHandler(null)
})

describe('apiRequest', () => {
  it('prefixes the path with /api and returns the parsed JSON', async () => {
    const fetchMock = stubFetch(jsonResponse({ id: 1, name: 'Ana' }))

    await expect(apiRequest('/users/me')).resolves.toEqual({ id: 1, name: 'Ana' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/me',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' }),
    )
  })

  it('sends the json option as a JSON body', async () => {
    const fetchMock = stubFetch(jsonResponse({}))

    await apiRequest('/auth/login', { method: 'POST', json: { login: 'ana', password: 'x' } })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe('{"login":"ana","password":"x"}')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('returns undefined for 204 No Content', async () => {
    stubFetch(new Response(null, { status: 204 }))

    await expect(apiRequest('/posts/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('turns an error response into an ApiError with the detail and field errors', async () => {
    const errors = [{ field: 'username', message: 'Este nome de usuário já está em uso.' }]
    stubFetch(jsonResponse({ detail: 'Não foi possível salvar.', errors }, 409))

    const error = await rejectionOf(apiRequest('/users/me', { method: 'PATCH', json: {} }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Não foi possível salvar.', fieldErrors: errors })
  })

  it('uses a status-based message when the error body is not JSON', async () => {
    stubFetch(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await rejectionOf(apiRequest('/posts/feed'))

    expect(error).toMatchObject({ status: 502, message: 'Erro no servidor. Tente novamente em instantes.' })
  })

  it('calls the unauthorized handler on 401 from a regular endpoint', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    stubFetch(jsonResponse({ detail: 'Sessão expirada.' }, 401))

    await rejectionOf(apiRequest('/posts/feed'))

    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not call the unauthorized handler on 401 from /auth/login (wrong password)', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    stubFetch(jsonResponse({ detail: 'E-mail/usuário ou senha incorretos.' }, 401))

    const error = await rejectionOf(apiRequest('/auth/login', { method: 'POST', json: {} }))

    expect(error).toMatchObject({ status: 401, message: 'E-mail/usuário ou senha incorretos.' })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('turns a network failure into an ApiError with status 0 and a Portuguese message', async () => {
    stubFailingFetch(new TypeError('Failed to fetch'))

    const error = await rejectionOf(apiRequest('/posts/feed'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 0,
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    })
  })

  it('rethrows aborts untouched so cancelled queries are not reported as errors', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    stubFailingFetch(abort)

    await expect(apiRequest('/posts/feed')).rejects.toBe(abort)
  })

  it('skips empty, null and undefined query params but keeps zero', async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [] }))

    await apiRequest('/users', { query: { q: '', mine: null, cursor: undefined, limit: 20, offset: 0 } })

    expect(fetchMock).toHaveBeenCalledWith('/api/users?limit=20&offset=0', expect.anything())
  })
})
