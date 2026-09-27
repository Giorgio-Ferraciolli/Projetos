import { NavLink } from 'react-router'

import { useCurrentUser } from '../../hooks/useAuth'
import { Avatar } from '../ui/Avatar'
import { CREATE_POST_NAV, MAIN_NAV } from './navigation'
import styles from './BottomNav.module.css'

/** Barra de navegação fixa no rodapé, exibida apenas em telas pequenas. */
export function BottomNav() {
  const user = useCurrentUser()
  const [feed, explore, communities] = MAIN_NAV
  const items = [feed, explore, CREATE_POST_NAV, communities]

  return (
    <nav className={styles.bottomNav} aria-label="Navegação principal">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <Icon size={22} />
          <span className={styles.label}>{to === '/create' ? 'Criar' : label}</span>
        </NavLink>
      ))}
      <NavLink
        to={`/u/${user.username}`}
        className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
      >
        <Avatar name={user.name} src={user.avatar_url} size="xs" />
        <span className={styles.label}>Perfil</span>
      </NavLink>
    </nav>
  )
}
