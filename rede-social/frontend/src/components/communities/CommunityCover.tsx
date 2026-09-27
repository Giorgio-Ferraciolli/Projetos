import styles from './CommunityCover.module.css'

interface CommunityCoverProps {
  name: string
  url: string | null
  className?: string
}

/** Capa da comunidade; sem imagem, mostra um degradê roxo com a inicial do nome. */
export function CommunityCover({ name, url, className = '' }: CommunityCoverProps) {
  if (url) {
    return <img src={url} alt="" className={`${styles.cover} ${className}`} loading="lazy" />
  }
  return (
    <div className={`${styles.cover} ${styles.placeholder} ${className}`} aria-hidden="true">
      <span>{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}
