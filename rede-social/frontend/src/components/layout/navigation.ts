import { Compass, Home, PlusSquare, UsersRound, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** true: ativo apenas na rota exata (evita "/" ficar ativo em todas as páginas). */
  end?: boolean
}

// Itens principais, compartilhados pela barra superior, menu lateral e barra inferior.
export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/explore', label: 'Explorar', icon: Compass },
  { to: '/communities', label: 'Comunidades', icon: UsersRound },
]

export const CREATE_POST_NAV: NavItem = { to: '/create', label: 'Criar publicação', icon: PlusSquare }
