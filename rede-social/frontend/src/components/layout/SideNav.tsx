import { Settings } from 'lucide-react'
import { Link, NavLink } from 'react-router'

import { useCurrentUser } from '../../hooks/useAuth'
import { useMyCommunities } from '../../hooks/useCommunities'
import { Avatar } from '../ui/Avatar'
import { CREATE_POST_NAV, MAIN_NAV, type NavItem } from './navigation'
import styles from './SideNav.module.css'

const SETTINGS_NAV: NavItem = { to: '/settings', label: 'Configurações', icon: Settings }

export function SideNav() {
  const user = useCurrentUser()
  const { data: communities } = useMyCommunities()

  return (
    <nav className={styles.sideNav} aria-label="Atalhos">
      <NavLink
        to={`/u/${user.username}`}
        className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
      >
        <Avatar name={user.name} src={user.avatar_url} size="xs" />
        <span className={styles.truncate}>{user.name}</span>
      </NavLink>

      {[...MAIN_NAV, CREATE_POST_NAV, SETTINGS_NAV].map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.iconBox}>
            <Icon size={18} />
          </span>
          {label}
        </NavLink>
      ))}

      <h2 className={styles.sectionTitle}>Minhas comunidades</h2>
      {communities && communities.length > 0 ? (
        communities.slice(0, 8).map((community) => (
          <NavLink
            key={community.id}
            to={`/communities/${community.id}`}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <span
              className={styles.communityThumb}
              style={
                community.cover_url ? { backgroundImage: `url(${community.cover_url})` } : undefined
              }
              aria-hidden="true"
            >
              {!community.cover_url && community.name[0]}
            </span>
            <span className={styles.truncate}>{community.name}</span>
          </NavLink>
        ))
      ) : (
        <p className={styles.emptyText}>
          Você ainda não participa de comunidades. <Link to="/communities">Explorar</Link>
        </p>
      )}
    </nav>
  )
}
