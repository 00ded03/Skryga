import { useState } from 'react'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'register' | 'reset'

function friendlyError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Неверный email или пароль.'
  if (normalized.includes('email not confirmed')) return 'Сначала подтвердите email по ссылке из письма.'
  if (normalized.includes('already registered')) return 'Аккаунт с таким email уже существует.'
  if (normalized.includes('password should be')) return 'Пароль должен содержать не менее 8 символов.'
  return 'Не удалось выполнить действие. Проверьте данные и попробуйте снова.'
}

export default function AuthPage() {
  const { passwordRecovery, clearPasswordRecovery } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isUpdatingPassword = passwordRecovery

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setError('')
    setMessage('')

    if ((mode === 'register' || isUpdatingPassword) && password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов.')
      return
    }
    if ((mode === 'register' || isUpdatingPassword) && password !== confirmPassword) {
      setError('Пароли не совпадают.')
      return
    }

    setLoading(true)
    try {
      if (isUpdatingPassword) {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        clearPasswordRecovery()
        setMessage('Пароль успешно изменён.')
        return
      }
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (resetError) throw resetError
        setMessage('Если аккаунт существует, письмо для смены пароля уже отправлено.')
        return
      }
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (signUpError) throw signUpError
        if (!data.session) setMessage('Проверьте почту и подтвердите регистрацию по ссылке.')
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw signInError
    } catch (authError) {
      setError(friendlyError(authError instanceof Error ? authError.message : 'Unknown auth error'))
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  const title = isUpdatingPassword ? 'Новый пароль' : mode === 'register' ? 'Создать аккаунт' : mode === 'reset' ? 'Восстановить доступ' : 'Войти в Скрягу'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10 select-none">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <img src="/icon-192.png" alt="Скряга" className="w-20 h-20 rounded-[22px] mx-auto mb-4 shadow-card-lg" />
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-muted mt-1">
            {isUpdatingPassword ? 'Придумайте новый надёжный пароль' : 'Ваш семейный финансовый помощник'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          {!isUpdatingPassword && (
            <label className="block">
              <span className="text-xs text-muted font-medium block mb-1.5">Email</span>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)}
                  className="input-field pl-10 select-text" placeholder="name@example.com" />
              </div>
            </label>
          )}

          {mode !== 'reset' && (
            <label className="block">
              <span className="text-xs text-muted font-medium block mb-1.5">Пароль</span>
              <div className="relative">
                <LockKeyhole size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required minLength={8} value={password} onChange={event => setPassword(event.target.value)}
                  className="input-field pl-10 pr-11 select-text" placeholder="Минимум 8 символов" />
                <button type="button" onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                  {showPassword ? <EyeOff size={18} color="#8E8E93" /> : <Eye size={18} color="#8E8E93" />}
                </button>
              </div>
            </label>
          )}

          {(mode === 'register' || isUpdatingPassword) && (
            <label className="block">
              <span className="text-xs text-muted font-medium block mb-1.5">Повторите пароль</span>
              <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8}
                value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
                className="input-field select-text" placeholder="Повторите пароль" />
            </label>
          )}

          {error && <p className="text-sm text-expense bg-red-50 rounded-ios px-3 py-2" role="alert">{error}</p>}
          {message && <p className="text-sm text-green-700 bg-green-50 rounded-ios px-3 py-2" role="status">{message}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isUpdatingPassword ? 'Сохранить пароль' : mode === 'register' ? 'Зарегистрироваться' : mode === 'reset' ? 'Отправить письмо' : 'Войти'}
          </button>

          {!isUpdatingPassword && mode === 'login' && (
            <button type="button" onClick={() => switchMode('reset')} className="w-full text-sm text-primary font-medium">Забыли пароль?</button>
          )}
        </form>

        {!isUpdatingPassword && mode !== 'reset' && (
          <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-5 text-sm text-gray-700">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <span className="text-primary font-semibold">{mode === 'login' ? 'Регистрация' : 'Войти'}</span>
          </button>
        )}
        {!isUpdatingPassword && mode === 'reset' && (
          <button onClick={() => switchMode('login')} className="w-full mt-5 text-sm text-primary font-semibold">Вернуться ко входу</button>
        )}
      </div>
    </div>
  )
}
