import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB, validateImageFile } from '../../lib/validation'
import styles from './ImagePicker.module.css'

interface ImagePickerProps {
  file: File | null
  onChange: (file: File | null) => void
  label?: string
  /** Formato da pré-visualização. */
  shape?: 'wide' | 'circle'
  /** Imagem atual (ex.: capa já salva), mostrada quando nenhum arquivo foi escolhido. */
  currentUrl?: string | null
  disabled?: boolean
}

/** Seletor de imagem com pré-visualização e validação de tipo e tamanho. */
export function ImagePicker({
  file,
  onChange,
  label = 'Adicionar imagem',
  shape = 'wide',
  currentUrl = null,
  disabled = false,
}: ImagePickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const previewUrl = useObjectUrl(file)
  const shownUrl = previewUrl ?? currentUrl

  function handleSelect(selected: File | undefined) {
    if (!selected) return
    const validationError = validateImageFile(selected)
    setError(validationError)
    if (!validationError) onChange(selected)
    // Permite escolher o mesmo arquivo de novo depois de removê-lo.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="visually-hidden"
        disabled={disabled}
        onChange={(event) => handleSelect(event.target.files?.[0])}
      />
      {shownUrl ? (
        <div className={`${styles.preview} ${styles[shape]}`}>
          <img src={shownUrl} alt="Pré-visualização da imagem selecionada" />
          <div className={styles.previewActions}>
            <label htmlFor={inputId} className={styles.changeButton}>
              Trocar
            </label>
            {file && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onChange(null)}
                aria-label="Remover imagem"
                disabled={disabled}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <label htmlFor={inputId} className={`${styles.dropzone} ${styles[shape]}`}>
          <ImagePlus size={28} />
          <span className={styles.dropzoneLabel}>{label}</span>
          <span className={styles.dropzoneHint}>JPEG, PNG ou WEBP · até {MAX_IMAGE_SIZE_MB} MB</span>
        </label>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Cria (e libera ao trocar/desmontar) uma URL local para pré-visualizar o arquivo. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  // Efeito legítimo: sincroniza com um recurso externo do navegador (a URL de objeto
  // precisa ser liberada com revokeObjectURL para não vazar memória).
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (!file) return setUrl(null)
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return url
}
