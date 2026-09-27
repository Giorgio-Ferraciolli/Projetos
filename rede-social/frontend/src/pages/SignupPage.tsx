import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { TextAreaField, TextField } from '../components/ui/Field'
import { ImagePicker } from '../components/ui/ImagePicker'
import { PasswordField } from '../components/ui/PasswordField'
import { FormAlert } from '../components/ui/States'
import { useRegister } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { applyServerErrors } from '../lib/forms'
import { signupSchema, type SignupValues } from '../lib/validation'
import styles from './AuthPages.module.css'

const SERVER_FIELDS = ['name', 'username', 'email', 'password', 'birth_date', 'bio'] as const

export function SignupPage() {
  const registerUser = useRegister()
  const toast = useToast()
  const navigate = useNavigate()
  const [avatar, setAvatar] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    registerUser.mutate(
      {
        name: values.name,
        username: values.username,
        email: values.email,
        password: values.password,
        birth_date: values.birth_date,
        bio: values.bio || undefined,
        avatar,
      },
      {
        onSuccess: ({ user, avatarFailed }) => {
          toast.success(`Conta criada! Bem-vindo(a), ${user.name.split(' ')[0]}!`)
          if (avatarFailed) {
            toast.error('Não foi possível enviar a foto. Tente novamente em Configurações.')
          }
          navigate('/', { replace: true })
        },
        onError: (error) => setFormError(applyServerErrors(error, setError, SERVER_FIELDS)),
      },
    )
  })

  return (
    <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto.">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}

        <div className={styles.avatarRow}>
          <ImagePicker file={avatar} onChange={setAvatar} shape="circle" label="Foto" />
          <div className={styles.avatarText}>
            <strong>Foto de perfil</strong>
            <span>Opcional. JPEG, PNG ou WEBP de até 5 MB.</span>
          </div>
        </div>

        <TextField
          label="Nome"
          autoComplete="name"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <div className={styles.row}>
          <TextField
            label="Nome de usuário"
            autoComplete="username"
            placeholder="ex.: maria.silva"
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            label="Data de nascimento"
            type="date"
            autoComplete="bday"
            error={errors.birth_date?.message}
            {...register('birth_date')}
          />
        </div>
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className={styles.row}>
          <PasswordField
            label="Senha"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres."
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordField
            label="Confirmar senha"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <TextAreaField
          label="Bio (opcional)"
          placeholder="Conte um pouco sobre você"
          rows={3}
          error={errors.bio?.message}
          {...register('bio')}
        />

        <Button type="submit" size="lg" fullWidth isLoading={registerUser.isPending}>
          Criar conta
        </Button>
      </form>
      <p className={styles.switch}>
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  )
}
