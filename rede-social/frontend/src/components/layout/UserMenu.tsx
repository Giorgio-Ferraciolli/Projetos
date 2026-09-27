import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { getErrorMessage } from '../../api/client'
import { useCurrentUser, useLogout } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { Avatar } from '../ui/Avatar'
import styles from './UserMenu.module.css'

/** Avatar na barra superior que abre o menu da conta (perfil, configurações, sair). */
export function UserMenu() {
  const user = useCurrentUser()
  const logout = useLogout()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleLogout() {
    setOpen(false)
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.info('Você saiu da sua conta.')
        navigate('/login', { replace: true })
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label="Abrir menu da conta"
      >
        <Avatar name={user.name} src={user.avatar_url} size="sm" />
        <ChevronDown size={16} className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.menu} id="user-menu">
          <Link
            to={`/u/${user.username}`}
            className={styles.profileCard}
           
            onClick={() => setOpen(false)}
          >
            <Avatar name={user.name} src={user.avatar_url} size="md" />
            <span className={styles.profileText}>
              <strong>{user.name}</strong>
              <span>@{user.username}</span>
            </span>
          </Link>
          <hr className={styles.divider} />
          <Link
            to={`/u/${user.username}`}
            className={styles.item}
           
            onClick={() => setOpen(false)}
          >
            <UserRound size={18} /> Meu perfil
          </Link>
          <Link to="/settings" className={styles.item} onClick={() => setOpen(false)}>
            <Settings size={18} /> Configurações
          </Link>
          <button type="button" className={styles.item} onClick={handleLogout}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
