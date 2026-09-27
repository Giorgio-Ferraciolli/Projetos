import styles from './Spinner.module.css'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function Spinner({ size = 'md', label = 'Carregando' }: SpinnerProps) {
  return (
    <span className={`${styles.spinner} ${styles[size]}`} role="status">
      <span className="visually-hidden">{label}</span>
    </span>
  )
}

/** Indicador de carregamento centralizado, para páginas e seções inteiras. */
export function PageLoader({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className={styles.pageLoader}>
      <Spinner size="lg" label={label} />
    </div>
  )
}
