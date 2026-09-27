import { useId, type ComponentProps, type ReactNode } from 'react'

import styles from './Field.module.css'

interface FieldWrapperProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
}

/** Rótulo + controle + mensagem de ajuda/erro, com os atributos de acessibilidade. */
function FieldWrapper({ id, label, error, hint, children }: FieldWrapperProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: ReactNode
  /** Elemento exibido dentro do campo, à direita (ex.: botão de mostrar senha). */
  trailing?: ReactNode
}

export function TextField({ label, error, hint, trailing, id, ref, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint}>
      <div className={styles.control}>
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${error ? styles.invalid : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${inputId}-message` : undefined}
          {...props}
        />
        {trailing && <div className={styles.trailing}>{trailing}</div>}
      </div>
    </FieldWrapper>
  )
}

interface TextAreaFieldProps extends ComponentProps<'textarea'> {
  label: string
  error?: string
  hint?: ReactNode
}

export function TextAreaField({ label, error, hint, id, ref, ...props }: TextAreaFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={inputId}
        className={`${styles.input} ${styles.textarea} ${error ? styles.invalid : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${inputId}-message` : undefined}
        {...props}
      />
    </FieldWrapper>
  )
}
