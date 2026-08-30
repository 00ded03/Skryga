import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react'
import { db } from '../db/database'
import { getCategoryByKey, getSubcategoryByKey } from '../data/categories'
import {
  formatCurrency, formatDateRelative, getMonthStart, getMonthEnd, isSameDay,
} from '../lib/currency'
import type { Transaction } from '../types'
import * as LucideIcons from 'lucide-react'
import React from 'react'
import FinancialPortrait from '../components/dashboard/FinancialPortrait'

function CategoryIcon({ categoryKey, size = 20 }: { categoryKey: string; size?: number }) {
  const cat = getCategoryByKey(categoryKey)
  if (!cat) return <span style={{ fontSize: size * 0.8 }}>?</span>
  const Icon = (LucideIcons[cat.icon as keyof typeof LucideIcons] as React.FC<{ size?: number; color?: string }>) || LucideIcons.MoreHorizontal
  return <Icon size={size} color="#fff" />
}

function OwnerBadge({ owner }: { owner: Transaction['owner'] }) {
  const map = {
    family: { label: 'С', color: '#2D6CDF' },
    ilya:   { label: 'Ф', color: '#2D6CDF' },
    anastasia: { label: 'А', color: '#7B5CF0' },
  }
  const { label, color } = map[owner]
  return (
    <span className="text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: color, fontSize: 9, minWidth: 16, minHeight: 16 }}>
      {label}
    </span>
  )
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const cat = getCategoryByKey(tx.categoryKey)
  const subcat = tx.subcategoryKey ? getSubcategoryByKey(tx.categoryKey, tx.subcategoryKey) : null
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-black/5 last:border-0 active:bg-black/5 transition-colors">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: cat?.color || '#999' }}>
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
        <p className="text-sm font-semibold"
          style={{ color: tx.type === 'income' ? '#30D158' : '#FF453A' }}>
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

  const settings     = useLiveQuery(() => db.settings.toCollection().first(), [])
  const transactions = useLiveQuery(
    () => db.transactions.where('date').between(monthStart, monthEnd, true, true).reverse().sortBy('date'), [],
  )
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray(), [])
  const pensionFunds = useLiveQuery(() => db.pensionFunds.toArray(), [])
  const budgetLimits = useLiveQuery(() => db.budgetLimits.toArray(), [])

  const totalIncome   = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = totalIncome - totalExpenses
  const budgetProgress = React.useMemo(() => (budgetLimits ?? []).map(limit => {
    const spent = transactions
      ?.filter(tx => tx.type === 'expense' && tx.categoryKey === limit.categoryKey)
      .reduce((sum, tx) => sum + tx.amount, 0) ?? 0
    const percent = limit.monthlyLimit > 0 ? (spent / limit.monthlyLimit) * 100 : 0
    return { limit, spent, percent, remaining: limit.monthlyLimit - spent, category: getCategoryByKey(limit.categoryKey) }
  }), [budgetLimits, transactions])

  // Monthly spending progress
  const spendingPct = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate()
  const avgDailySpend = now.getDate() > 0 ? totalExpenses / now.getDate() : 0
  const projectedExpenses = Math.round(avgDailySpend * daysInMonth)

  // Chart data
  const chartData = React.useMemo(() => {
    if (!transactions) return []
    const today = now.getDate()
    const data: { day: number; balance: number }[] = []
    let running = 0
    for (let d = 1; d <= today; d++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), d)
      for (const tx of transactions.filter(t => isSameDay(t.date, dayDate))) {
        running += tx.type === 'income' ? tx.amount : -tx.amount
      }
      data.push({ day: d, balance: running })
    }
    return data
  }, [transactions])

  const recent = transactions?.slice(0, 4) ?? []

  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  const monthsNom = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const weekdays = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']
  const todayLabel = `${now.getDate()} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`
  const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="min-h-screen bg-background pb-28">

      {/* ── Header ── */}
      <div className="pt-12 pb-8 px-4"
        style={{ background: 'linear-gradient(135deg, #2D6CDF 0%, #7B5CF0 100%)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Скряга" className="w-8 h-8 rounded-xl" />
            <span className="text-white/90 text-sm font-semibold tracking-wide">Скряга</span>
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40"
              style={{ background: settings?.member1Color ?? '#2D6CDF' }}>
              <span className="text-white text-sm font-bold">{(settings?.member1Name ?? 'Ф')[0]}</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40"
              style={{ background: settings?.member2Color ?? '#7B5CF0' }}>
              <span className="text-white text-sm font-bold">{(settings?.member2Name ?? 'А')[0]}</span>
            </div>
          </div>
        </div>

        <p className="text-white/70 text-sm mb-0.5">{greeting},</p>
        <h1 className="text-white text-2xl font-bold mb-0.5">
          {settings?.member1Name ?? 'Филипп'} {settings?.member2Emoji ?? '👩'} {settings?.member2Name ?? 'Анастасия'}
        </h1>
        <p className="text-white/60 text-xs capitalize">{todayLabel}</p>
      </div>

      {/* ── Финансовый портрет (blocks) ── */}
      <div className="-mt-5">
        <FinancialPortrait
          savingsGoals={savingsGoals ?? []}
          pensionFunds={pensionFunds ?? []}
          monthlyTransactions={transactions ?? []}
        />
      </div>

      {/* ── Месячный прогресс ── */}
      <div className="card mx-4 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">{monthsNom[now.getMonth()]}</p>
          <span className="text-xs text-muted">
            {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} до конца
          </span>
        </div>

        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted flex items-center gap-1"><TrendingUp size={11} color="#30D158" /> Доходы</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-2 rounded-full" style={{ width: '100%', background: '#30D158' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted flex items-center gap-1"><TrendingDown size={11} color="#FF453A" /> Расходы</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${spendingPct}%`,
                  background: spendingPct > 90 ? '#FF453A' : spendingPct > 70 ? '#FF9500' : '#2D6CDF',
                }} />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-muted">Осталось</p>
            <p className="text-sm font-bold" style={{ color: balance >= 0 ? '#30D158' : '#FF453A' }}>
              {formatCurrency(Math.max(balance, 0))}
            </p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-muted">Прогноз расходов</p>
            <p className="text-sm font-bold text-gray-900">
              {totalIncome > 0 ? formatCurrency(projectedExpenses) : '—'}
            </p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-muted">Баланс</p>
            <p className="text-sm font-bold" style={{ color: balance >= 0 ? '#30D158' : '#FF453A' }}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Бюджетные лимиты ── */}
      {budgetProgress.length > 0 && (
        <div className="card mx-4 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Лимиты бюджета</p>
            <button onClick={() => navigate('/settings')} className="text-xs text-primary font-medium active:opacity-70">
              Настроить
            </button>
          </div>
          <div className="space-y-4">
            {budgetProgress.map(({ limit, spent, percent, remaining, category }) => {
              const isOver = percent > 100
              const isWarning = percent >= limit.alertPercent
              const color = isOver ? '#FF453A' : isWarning ? '#FF9500' : category?.color ?? '#2D6CDF'
              return (
                <div key={limit.id ?? limit.categoryKey}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-gray-900 truncate">{category?.nameRu ?? limit.categoryKey}</span>
                      {isWarning && <AlertTriangle size={13} color={color} aria-label="Достигнут порог бюджета" />}
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>
                      {formatCurrency(spent)} / {formatCurrency(limit.monthlyLimit)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted">{Math.round(percent)}%</span>
                    <span className="text-[10px] font-medium" style={{ color }}>
                      {remaining >= 0 ? `Осталось ${formatCurrency(remaining)}` : `Превышение ${formatCurrency(Math.abs(remaining))}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      {chartData.length > 1 && (
        <div className="card mx-4 p-4 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Обзор за месяц</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D6CDF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2D6CDF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Баланс']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#2D6CDF" strokeWidth={2.5}
                fill="url(#blueGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent transactions ── */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-semibold text-gray-900">Последние операции</p>
          <button className="flex items-center gap-1 text-primary text-sm font-medium active:opacity-70"
            onClick={() => navigate('/transactions')}>
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
