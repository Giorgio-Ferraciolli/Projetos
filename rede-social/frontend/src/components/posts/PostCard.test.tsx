import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Post } from '../../api/types'
import { queryKeys } from '../../hooks/queryKeys'
import { jsonResponse } from '../../test/fetch'
import { makePost, renderWithProviders } from '../../test/render'
import { PostCard } from './PostCard'

/**
 * Lê o post do cache do TanStack Query, como a PostPage faz. Assim a atualização
 * otimista do useToggleLike (que mexe no cache) aparece na tela.
 */
function CachedPostCard({ post }: { post: Post }) {
  const { data } = useQuery({
    queryKey: queryKeys.post(post.id),
    queryFn: () => post,
    initialData: post,
    staleTime: Infinity,
  })
  return <PostCard post={data} />
}

const fiveMinutesAgo = () => new Date(Date.now() - 5 * 60 * 1000).toISOString()

describe('PostCard', () => {
  it('shows the author, community, caption and relative time', () => {
    const post = makePost({
      caption: 'Pôr do sol na praia',
      community: { id: 7, name: 'Fotografia' },
      created_at: fiveMinutesAgo(),
    })
    renderWithProviders(<PostCard post={post} />)

    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toHaveAttribute('href', '/u/bruno')
    expect(screen.getByRole('link', { name: 'Fotografia' })).toHaveAttribute('href', '/communities/7')
    expect(screen.getByText('Pôr do sol na praia')).toBeInTheDocument()
    expect(screen.getByText('há 5 minutos')).toBeInTheDocument()
  })

  it('summarizes likes with the right plural and hides the summary with no likes', () => {
    const { rerender } = renderWithProviders(<PostCard post={makePost({ likes_count: 1 })} />)
    expect(screen.getByText('1 curtida')).toBeInTheDocument()

    rerender(<PostCard post={makePost({ likes_count: 2 })} />)
    expect(screen.getByText('2 curtidas')).toBeInTheDocument()

    rerender(<PostCard post={makePost({ likes_count: 0 })} />)
    expect(screen.queryByText(/curtida/)).not.toBeInTheDocument()
  })

  it('shows the delete button only when the user can delete the post', () => {
    const { rerender } = renderWithProviders(<PostCard post={makePost({ can_delete: false })} />)
    expect(screen.queryByRole('button', { name: 'Excluir publicação' })).not.toBeInTheDocument()

    rerender(<PostCard post={makePost({ can_delete: true })} />)
    expect(screen.getByRole('button', { name: 'Excluir publicação' })).toBeInTheDocument()
  })

  it('likes optimistically with PUT /api/posts/{id}/like, then keeps the server count', async () => {
    const { fetchMock, respond } = stubPendingFetch()
    renderWithProviders(<CachedPostCard post={makePost({ id: 42, likes_count: 3 })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Curtir' }))

    // Antes de a API responder, a tela já mostra a curtida.
    expect(await screen.findByRole('button', { name: 'Curtido' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('4 curtidas')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/posts/42/like', expect.objectContaining({ method: 'PUT' }))

    respond(jsonResponse({ likes_count: 10, liked_by_me: true }))
    expect(await screen.findByText('10 curtidas')).toBeInTheDocument()
  })

  it('undoes the optimistic like and shows the error when the request fails', async () => {
    const { respond } = stubPendingFetch()
    renderWithProviders(<CachedPostCard post={makePost({ likes_count: 3 })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Curtir' }))
    expect(await screen.findByRole('button', { name: 'Curtido' })).toBeInTheDocument()

    respond(jsonResponse({ detail: 'Publicação não encontrada.' }, 404))

    expect(await screen.findByText('Publicação não encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Curtir' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('3 curtidas')).toBeInTheDocument()
  })
})

/** `fetch` que só responde quando o teste chamar `respond`, para vermos o estado otimista. */
function stubPendingFetch() {
  let resolveFetch: (response: Response) => void = () => {}
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, respond: (response: Response) => resolveFetch(response) }
}
