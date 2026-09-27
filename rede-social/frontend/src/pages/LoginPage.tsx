import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Field'
import { PasswordField } from '../components/ui/PasswordField'
import { FormAlert } from '../components/ui/States'
import { useLogin } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { applyServerErrors } from '../lib/forms'
import { loginSchema, type LoginValues } from '../lib/validation'
import { redirectTarget } from '../routes/redirect'
import styles from './AuthPages.module.css'

export function LoginPage() {
  const login = useLogin()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  // Depois do login, volta para a página que o usuário tentou abrir (se houver).
  const from = redirectTarget(location.state)

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: (user) => {
        toast.success(`Bem-vindo(a) de volta, ${user.name.split(' ')[0]}!`)
        navigate(from, { replace: true })
      },
      onError: (error) => setFormError(applyServerErrors(error, setError, ['login', 'password'])),
    })
  })

  return (
    <AuthLayout title="Entrar" subtitle="Que bom ter você de volta!">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField
          label="E-mail ou nome de usuário"
          autoComplete="username"
          autoFocus
          error={errors.login?.message}
          {...register('login')}
        />
        <PasswordField
          label="Senha"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" fullWidth isLoading={login.isPending}>
          Entrar
        </Button>
      </form>
      <p className={styles.switch}>
        Ainda não tem conta? <Link to="/signup">Criar conta</Link>
      </p>
    </AuthLayout>
  )
}
