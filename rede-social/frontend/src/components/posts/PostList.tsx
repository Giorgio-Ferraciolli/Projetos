import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { CursorPage, Post } from '../../api/types'
import { Button } from '../ui/Button'
import { ErrorState } from '../ui/States'
import { PostCard } from './PostCard'
import { PostSkeleton } from './PostSkeleton'
import styles from './PostList.module.css'

interface PostListProps {
  query: UseInfiniteQueryResult<InfiniteData<CursorPage<Post>>>
  /** O que mostrar quando não há nenhum post. */
  empty: ReactNode
}

/** Lista de posts paginada, com estados de carregamento, erro, vazio e "carregar mais". */
export function PostList({ query, empty }: PostListProps) {
  const { data, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    query

  if (isPending) {
    return (
      <div className={styles.list} aria-busy="true">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    )
  }

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />

  const posts = data.pages.flatMap((page) => page.items)
  if (posts.length === 0) return <>{empty}</>

  return (
    <div className={styles.list}>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasNextPage ? (
        <Button
          variant="secondary"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
          className={styles.loadMore}
        >
          Carregar mais publicações
        </Button>
      ) : (
        <p className={styles.end}>Você chegou ao fim. ✨</p>
      )}
    </div>
  )
}
