import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { Button } from '../components/ui/Button'
import { TextAreaField, TextField } from '../components/ui/Field'
import { ImagePicker } from '../components/ui/ImagePicker'
import { FormAlert } from '../components/ui/States'
import { useCreateCommunity } from '../hooks/useCommunities'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { applyServerErrors } from '../lib/forms'
import { communitySchema, type CommunityValues } from '../lib/validation'
import styles from './Page.module.css'

export function CreateCommunityPage() {
  usePageTitle('Criar comunidade')
  const createCommunity = useCreateCommunity()
  const toast = useToast()
  const navigate = useNavigate()
  const [cover, setCover] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CommunityValues>({ resolver: zodResolver(communitySchema) })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    createCommunity.mutate(
      { ...values, cover },
      {
        onSuccess: (community) => {
          toast.success('Comunidade criada!')
          navigate(`/communities/${community.id}`)
        },
        onError: (error) =>
          setFormError(applyServerErrors(error, setError, ['name', 'description'] as const)),
      },
    )
  })

  return (
    <div className={styles.stack}>
      <Link to="/communities" className={styles.backLink}>
        <ArrowLeft size={18} /> Comunidades
      </Link>
      <section className={styles.card} aria-labelledby="create-community-title">
        <h1 id="create-community-title" className={styles.cardTitle}>
          Criar comunidade
        </h1>
        <p className={styles.cardDescription}>
          Você será o dono da comunidade e poderá editar o nome, a descrição e a capa.
        </p>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          {formError && <FormAlert>{formError}</FormAlert>}
          <ImagePicker file={cover} onChange={setCover} label="Adicionar capa (opcional)" />
          <TextField
            label="Nome"
            placeholder="ex.: Fotografia de rua"
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <TextAreaField
            label="Descrição"
            placeholder="Sobre o que é esta comunidade?"
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => navigate('/communities')}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createCommunity.isPending}>
              Criar comunidade
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
