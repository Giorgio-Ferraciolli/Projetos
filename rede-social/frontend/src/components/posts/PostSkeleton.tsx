import styles from './PostSkeleton.module.css'

/** Esqueleto exibido enquanto os posts carregam (evita a tela "pular"). */
export function PostSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.header}>
        <span className={`${styles.block} ${styles.avatar}`} />
        <div className={styles.lines}>
          <span className={`${styles.block} ${styles.lineShort}`} />
          <span className={`${styles.block} ${styles.lineTiny}`} />
        </div>
      </div>
      <span className={`${styles.block} ${styles.lineLong}`} />
      <span className={`${styles.block} ${styles.image}`} />
    </div>
  )
}
