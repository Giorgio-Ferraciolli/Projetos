import { Outlet } from 'react-router'

import { BottomNav } from './BottomNav'
import { RightRail } from './RightRail'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'
import styles from './AppLayout.module.css'

/**
 * Estrutura das páginas logadas:
 * - desktop: barra superior + menu lateral + conteúdo + coluna de sugestões;
 * - celular: barra superior compacta + conteúdo + barra de navegação inferior.
 */
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <TopBar />
      <div className={styles.body}>
        <aside className={styles.left} aria-label="Menu lateral">
          <SideNav />
        </aside>
        <main id="main-content" className={styles.main}>
          <Outlet />
        </main>
        <aside className={styles.right} aria-label="Sugestões">
          <RightRail />
        </aside>
      </div>
      <BottomNav />
    </div>
  )
}
