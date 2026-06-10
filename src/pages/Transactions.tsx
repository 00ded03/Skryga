import React, { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { db } from '../db/database'
import { getCategoryByKey, getSubcategoryByKey } from '../data/categories'
import {
  formatCurrency,
  formatDateRelative,
  formatMonth,
  getMonthStart,
  getMonthEnd,
} from '../lib/currency'
import { useStore } from '../store/useStore'
import type { Transaction } from '../types'
import * as LucideIcons from 'lucide-react'

function CategoryIcon({ categoryKey, size = 18 }: { categoryKey: string; size?: number }) {
  const cat = getCategoryByKey(categoryKey)
  if (!cat) return <span>?</span>
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
      className="text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: color, width: 16, height: 16, fontSize: 9 }}
    >
      {label}
    </span>
  )
}

const SWIPE_THRESHOLD = 60

function SwipeableTransactionRow({
  tx,
  onDelete,
}: {
  tx: Transaction
  onDelete: (id: number) => void
}) {
  const [offsetX, setOffsetX] = useState(0)
  const [showDelete, setShowDelete] = useState(false)
  const startXRef = useRef(0)
  const cat = getCategoryByKey(tx.categoryKey)
  const subcat = tx.subcategoryKey ? getSubcategoryByKey(tx.categoryKey, tx.subcategoryKey) : null

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startXRef.current
    if (dx < 0) setOffsetX(Math.max(dx, -80))
  }

  function handleTouchEnd() {
    if (offsetX < -SWIPE_THRESHOLD) {
      setOffsetX(-72)
      setShowDelete(true)
    } else {
      setOffsetX(0)
      setShowDelete(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete button */}
      <div
        className="absolute inset-y-0 right-0 w-20 bg-expense flex items-center justify-center"
        style={{ opacity: showDelete ? 1 : Math.min(1, -offsetX / 72) }}
      >
        <button
          className="flex flex-col items-center gap-1 active:opacity-70"
          onClick={() => tx.id && onDelete(tx.id)}
        >
          <Trash2 size={20} color="#fff" />
          <span className="text-white text-[10px]">Удалить</span>
        </button>
      </div>

      {/* Row content */}
      <div
        className="flex items-center gap-3 py-3 px-4 bg-white border-b border-black/5 last:border-0 transition-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (showDelete) {
            setOffsetX(0)
            setShowDelete(false)
          }
        }}
      >
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
        </div>
      </div>
    </div>
  )
}

type FilterType = 'all' | 'income' | 'expense' | 'family' | 'personal'

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Все',
  income: 'Доходы',
  expense: 'Расходы',
  family: 'Семейные',
  personal: 'Личные',
}

export default function Transactions() {
  const { activeMonth, setActiveMonth, transactionFilter, setTransactionFilter } = useStore()
  const [searchText, setSearchText] = useState('')

  const monthDate = activeMonth instanceof Date ? activeMonth : new Date(activeMonth)
  const monthStart = getMonthStart(monthDate)
  const monthEnd = getMonthEnd(monthDate)

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(monthStart, monthEnd, true, true)
        .reverse()
        .sortBy('date'),
    [monthStart.getTime(), monthEnd.getTime()],
  )

  // Filter
  const filtered = React.useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx) => {
      if (transactionFilter === 'income' && tx.type !== 'income') return false
      if (transactionFilter === 'expense' && tx.type !== 'expense') return false
      if (transactionFilter === 'family' && tx.owner !== 'family') return false
      if (transactionFilter === 'personal' && tx.owner === 'family') return false
      if (searchText) {
        const q = searchText.toLowerCase()
        if (
          !tx.title.toLowerCase().includes(q) &&
          !tx.merchantName?.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [transactions, transactionFilter, searchText])

  // Group by date
  const grouped = React.useMemo(() => {
    const groups: { dateLabel: string; date: Date; txs: Transaction[] }[] = []
    for (const tx of filtered) {
      const label = formatDateRelative(tx.date)
      const existing = groups.find((g) => g.dateLabel === label)
      if (existing) {
        existing.txs.push(tx)
      } else {
        groups.push({ dateLabel: label, date: tx.date, txs: [tx] })
      }
    }
    return groups
  }, [filtered])

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  function prevMonth() {
    const d = new Date(monthDate)
    d.setMonth(d.getMonth() - 1)
    setActiveMonth(d)
  }

  function nextMonth() {
    const d = new Date(monthDate)
    d.setMonth(d.getMonth() + 1)
    setActiveMonth(d)
  }

  async function handleDelete(id: number) {
    await db.transactions.delete(id)
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background pt-12 pb-2 px-4 shadow-sm">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Поиск операций..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input-field pl-9 text-sm bg-white border border-black/5"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setTransactionFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                transactionFilter === f
                  ? 'bg-primary text-white'
                  : 'bg-white text-muted border border-black/8'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-center gap-4 mt-2 pb-1">
          <button onClick={prevMonth} className="p-1 active:opacity-70">
            <ChevronLeft size={20} color="#2D6CDF" />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[130px] text-center">
            {formatMonth(monthDate)}
          </span>
          <button onClick={nextMonth} className="p-1 active:opacity-70">
            <ChevronRight size={20} color="#2D6CDF" />
          </button>
        </div>
      </div>

      {/* Transaction groups */}
      <div className="px-4 pt-2">
        {grouped.length === 0 && (
          <p className="text-center text-muted text-sm py-16">Операций не найдено</p>
        )}
        {grouped.map((group) => (
          <div key={group.dateLabel} className="mb-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5 px-1">
              {group.dateLabel}
            </p>
            <div className="card overflow-hidden">
              {group.txs.map((tx) => (
                <SwipeableTransactionRow key={tx.id} tx={tx} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom summary bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-black/8"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 64px)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-center gap-6 px-4 py-2">
          <span className="text-sm">
            <span className="text-muted">Расходы: </span>
            <span className="font-semibold text-expense">{formatCurrency(totalExpenses)}</span>
          </span>
          <span className="text-muted">|</span>
          <span className="text-sm">
            <span className="text-muted">Доходы: </span>
            <span className="font-semibold text-income">{formatCurrency(totalIncome)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
