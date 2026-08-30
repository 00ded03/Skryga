import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TabBar from './components/layout/TabBar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import Savings from './pages/Savings'
import Settings from './pages/Settings'
import AddTransactionModal from './components/transactions/AddTransactionModal'
import { useStore } from './store/useStore'
import { useAuth } from './auth/AuthProvider'
import AuthPage from './pages/Auth'
import { db, seedDefaults } from './db/database'
import { supabase } from './lib/supabase'
import { CloudSyncProvider } from './sync/CloudSyncProvider'

const DATA_OWNER_KEY = 'skryga-data-owner-id'

function LoadingScreen() {
  return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted">Проверяем сессию…</div>
}

function ConfigurationScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="card p-6 max-w-md text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Авторизация ещё не подключена</h1>
        <p className="text-sm text-muted">Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в переменные окружения.</p>
      </div>
    </div>
  )
}

function DataOwnershipScreen({ currentUserId }: { currentUserId: string }) {
  async function clearAndClaimDevice() {
    const confirmed = window.confirm(
      'Удалить локальные финансовые данные предыдущего аккаунта? Действие необратимо. Перед продолжением войдите в прежний аккаунт и скачайте резервную копию, если она нужна.'
    )
    if (!confirmed) return
    await db.transaction('rw', [db.transactions, db.savingsGoals, db.pensionFunds, db.budgetLimits, db.settings], async () => {
      await Promise.all([
        db.transactions.clear(), db.savingsGoals.clear(), db.pensionFunds.clear(),
        db.budgetLimits.clear(), db.settings.clear(),
      ])
    })
    localStorage.setItem(DATA_OWNER_KEY, currentUserId)
    await seedDefaults()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="card p-6 max-w-md text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-2">На устройстве есть данные другого аккаунта</h1>
        <p className="text-sm text-muted mb-5">Для защиты финансов доступ к ним заблокирован.</p>
        <div className="space-y-2">
          <button onClick={() => supabase?.auth.signOut()} className="btn-primary w-full">Выйти и сменить аккаунт</button>
          <button onClick={clearAndClaimDevice} className="w-full py-3 text-sm font-semibold text-expense">Удалить локальные данные и продолжить</button>
        </div>
      </div>
    </div>
  )
}

function InvitationAcceptor({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('invite')
    if (!token || !supabase) return
    setProcessing(true)
    supabase.rpc('accept_family_invitation', { invitation_token: token }).then(({ data, error: inviteError }) => {
      if (inviteError) {
        setError('Приглашение недействительно, просрочено или предназначено для другого email.')
        setProcessing(false)
        return
      }
      localStorage.setItem(`skryga-active-family:${userId}`, String(data))
      window.history.replaceState({}, document.title, window.location.pathname)
      window.location.reload()
    })
  }, [userId])

  if (processing || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">{error ? 'Не удалось принять приглашение' : 'Подключаем к семье…'}</h1>
          {error && <p className="text-sm text-expense">{error}</p>}
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  const isAddTransactionOpen = useStore((s) => s.isAddTransactionOpen)
  const { configured, loading, session, passwordRecovery } = useAuth()

  if (!configured) return <ConfigurationScreen />
  if (loading) return <LoadingScreen />
  if (!session || passwordRecovery) return <AuthPage />
  const dataOwnerId = localStorage.getItem(DATA_OWNER_KEY)
  if (!dataOwnerId) localStorage.setItem(DATA_OWNER_KEY, session.user.id)
  else if (dataOwnerId !== session.user.id) return <DataOwnershipScreen currentUserId={session.user.id} />

  return (
    <InvitationAcceptor userId={session.user.id}>
    <CloudSyncProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background font-sans select-none">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <TabBar />
          {isAddTransactionOpen && <AddTransactionModal />}
        </div>
      </BrowserRouter>
    </CloudSyncProvider>
    </InvitationAcceptor>
  )
}
