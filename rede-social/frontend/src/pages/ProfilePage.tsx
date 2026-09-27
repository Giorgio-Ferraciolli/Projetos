import { CalendarDays, Camera, ImageOff, PenLine } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'

import { ApiError } from '../api/client'
import { PostList } from '../components/posts/PostList'
import { Avatar } from '../components/ui/Avatar'
import { PageLoader } from '../components/ui/Spinner'
import { EmptyState, ErrorState } from '../components/ui/States'
import { useCurrentUser } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { useUserPosts } from '../hooks/usePosts'
import { useProfile } from '../hooks/useUsers'
import { formatMonthYear, pluralize } from '../lib/format'
import { NotFoundPage } from './NotFoundPage'
import styles from './Page.module.css'
import profileStyles from './ProfilePage.module.css'

export function ProfilePage() {
  const username = useParams().username ?? ''
  const currentUser = useCurrentUser()
  const profile = useProfile(username)
  const posts = useUserPosts(username)
  const isOwnProfile = currentUser.username === username.toLowerCase()
  usePageTitle(profile.data ? `${profile.data.name} (@${profile.data.username})` : 'Perfil')

  // "me" é reservado (a API usa /users/me para o usuário logado).
  if (username.toLowerCase() === 'me') return <Navigate to={`/u/${currentUser.username}`} replace />
  if (profile.isPending) return <PageLoader />
  if (profile.error instanceof ApiError && profile.error.status === 404) {
    return <NotFoundPage message={`O usuário @${username} não existe.`} />
  }
  if (profile.isError) {
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
  }

  const user = profile.data
  const firstName = user.name.split(' ')[0]

  return (
    <div className={styles.stack}>
      <section className={profileStyles.header}>
        <div className={profileStyles.cover} />
        <div className={profileStyles.identity}>
          <div className={profileStyles.avatarWrapper}>
            <Avatar name={user.name} src={user.avatar_url} size="xl" className={profileStyles.avatar} />
            {isOwnProfile && (
              <Link to="/settings" className={profileStyles.avatarEdit} aria-label="Alterar foto de perfil">
                <Camera size={18} />
              </Link>
            )}
          </div>
          <div className={profileStyles.names}>
            <h1 className={profileStyles.name}>{user.name}</h1>
            <p className={profileStyles.username}>@{user.username}</p>
          </div>
          {isOwnProfile && (
            <Link to="/settings" className={profileStyles.editButton}>
              <PenLine size={16} /> Editar perfil
            </Link>
          )}
        </div>

        {user.bio && <p className={profileStyles.bio}>{user.bio}</p>}

        <ul className={profileStyles.details}>
          <li>
            <CalendarDays size={16} /> {user.age} anos · Membro desde {formatMonthYear(user.created_at)}
          </li>
        </ul>

        <dl className={profileStyles.stats}>
          <div>
            <dt>Publicações</dt>
            <dd>{user.posts_count.toLocaleString('pt-BR')}</dd>
          </div>
          <div>
            <dt>Comunidades</dt>
            <dd>{user.communities_count.toLocaleString('pt-BR')}</dd>
          </div>
        </dl>
      </section>

      <h2 className={profileStyles.sectionTitle}>
        {isOwnProfile ? 'Suas publicações' : `Publicações de ${firstName}`}
        <span>{pluralize(user.posts_count, 'publicação', 'publicações')}</span>
      </h2>
      <PostList
        query={posts}
        empty={
          <EmptyState
            icon={<ImageOff size={28} />}
            title={isOwnProfile ? 'Você ainda não publicou nada' : 'Nenhuma publicação ainda'}
            description={
              isOwnProfile
                ? 'Compartilhe uma foto ou um pensamento com a comunidade.'
                : `Quando ${firstName} publicar algo, aparecerá aqui.`
            }
            action={isOwnProfile ? <Link to="/create">Criar publicação</Link> : undefined}
          />
        }
      />
    </div>
  )
}
