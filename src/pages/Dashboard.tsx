import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { db } from '../db/database'
import { getCategoryByKey, getSubcategoryByKey } from '../data/categories'
import {
  formatCurrency,
  formatDateRelative,
  getMonthStart,
  getMonthEnd,
  isSameDay,
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
    ilya: { label: 'И', color: '#2D6CDF' },
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

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(monthStart, monthEnd, true, true)
        .reverse()
        .sortBy('date'),
    [],
  )


  const totalIncome = transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses = transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = totalIncome - totalExpenses

  // Build daily cumulative balance data
  const chartData = React.useMemo(() => {
    if (!transactions) return []
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const today = now.getDate()
    const data: { day: number; balance: number }[] = []
    let runningBalance = 0

    for (let d = 1; d <= Math.min(daysInMonth, today); d++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), d)
      const dayTxs = transactions.filter((t) => isSameDay(t.date, dayDate))
      for (const tx of dayTxs) {
        runningBalance += tx.type === 'income' ? tx.amount : -tx.amount
      }
      data.push({ day: d, balance: runningBalance })
    }
    return data
  }, [transactions])

  // Top expense category
  const topCategory = React.useMemo(() => {
    if (!transactions) return null
    const expMap: Record<string, number> = {}
    for (const t of transactions.filter((t) => t.type === 'expense')) {
      expMap[t.categoryKey] = (expMap[t.categoryKey] || 0) + t.amount
    }
    const sorted = Object.entries(expMap).sort(([, a], [, b]) => b - a)
    if (!sorted.length) return null
    const [key, amount] = sorted[0]
    const cat = getCategoryByKey(key)
    return { key, amount, cat }
  }, [transactions])

  const recent = transactions?.slice(0, 5) ?? []

  // Russian date display
  const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  const todayLabel = `${now.getDate()} ${months[now.getMonth()]}, ${weekdays[now.getDay()]}`

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div
        className="pt-12 pb-6 px-4"
        style={{ background: 'linear-gradient(135deg, #2D6CDF 0%, #7B5CF0 100%)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-bold">Добрый день, Илья!</h1>
            <p className="text-white/70 text-sm capitalize">{todayLabel}</p>
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center border-2 border-white/40">
              <span className="text-white text-sm font-bold">И</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40" style={{ background: '#7B5CF0' }}>
              <span className="text-white text-sm font-bold">А</span>
            </div>
          </div>
        </div>

        {/* Balance hero */}
        <div className="text-center mt-2">
          <p className="text-white/70 text-sm">Баланс за месяц</p>
          <p
            className="text-4xl font-bold mt-1"
            style={{ color: balance >= 0 ? '#fff' : '#FF453A' }}
          >
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        <div className="card min-w-[140px] p-4 border-t-4 border-income flex-shrink-0" style={{ borderTopColor: '#30D158' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} color="#30D158" />
            <p className="text-xs text-muted font-medium">Доходы</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card min-w-[140px] p-4 flex-shrink-0" style={{ borderTop: '4px solid #FF453A' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={14} color="#FF453A" />
            <p className="text-xs text-muted font-medium">Расходы</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="card min-w-[140px] p-4 flex-shrink-0" style={{ borderTop: '4px solid #2D6CDF' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs">💰</span>
            <p className="text-xs text-muted font-medium">Баланс</p>
          </div>
          <p
            className="text-lg font-bold"
            style={{ color: balance >= 0 ? '#30D158' : '#FF453A' }}
          >
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="card mx-4 p-4 mb-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">Обзор за месяц</p>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
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
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#2D6CDF"
                strokeWidth={2.5}
                fill="url(#blueGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[140px] flex items-center justify-center text-muted text-sm">
            Недостаточно данных
          </div>
        )}
      </div>

      {/* Recent transactions */}
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
            <p className="text-center text-muted text-sm py-8">Нет операций</p>
          ) : (
            recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {topCategory && (
          <div className="card min-w-[160px] p-4 flex-shrink-0">
            <p className="text-xs text-muted mb-1">Топ расход</p>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: topCategory.cat?.color || '#999' }}
              >
                <CategoryIcon categoryKey={topCategory.key} size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 truncate max-w-[90px]">
                  {topCategory.cat?.nameRu}
                </p>
                <p className="text-sm font-bold text-expense">{formatCurrency(topCategory.amount)}</p>
              </div>
            </div>
          </div>
        )}
        <div className="card min-w-[160px] p-4 flex-shrink-0">
          <p className="text-xs text-muted mb-1">Транзакций</p>
          <p className="text-2xl font-bold text-gray-900">{transactions?.length ?? 0}</p>
          <p className="text-xs text-muted mt-0.5">в этом месяце</p>
        </div>
        <div className="card min-w-[160px] p-4 flex-shrink-0">
          <p className="text-xs text-muted mb-1">Всего сохранено</p>
          <p className="text-sm font-bold text-income">
            {totalExpenses > 0 ? Math.round((balance / totalIncome) * 100) : 0}%
          </p>
          <p className="text-xs text-muted mt-0.5">от доходов</p>
        </div>
      </div>
    </div>
  )
}
