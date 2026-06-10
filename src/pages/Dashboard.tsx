import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowRight, PiggyBank, Landmark } from 'lucide-react'
import { db } from '../db/database'
import { getCategoryByKey, getSubcategoryByKey } from '../data/categories'
import {
  formatCurrency,
  formatDateRelative,
  getMonthStart,
  getMonthEnd,
} from '../lib/currency'
import type { Transaction } from '../types'
import * as LucideIcons from 'lucide-react'
import React from 'react'

function CategoryIcon({ categoryKey, size = 20 }: { categoryKey: string; size?: number }) {
  const cat = getCategoryByKey(categoryKey)
  if (!cat) return <span style={{ fontSize: size * 0.8 }}>?</span>
  const iconName = cat.icon as keyof typeof LucideIcons
  const Icon = (LucideIcons[iconName] as React.FC<{ size?: number; color?: string }>) || LucideIcons.MoreHorizontal
  return <Icon size={size} color="#fff" />
}

function OwnerBadge({ owner }: { owner: Transaction['owner'] }) {
  const map = {
    family: { label: 'С', color: '#2D6CDF' },
    ilya: { label: 'Ф', color: '#2D6CDF' },
    anastasia: { label: 'А', color: '#7B5CF0' },
  }
  const { label, color } = map[owner]
  return (
    <span
      className="text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: color, fontSize: 9, minWidth: 16, minHeight: 16 }}
    >
      {label}
    </span>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const cat = getCategoryByKey(tx.categoryKey)
  const subcat = tx.subcategoryKey ? getSubcategoryByKey(tx.categoryKey, tx.subcategoryKey) : null
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-black/5 last:border-0 active:bg-black/5 transition-colors">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: cat?.color || '#999' }}
      >
        <CategoryIcon categoryKey={tx.categoryKey} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{tx.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {subcat && <span className="text-xs text-muted">{subcat.nameRu}</span>}
          <OwnerBadge owner={tx.owner} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className="text-sm font-semibold"
          style={{ color: tx.type === 'income' ? '#30D158' : '#FF453A' }}
        >
          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
        </p>
        <p className="text-xs text-muted">{formatDateRelative(tx.date)}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const now = new Date()
  const monthStart = getMonthStart(now)
  const monthEnd = getMonthEnd(now)

  const settings = useLiveQuery(() => db.settings.toCollection().first(), [])
  const transactions = useLiveQuery(
    () => db.transactions.where('date').between(monthStart, monthEnd, true, true).reverse().sortBy('date'),
    [],
  )
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray(), [])
  const pensionFunds = useLiveQuery(() => db.pensionFunds.toArray(), [])

  // Month totals
  const totalIncome = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = totalIncome - totalExpenses

  // Wealth totals
  const totalSavings = savingsGoals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0
  const totalPension = pensionFunds?.reduce((s, f) => s + f.currentBalance, 0) ?? 0

  // Monthly progress
  const spendingPct = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  const daysLeft = daysInMonth - daysPassed
  const avgDailySpend = daysPassed > 0 ? totalExpenses / daysPassed : 0
  const projectedExpenses = Math.round(avgDailySpend * daysInMonth)

  // Top 2 active savings goals
  const topGoals = React.useMemo(
    () => (savingsGoals ?? []).filter(g => !g.isCompleted).slice(0, 2),
    [savingsGoals],
  )

  // Top expense category this month
  const topCategory = React.useMemo(() => {
    if (!transactions) return null
    const expMap: Record<string, number> = {}
    for (const t of transactions.filter(t => t.type === 'expense')) {
      expMap[t.categoryKey] = (expMap[t.categoryKey] || 0) + t.amount
    }
    const sorted = Object.entries(expMap).sort(([, a], [, b]) => b - a)
    if (!sorted.length) return null
    const [key, amount] = sorted[0]
    return { key, amount, cat: getCategoryByKey(key) }
  }, [transactions])

  const recent = transactions?.slice(0, 4) ?? []

  const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  const monthsNom = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const todayLabel = `${now.getDate()} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`

  const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер'

  const fundTypeLabel: Record<string, string> = {
    pension: 'Пенсия',
    keren_hishtalmut: 'Керен Хиштальмут',
    investment: 'Инвестиции',
  }

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Header ── */}
      <div
        className="pt-12 pb-8 px-4"
        style={{ background: 'linear-gradient(135deg, #2D6CDF 0%, #7B5CF0 100%)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Скряга" className="w-8 h-8 rounded-xl" />
            <span className="text-white/90 text-sm font-semibold tracking-wide">Скряга</span>
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40"
              style={{ background: settings?.member1Color ?? '#2D6CDF' }}>
              <span className="text-white text-sm font-bold">
                {(settings?.member1Name ?? 'Ф')[0]}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40"
              style={{ background: settings?.member2Color ?? '#7B5CF0' }}>
              <span className="text-white text-sm font-bold">
                {(settings?.member2Name ?? 'А')[0]}
              </span>
            </div>
          </div>
        </div>

        <p className="text-white/70 text-sm mb-0.5">{greeting},</p>
        <h1 className="text-white text-2xl font-bold mb-0.5">
          {settings?.member1Name ?? 'Филипп'} {settings?.member2Emoji ?? '👩'} {settings?.member2Name ?? 'Анастасия'}
        </h1>
        <p className="text-white/60 text-xs capitalize">{todayLabel}</p>
      </div>

      {/* ── Финансовый портрет ── */}
      <div className="mx-4 -mt-5 mb-4">
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-black/5">
            <p className="text-xs text-muted font-medium uppercase tracking-wide">Финансовый портрет</p>
          </div>

          {/* Three pillars */}
          <div className="grid grid-cols-3 divide-x divide-black/5">
            {/* Текущий баланс */}
            <button
              className="flex flex-col items-center py-4 px-2 gap-1 active:bg-black/5 transition-colors"
              onClick={() => navigate('/transactions')}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                style={{ background: balance >= 0 ? '#E8F8EE' : '#FFF0EF' }}>
                <TrendingUp size={16} color={balance >= 0 ? '#30D158' : '#FF453A'} />
              </div>
              <p className="text-[10px] text-muted font-medium text-center leading-tight">Баланс<br/>месяца</p>
              <p className="text-sm font-bold" style={{ color: balance >= 0 ? '#30D158' : '#FF453A' }}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </p>
            </button>

            {/* Накопления */}
            <button
              className="flex flex-col items-center py-4 px-2 gap-1 active:bg-black/5 transition-colors"
              onClick={() => navigate('/savings')}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                style={{ background: '#FFF8E1' }}>
                <PiggyBank size={16} color="#F5C518" />
              </div>
              <p className="text-[10px] text-muted font-medium text-center leading-tight">Накопления</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(totalSavings)}</p>
            </button>

            {/* Пенсия */}
            <button
              className="flex flex-col items-center py-4 px-2 gap-1 active:bg-black/5 transition-colors"
              onClick={() => navigate('/savings')}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                style={{ background: '#F0EEFF' }}>
                <Landmark size={16} color="#7B5CF0" />
              </div>
              <p className="text-[10px] text-muted font-medium text-center leading-tight">Пенсия /</p>
              <p className="text-[10px] text-muted font-medium text-center leading-tight -mt-1">Кер. Хишт.</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(totalPension)}</p>
            </button>
          </div>

          {/* Total wealth bar */}
          {(totalSavings + totalPension) > 0 && (
            <div className="px-4 pb-4">
              <div className="flex justify-between text-[10px] text-muted mb-1.5">
                <span>Всего накоплено</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalSavings + totalPension)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                {totalSavings > 0 && (
                  <div
                    className="h-full rounded-l-full"
                    style={{
                      width: `${(totalSavings / (totalSavings + totalPension)) * 100}%`,
                      background: '#F5C518',
                    }}
                  />
                )}
                {totalPension > 0 && (
                  <div
                    className="h-full rounded-r-full"
                    style={{
                      width: `${(totalPension / (totalSavings + totalPension)) * 100}%`,
                      background: '#7B5CF0',
                    }}
                  />
                )}
              </div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-[10px] text-muted flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />Накопления
                </span>
                <span className="text-[10px] text-muted flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#7B5CF0' }} />Пенсия
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Месячный прогресс ── */}
      <div className="card mx-4 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">{monthsNom[now.getMonth()]}</p>
          <span className="text-xs text-muted">{daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} до конца</span>
        </div>

        {/* Income vs Expenses */}
        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted flex items-center gap-1">
                <TrendingUp size={11} color="#30D158" /> Доходы
              </span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-2 rounded-full" style={{ width: '100%', background: '#30D158' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted flex items-center gap-1">
                <TrendingDown size={11} color="#FF453A" /> Расходы
              </span>
              <span className="font-semibold" style={{ color: spendingPct > 80 ? '#FF453A' : '#gray-900' }}>
                {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${spendingPct}%`,
                  background: spendingPct > 90 ? '#FF453A' : spendingPct > 70 ? '#FF9500' : '#2D6CDF',
                }}
              />
            </div>
          </div>
        </div>

        {/* Forecast row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-muted">Осталось</p>
            <p className="text-sm font-bold" style={{ color: balance >= 0 ? '#30D158' : '#FF453A' }}>
              {formatCurrency(Math.max(balance, 0))}
            </p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-muted">Прогноз расходов</p>
            <p className="text-sm font-bold text-gray-900">{totalIncome > 0 ? formatCurrency(projectedExpenses) : '—'}</p>
          </div>
          {topCategory && (
            <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted">Топ расход</p>
              <p className="text-[11px] font-bold text-gray-900 truncate">{topCategory.cat?.nameRu}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Цели накоплений ── */}
      {topGoals.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-gray-900">Цели накоплений</p>
            <button
              className="flex items-center gap-1 text-primary text-sm font-medium active:opacity-70"
              onClick={() => navigate('/savings')}
            >
              Все <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {topGoals.map(goal => {
              const pct = goal.targetAmount > 0
                ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                : 0
              const iconKey = goal.iconName as keyof typeof LucideIcons
              const GoalIcon = (LucideIcons[iconKey] as React.FC<{ size?: number; color?: string }>) || LucideIcons.PiggyBank
              return (
                <div key={goal.id} className="card p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: goal.colorHex }}>
                      <GoalIcon size={18} color="#fff" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{goal.title}</p>
                      <p className="text-xs text-muted">{formatCurrency(goal.currentAmount)} из {formatCurrency(goal.targetAmount)}</p>
                    </div>
                    <p className="text-sm font-bold text-primary flex-shrink-0">{Math.round(pct)}%</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: goal.colorHex }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Пенсионные фонды ── */}
      {(pensionFunds?.length ?? 0) > 0 && (
        <div className="mx-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-gray-900">Пенсионные фонды</p>
            <button
              className="flex items-center gap-1 text-primary text-sm font-medium active:opacity-70"
              onClick={() => navigate('/savings')}
            >
              Все <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {pensionFunds!.map(fund => (
              <div key={fund.id} className="card min-w-[160px] p-4 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                  style={{ background: '#F0EEFF' }}>
                  <Landmark size={16} color="#7B5CF0" />
                </div>
                <p className="text-xs font-semibold text-gray-900 truncate">{fund.name}</p>
                <p className="text-[10px] text-muted mb-1.5">{fundTypeLabel[fund.fundType]}</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(fund.currentBalance)}</p>
                <p className="text-[10px] text-muted">+{formatCurrency(fund.monthlyContribution)}/мес</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Последние операции ── */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-semibold text-gray-900">Последние операции</p>
          <button
            className="flex items-center gap-1 text-primary text-sm font-medium active:opacity-70"
            onClick={() => navigate('/transactions')}
          >
            Все <ArrowRight size={14} />
          </button>
        </div>
        <div className="card overflow-hidden">
          {recent.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <p className="text-muted text-sm">Нет операций в этом месяце</p>
              <p className="text-xs text-muted">Нажми + чтобы добавить первую</p>
            </div>
          ) : (
            recent.map(tx => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </div>
      </div>
    </div>
  )
}
