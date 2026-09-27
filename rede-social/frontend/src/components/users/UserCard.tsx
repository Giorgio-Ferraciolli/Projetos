import { Link } from 'react-router'

import type { UserSummary } from '../../api/types'
import { Avatar } from '../ui/Avatar'
import styles from './UserCard.module.css'

interface UserCardProps {
  user: UserSummary
  isCurrentUser?: boolean
}

export function UserCard({ user, isCurrentUser = false }: UserCardProps) {
  return (
    <Link to={`/u/${user.username}`} className={styles.card}>
      <Avatar name={user.name} src={user.avatar_url} size="lg" />
      <span className={styles.name}>{user.name}</span>
      <span className={styles.username}>@{user.username}</span>
      <span className={styles.cta}>{isCurrentUser ? 'Você' : 'Ver perfil'}</span>
    </Link>
  )
}
