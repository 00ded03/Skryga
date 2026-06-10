import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { db } from '../db/database'
import { getCategoryByKey } from '../data/categories'
import { formatCurrency, MONTH_NAMES_SHORT_RU, getMonthStart, getMonthEnd } from '../lib/currency'

type Period = 'week' | 'month' | '3months' | 'year'

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  '3months': '3 мес',
  year: 'Год',
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  if (period === 'week') start.setDate(end.getDate() - 7)
  else if (period === 'month') start.setMonth(end.getMonth() - 1)
  else if (period === '3months') start.setMonth(end.getMonth() - 3)
  else start.setFullYear(end.getFullYear() - 1)
  return { start, end }
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('month')

  const { start, end } = getPeriodRange(period)

  const transactions = useLiveQuery(
    () => db.transactions.where('date').between(start, end, true, true).toArray(),
    [period],
  )

  const allTransactions = useLiveQuery(() => db.transactions.orderBy('date').toArray(), [])

  // Summary
  const totalIncome = transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses = transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = totalIncome - totalExpenses

  // Pie chart data — top 5 expense categories
  const pieData = React.useMemo(() => {
    if (!transactions) return []
    const map: Record<string, number> = {}
    for (const t of transactions.filter((t) => t.type === 'expense')) {
      map[t.categoryKey] = (map[t.categoryKey] || 0) + t.amount
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({
        key,
        name: getCategoryByKey(key)?.nameRu || key,
        value,
        color: getCategoryByKey(key)?.color || '#999',
      }))
  }, [transactions])

  // Bar chart — last 6 months
  const barData = React.useMemo(() => {
    if (!allTransactions) return []
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const monthOffset = 5 - i
      const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
      const mStart = getMonthStart(d)
      const mEnd = getMonthEnd(d)
      const txs = allTransactions.filter((t) => t.date >= mStart && t.date <= mEnd)
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return {
        month: MONTH_NAMES_SHORT_RU[d.getMonth()],
        income,
        expense,
      }
    })
  }, [allTransactions])

  // Forecasts
  const forecasts = React.useMemo(() => {
    if (!allTransactions) return { nextExpense: 0, nextIncome: 0, remaining: 0 }
    const now = new Date()
    const last3: { income: number; expense: number }[] = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = getMonthStart(d)
      const mEnd = getMonthEnd(d)
      const txs = allTransactions.filter((t) => t.date >= mStart && t.date <= mEnd)
      last3.push({
        income: txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      })
    }
    const avgExpense = last3.reduce((s, m) => s + m.expense, 0) / 3
    const avgIncome = last3.reduce((s, m) => s + m.income, 0) / 3
    // Current month remaining
    const mStart = getMonthStart(now)
    const mEnd = getMonthEnd(now)
    const currentTxs = allTransactions.filter((t) => t.date >= mStart && t.date <= mEnd)
    const curIncome = currentTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const curExpense = currentTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const daysInMonth = mEnd.getDate()
    const daysPassed = now.getDate()
    const daysLeft = daysInMonth - daysPassed
    const dailyExpense = curExpense / daysPassed
    const remaining = curIncome - curExpense - dailyExpense * daysLeft
    return { nextExpense: avgExpense, nextIncome: avgIncome, remaining }
  }, [allTransactions])

  // Top categories horizontal bars
  const topBars = React.useMemo(() => {
    if (!pieData.length) return []
    const max = pieData[0].value
    return pieData.map((d) => ({ ...d, pct: max > 0 ? (d.value / max) * 100 : 0 }))
  }, [pieData])

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 bg-white border-b border-black/5">
        <h1 className="text-xl font-bold text-gray-900">Аналитика</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Period picker */}
        <div className="flex bg-white rounded-ios p-1 gap-1 shadow-card">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                period === p ? 'bg-primary text-white' : 'text-muted'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-xs text-muted mb-1">Доходы</p>
            <p className="text-sm font-bold text-income">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-muted mb-1">Расходы</p>
            <p className="text-sm font-bold text-expense">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xs text-muted mb-1">Баланс</p>
            <p
              className="text-sm font-bold"
              style={{ color: balance >= 0 ? '#30D158' : '#FF453A' }}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Расходы по категориям</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-700 flex-1 truncate">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted text-sm py-8">Нет данных</p>
          )}
        </div>

        {/* Bar chart */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Доходы vs Расходы</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
              />
              <Bar dataKey="income" name="Доходы" fill="#30D158" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Расходы" fill="#FF453A" radius={[4, 4, 0, 0]} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: '#8E8E93' }}>{value}</span>
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Forecasts */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Прогнозы</p>
          <div className="grid grid-cols-1 gap-3">
            <div className="card p-4">
              <p className="text-xs text-muted mb-1">Прогноз расходов на след. месяц</p>
              <p className="text-xl font-bold text-expense">{formatCurrency(forecasts.nextExpense)}</p>
              <p className="text-xs text-muted mt-1">Среднее за последние 3 месяца</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted mb-1">Прогноз дохода</p>
              <p className="text-xl font-bold text-income">{formatCurrency(forecasts.nextIncome)}</p>
              <p className="text-xs text-muted mt-1">Среднее за последние 3 месяца</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted mb-1">Остаток до конца месяца</p>
              <p
                className="text-xl font-bold"
                style={{ color: forecasts.remaining >= 0 ? '#30D158' : '#FF453A' }}
              >
                {formatCurrency(forecasts.remaining)}
              </p>
              <p className="text-xs text-muted mt-1">С учётом прогнозируемых расходов</p>
            </div>
          </div>
        </div>

        {/* Top categories horizontal bars */}
        {topBars.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Топ категорий расходов</p>
            <div className="space-y-3">
              {topBars.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{formatCurrency(d.value)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
