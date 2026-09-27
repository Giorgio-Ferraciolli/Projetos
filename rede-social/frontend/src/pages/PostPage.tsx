import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../api/client'
import { PostCard } from '../components/posts/PostCard'
import { PostSkeleton } from '../components/posts/PostSkeleton'
import { ErrorState } from '../components/ui/States'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePost } from '../hooks/usePosts'
import { NotFoundPage } from './NotFoundPage'
import styles from './Page.module.css'

export function PostPage() {
  const postId = Number(useParams().postId)
  const navigate = useNavigate()
  const { data: post, isPending, isError, error, refetch } = usePost(postId)
  usePageTitle(post ? `Publicação de ${post.author.name}` : 'Publicação')

  const invalidId = !Number.isInteger(postId) || postId <= 0
  if (invalidId || (error instanceof ApiError && error.status === 404)) {
    return <NotFoundPage message="Esta publicação não existe ou foi excluída." />
  }

  return (
    <div className={styles.stack}>
      <Link to="/" className={styles.backLink}>
        <ArrowLeft size={18} /> Voltar ao feed
      </Link>
      {isPending && <PostSkeleton />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {post && <PostCard post={post} onDeleted={() => navigate('/', { replace: true })} />}
    </div>
  )
}
