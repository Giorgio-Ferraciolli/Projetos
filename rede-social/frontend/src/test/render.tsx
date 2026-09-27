import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import type { CurrentUser, Post } from '../api/types'
import { AuthContext, type AuthContextValue } from '../context/authContext'
import { ToastProvider } from '../context/ToastProvider'

interface RenderOptions {
  /** URL inicial do MemoryRouter. */
  route?: string
  /** Usuário logado (null = visitante). */
  user?: CurrentUser | null
}

/**
 * Renderiza com os mesmos providers da aplicação. A sessão é falsa (não chama a API)
 * e cada teste ganha um QueryClient novo, sem cache compartilhado.
 */
export function renderWithProviders(ui: ReactElement, { route = '/', user = null }: RenderOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const auth = {
    user,
    isLoading: false,
    error: null,
    retry: vi.fn(),
    setUser: vi.fn<AuthContextValue['setUser']>(),
  } satisfies AuthContextValue

  // Como `wrapper`, os providers continuam em volta da UI também no `rerender`.
  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={auth}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Providers }), queryClient, auth }
}

export function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Ana Souza',
    username: 'ana',
    avatar_url: null,
    email: 'ana@example.com',
    bio: null,
    birth_date: '1995-04-12',
    age: 31,
    created_at: '2026-01-10T12:00:00Z',
    ...overrides,
  }
}

export function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    caption: 'Pôr do sol na praia',
    image_url: null,
    created_at: new Date().toISOString(),
    author: { id: 2, name: 'Bruno Lima', username: 'bruno', avatar_url: null },
    community: null,
    likes_count: 0,
    liked_by_me: false,
    can_delete: false,
    ...overrides,
  }
}
