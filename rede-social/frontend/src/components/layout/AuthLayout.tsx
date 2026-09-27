import { Heart, ImageIcon, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'

import { Logo } from '../brand/Logo'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

/** Layout das telas de login e cadastro: painel da marca + cartão com o formulário. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <section className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandContent}>
          <Logo size={56} inverted />
          <p className={styles.tagline}>
            Conecte-se com pessoas e comunidades que importam para você.
          </p>
          <ul className={styles.highlights}>
            <li>
              <ImageIcon size={20} /> Compartilhe fotos e momentos
            </li>
            <li>
              <UsersRound size={20} /> Participe de comunidades
            </li>
            <li>
              <Heart size={20} /> Curta o que seus amigos publicam
            </li>
          </ul>
        </div>
        <div className={styles.orb} />
        <div className={`${styles.orb} ${styles.orbSecondary}`} />
      </section>

      <main className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.mobileLogo}>
            <Logo size={44} />
          </div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
