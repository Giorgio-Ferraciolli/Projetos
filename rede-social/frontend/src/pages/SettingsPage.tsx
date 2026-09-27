import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { getErrorMessage } from '../api/client'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { TextAreaField, TextField } from '../components/ui/Field'
import { PasswordField } from '../components/ui/PasswordField'
import { FormAlert } from '../components/ui/States'
import { useCurrentUser, useLogout } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import {
  useChangePassword,
  useRemoveAvatar,
  useUpdateAvatar,
  useUpdateProfile,
} from '../hooks/useUsers'
import { applyServerErrors } from '../lib/forms'
import {
  ACCEPTED_IMAGE_TYPES,
  passwordChangeSchema,
  profileSchema,
  validateImageFile,
  type PasswordChangeValues,
  type ProfileValues,
} from '../lib/validation'
import styles from './Page.module.css'
import settingsStyles from './SettingsPage.module.css'

export function SettingsPage() {
  usePageTitle('Configurações')
  const user = useCurrentUser()

  return (
    <div className={styles.stack}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Configurações</h1>
          <p className={styles.pageSubtitle}>Gerencie seu perfil e sua conta.</p>
        </div>
        <Link to={`/u/${user.username}`}>Ver meu perfil</Link>
      </header>
      <AvatarSection />
      <ProfileSection />
      <PasswordSection />
      <SessionSection />
    </div>
  )
}

function AvatarSection() {
  const user = useCurrentUser()
  const toast = useToast()
  const updateAvatar = useUpdateAvatar()
  const removeAvatar = useRemoveAvatar()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const error = validateImageFile(file)
    if (error) {
      toast.error(error)
      return
    }
    updateAvatar.mutate(file, {
      onSuccess: () => toast.success('Foto de perfil atualizada!'),
      onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
    })
  }

  function handleRemove() {
    removeAvatar.mutate(undefined, {
      onSuccess: () => toast.success('Foto de perfil removida.'),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <section className={styles.card} aria-labelledby="avatar-title">
      <h2 id="avatar-title" className={styles.cardTitle}>
        Foto de perfil
      </h2>
      <p className={styles.cardDescription}>Uma foto ajuda as pessoas a reconhecerem você.</p>
      <div className={settingsStyles.avatarRow}>
        <Avatar name={user.name} src={user.avatar_url} size="lg" />
        <div className={settingsStyles.avatarActions}>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="visually-hidden"
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
          />
          <Button
            variant="secondary"
            icon={<Upload size={16} />}
            onClick={() => inputRef.current?.click()}
            isLoading={updateAvatar.isPending}
          >
            {user.avatar_url ? 'Trocar foto' : 'Enviar foto'}
          </Button>
          {user.avatar_url && (
            <Button
              variant="ghost"
              icon={<Trash2 size={16} />}
              onClick={handleRemove}
              isLoading={removeAvatar.isPending}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

const PROFILE_FIELDS = ['name', 'username', 'email', 'birth_date', 'bio'] as const

function ProfileSection() {
  const user = useCurrentUser()
  const toast = useToast()
  const updateProfile = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      username: user.username,
      email: user.email,
      birth_date: user.birth_date,
      bio: user.bio ?? '',
    },
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    updateProfile.mutate(values, {
      onSuccess: (updated) => {
        reset({
          name: updated.name,
          username: updated.username,
          email: updated.email,
          birth_date: updated.birth_date,
          bio: updated.bio ?? '',
        })
        toast.success('Perfil atualizado!')
      },
      onError: (error) => setFormError(applyServerErrors(error, setError, PROFILE_FIELDS)),
    })
  })

  return (
    <section className={styles.card} aria-labelledby="profile-title">
      <h2 id="profile-title" className={styles.cardTitle}>
        Informações do perfil
      </h2>
      <p className={styles.cardDescription}>
        Seu e-mail e sua data de nascimento não aparecem para outras pessoas; no perfil
        público mostramos apenas a sua idade.
      </p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <div className={styles.formRow}>
          <TextField label="Nome" autoComplete="name" error={errors.name?.message} {...register('name')} />
          <TextField
            label="Nome de usuário"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
        </div>
        <div className={styles.formRow}>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Data de nascimento"
            type="date"
            error={errors.birth_date?.message}
            {...register('birth_date')}
          />
        </div>
        <TextAreaField
          label="Bio"
          rows={3}
          placeholder="Conte um pouco sobre você"
          error={errors.bio?.message}
          {...register('bio')}
        />
        <div className={styles.formActions}>
          <Button type="submit" isLoading={updateProfile.isPending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </section>
  )
}

function PasswordSection() {
  const toast = useToast()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeValues>({ resolver: zodResolver(passwordChangeSchema) })

  const onSubmit = handleSubmit(({ current_password, new_password }) => {
    setFormError(null)
    changePassword.mutate(
      { current_password, new_password },
      {
        onSuccess: () => {
          reset({ current_password: '', new_password: '', confirmPassword: '' })
          toast.success('Senha alterada com sucesso!')
        },
        onError: (error) =>
          setFormError(
            applyServerErrors(error, setError, ['current_password', 'new_password'] as const),
          ),
      },
    )
  })

  return (
    <section className={styles.card} aria-labelledby="password-title">
      <h2 id="password-title" className={styles.cardTitle}>
        Alterar senha
      </h2>
      <p className={styles.cardDescription}>Use uma senha longa e que você não use em outros sites.</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <PasswordField
          label="Senha atual"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register('current_password')}
        />
        <div className={styles.formRow}>
          <PasswordField
            label="Nova senha"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
            error={errors.new_password?.message}
            {...register('new_password')}
          />
          <PasswordField
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <div className={styles.formActions}>
          <Button type="submit" isLoading={changePassword.isPending}>
            Alterar senha
          </Button>
        </div>
      </form>
    </section>
  )
}

function SessionSection() {
  const logout = useLogout()
  const toast = useToast()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.info('Você saiu da sua conta.')
        navigate('/login', { replace: true })
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <section className={styles.card} aria-labelledby="session-title">
      <h2 id="session-title" className={styles.cardTitle}>
        Sessão
      </h2>
      <p className={styles.cardDescription}>Encerre sua sessão neste navegador.</p>
      <Button variant="secondary" icon={<LogOut size={16} />} onClick={handleLogout} isLoading={logout.isPending}>
        Sair da conta
      </Button>
    </section>
  )
}
