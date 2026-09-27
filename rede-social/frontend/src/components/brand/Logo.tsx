import { useId } from 'react'

import styles from './Logo.module.css'

/** Símbolo da marca: um "G" estilizado sobre um quadrado roxo arredondado. */
export function BrandMark({ size = 40 }: { size?: number }) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9f67ff" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${gradientId})`} />
      <path
        d="M32.5 16.2A11.5 11.5 0 1 0 35.5 24H25"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface LogoProps {
  size?: number
  /** Esconde o nome em telas pequenas, mantendo só o símbolo. */
  compact?: boolean
  inverted?: boolean
}

export function Logo({ size = 40, compact = false, inverted = false }: LogoProps) {
  return (
    <span className={`${styles.logo} ${inverted ? styles.inverted : ''}`}>
      <BrandMark size={size} />
      <span className={`${styles.wordmark} ${compact ? styles.compact : ''}`}>Rede Social</span>
    </span>
  )
}
