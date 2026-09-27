import { Link } from 'react-router'

import { useCurrentUser } from '../../hooks/useAuth'
import { useUserSearch } from '../../hooks/useUsers'
import { Avatar } from '../ui/Avatar'
import styles from './RightRail.module.css'

const SUGGESTIONS = 5

/** Coluna direita (desktop): pessoas para conhecer. */
export function RightRail() {
  const currentUser = useCurrentUser()
  const { data, isPending } = useUserSearch('')
  const people = (data?.pages[0]?.items ?? [])
    .filter((user) => user.id !== currentUser.id)
    .slice(0, SUGGESTIONS)

  return (
    <div className={styles.rail}>
      <section className={styles.card} aria-labelledby="suggestions-title">
        <div className={styles.cardHeader}>
          <h2 id="suggestions-title" className={styles.cardTitle}>
            Pessoas para conhecer
          </h2>
          <Link to="/explore" className={styles.seeAll}>
            Ver todas
          </Link>
        </div>
        {isPending && <p className={styles.muted}>Carregando...</p>}
        {!isPending && people.length === 0 && (
          <p className={styles.muted}>Nenhuma sugestão por enquanto.</p>
        )}
        <ul className={styles.list}>
          {people.map((person) => (
            <li key={person.id}>
              <Link to={`/u/${person.username}`} className={styles.person}>
                <Avatar name={person.name} src={person.avatar_url} size="sm" />
                <span className={styles.personText}>
                  <strong>{person.name}</strong>
                  <span>@{person.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className={styles.footer}>Rede Social · Projeto de estudos</p>
    </div>
  )
}
