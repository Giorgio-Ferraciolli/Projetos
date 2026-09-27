import { ChevronRight, Heart, Link2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { getErrorMessage } from '../../api/client'
import type { Post } from '../../api/types'
import { useDeletePost, useToggleLike } from '../../hooks/usePosts'
import { useToast } from '../../hooks/useToast'
import { formatDateTime, formatRelativeTime, pluralize } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import styles from './PostCard.module.css'

const CAPTION_PREVIEW_LENGTH = 280

interface PostCardProps {
  post: Post
  /** Chamado depois que o post é excluído (ex.: sair da página do post). */
  onDeleted?: () => void
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const toast = useToast()
  const toggleLike = useToggleLike()
  const deletePost = useDeletePost()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const profileUrl = `/u/${post.author.username}`

  function handleLike() {
    toggleLike.mutate(post, { onError: (error) => toast.error(getErrorMessage(error)) })
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  function handleDelete() {
    deletePost.mutate(post, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast.success('Publicação excluída.')
        onDeleted?.()
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <article className={styles.card} aria-labelledby={`post-${post.id}-author`}>
      <header className={styles.header}>
        <Link to={profileUrl} tabIndex={-1} aria-hidden="true">
          <Avatar name={post.author.name} src={post.author.avatar_url} size="md" />
        </Link>
        <div className={styles.headerText}>
          <div className={styles.authorLine}>
            <Link to={profileUrl} id={`post-${post.id}-author`} className={styles.authorName}>
              {post.author.name}
            </Link>
            {post.community && (
              <>
                <ChevronRight size={14} className={styles.separator} aria-hidden="true" />
                <Link to={`/communities/${post.community.id}`} className={styles.communityName}>
                  {post.community.name}
                </Link>
              </>
            )}
          </div>
          <Link to={`/posts/${post.id}`} className={styles.meta}>
            <time dateTime={post.created_at} title={formatDateTime(post.created_at)}>
              {formatRelativeTime(post.created_at)}
            </time>
            <span aria-hidden="true"> · </span>@{post.author.username}
          </Link>
        </div>
        {post.can_delete && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setConfirmOpen(true)}
            aria-label="Excluir publicação"
            title="Excluir publicação"
          >
            <Trash2 size={18} />
          </button>
        )}
      </header>

      {post.caption && <Caption text={post.caption} />}

      {post.image_url && (
        <Link to={`/posts/${post.id}`} className={styles.imageLink}>
          <img
            src={post.image_url}
            alt={post.caption ? `Imagem da publicação: ${post.caption.slice(0, 100)}` : 'Imagem da publicação'}
            className={styles.image}
            loading="lazy"
          />
        </Link>
      )}

      <div className={styles.stats}>
        {post.likes_count > 0 && (
          <span className={styles.likesSummary}>
            <span className={styles.likeBadge}>
              <Heart size={10} fill="currentColor" />
            </span>
            {pluralize(post.likes_count, 'curtida', 'curtidas')}
          </span>
        )}
      </div>

      <footer className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${post.liked_by_me ? styles.liked : ''}`}
          onClick={handleLike}
          disabled={toggleLike.isPending}
          aria-pressed={post.liked_by_me}
        >
          <Heart size={20} fill={post.liked_by_me ? 'currentColor' : 'none'} />
          {post.liked_by_me ? 'Curtido' : 'Curtir'}
        </button>
        <button type="button" className={styles.action} onClick={handleCopyLink}>
          <Link2 size={20} />
          Copiar link
        </button>
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir publicação?"
        description="Esta ação não pode ser desfeita. A imagem também será removida."
        confirmLabel="Excluir"
        isLoading={deletePost.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  )
}

/** Legenda com "Ver mais" para textos longos. */
function Caption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > CAPTION_PREVIEW_LENGTH

  return (
    <p className={styles.caption}>
      {isLong && !expanded ? `${text.slice(0, CAPTION_PREVIEW_LENGTH).trimEnd()}… ` : text}
      {isLong && (
        <button type="button" className={styles.moreButton} onClick={() => setExpanded((v) => !v)}>
          {expanded ? ' Ver menos' : 'Ver mais'}
        </button>
      )}
    </p>
  )
}
