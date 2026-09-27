import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { jsonResponse } from '../test/fetch'
import { makeUser, renderWithProviders } from '../test/render'
import { LoginPage } from './LoginPage'

async function fillAndSubmit(login: string, password: string) {
  await userEvent.type(screen.getByLabelText('E-mail ou nome de usuário'), login)
  await userEvent.type(screen.getByLabelText('Senha'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  it('shows the validation messages when the form is submitted empty', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<LoginPage />, { route: '/login' })

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe seu e-mail ou nome de usuário.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the server message in the alert when the credentials are wrong (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ detail: 'E-mail/usuário ou senha incorretos.' }, 401)),
    )
    const { auth } = renderWithProviders(<LoginPage />, { route: '/login' })

    await fillAndSubmit('ana@example.com', 'senha-errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail/usuário ou senha incorretos.')
    expect(auth.setUser).not.toHaveBeenCalled()
  })

  it('stores the logged-in user and greets them by first name', async () => {
    const user = makeUser({ name: 'Ana Souza' })
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(user))
    vi.stubGlobal('fetch', fetchMock)
    const { auth } = renderWithProviders(<LoginPage />, { route: '/login' })

    await fillAndSubmit('ana@example.com', 'senha123')

    expect(await screen.findByText('Bem-vindo(a) de volta, Ana!')).toBeInTheDocument()
    expect(auth.setUser.mock.lastCall?.[0]).toEqual(user)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', body: '{"login":"ana@example.com","password":"senha123"}' }),
    )
  })
})
