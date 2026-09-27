import { useState } from 'react'

import styles from './Avatar.module.css'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  src?: string | null
  size?: AvatarSize
  className?: string
}

// Cores de fundo para quem não tem foto; a escolha é fixa por nome.
const FALLBACK_COLORS = ['#7c3aed', '#db2777', '#0891b2', '#ea580c', '#16a34a', '#4f46e5']

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src && failedSrc !== src

  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${className}`}
      style={showImage ? undefined : { backgroundColor: colorFor(name) }}
    >
      {showImage ? (
        <img src={src} alt="" className={styles.image} onError={() => setFailedSrc(src)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      <span className="visually-hidden">{`Foto de ${name}`}</span>
    </span>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function colorFor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}
