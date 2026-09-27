import { Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'

import { Logo } from '../brand/Logo'
import { MAIN_NAV } from './navigation'
import { UserMenu } from './UserMenu'
import styles from './TopBar.module.css'

export function TopBar() {
  return (
    <header className={styles.topBar}>
      <div className={styles.inner}>
        <div className={styles.start}>
          <Link to="/" className={styles.logoLink} aria-label="Rede Social, ir para o feed">
            <Logo size={38} compact />
          </Link>
          <SearchBox />
        </div>

        <nav className={styles.nav} aria-label="Navegação principal">
          {MAIN_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              title={label}
            >
              <Icon size={24} />
              <span className="visually-hidden">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.end}>
          <Link to="/create" className={styles.createButton}>
            <Plus size={20} />
            <span className={styles.createLabel}>Criar</span>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function SearchBox() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <Search size={18} className={styles.searchIcon} aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Pesquisar pessoas"
        aria-label="Pesquisar pessoas"
        className={styles.searchInput}
      />
    </form>
  )
}
