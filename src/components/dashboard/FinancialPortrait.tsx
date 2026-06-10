import React, { useState } from 'react'
import {
  PiggyBank, Landmark, BookOpen, ShieldCheck, TrendingUp,
  TrendingDown, X, ChevronRight, Plus, type LucideProps,
} from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../../lib/currency'
import { getCategoryByKey } from '../../data/categories'
import { useScrollLock } from '../../hooks/useScrollLock'
import type { SavingsGoal, PensionFund, Transaction } from '../../types'

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>

// ── Types ────────────────────────────────────────────────────────────────────

interface BlockItem {
  id: number
  label: string
  sublabel?: string
  amount: number
  progress?: number   // 0-100
  color?: string
  owner?: string
}

interface Block {
  id: string
  label: string
  sublabel?: string
  Icon: LucideIcon
  iconColor: string
  iconBg: string
  total: number
  count: number
  items: BlockItem[]
  navigateTo?: string
  emptyHint?: string
}

// ── Detail Sheet ─────────────────────────────────────────────────────────────

function DetailSheet({ block, onClose }: { block: Block; onClose: () => void }) {
  useScrollLock()
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col"
        style={{ maxHeight: '80dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-black/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: block.iconBg }}>
                <block.Icon size={20} color={block.iconColor} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{block.label}</h3>
                {block.sublabel && <p className="text-xs text-muted">{block.sublabel}</p>}
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:opacity-70">
              <X size={18} color="#8E8E93" />
            </button>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(block.total)}</p>
            <p className="text-xs text-muted mt-0.5">{pluralAccounts(block.count)}</p>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {block.items.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <p className="text-muted text-sm">{block.emptyHint ?? 'Нет данных'}</p>
            </div>
          ) : (
            block.items.map(item => (
              <div key={item.id} className="px-5 py-3.5 border-b border-black/5 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                    {item.sublabel && <p className="text-xs text-muted mt-0.5">{item.sublabel}</p>}
                    {item.owner && (
                      <span className="text-xs text-muted">{item.owner}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.amount)}</p>
                </div>
                {item.progress !== undefined && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${item.progress}%`, backgroundColor: item.color ?? '#2D6CDF' }} />
                    </div>
                    <p className="text-[10px] text-muted mt-0.5 text-right">{Math.round(item.progress)}%</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {block.navigateTo && (
          <div className="flex-shrink-0 px-5 pt-2 pb-4 border-t border-black/5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
            <button
              onClick={() => { onClose(); navigate(block.navigateTo!) }}
              className="w-full py-3 rounded-ios border border-primary text-primary text-sm font-medium flex items-center justify-center gap-2 active:opacity-70">
              <Plus size={16} />
              Управлять счетами
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({ block, onClick }: { block: Block; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-3 text-left active:scale-95 transition-transform shadow-card flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: block.iconBg }}>
          <block.Icon size={16} color={block.iconColor} />
        </div>
        {block.count > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: block.iconBg, color: block.iconColor }}>
            {block.count}
          </span>
        )}
      </div>

      <div>
        <p className="text-[11px] text-muted font-medium leading-tight">{block.label}</p>
        {block.sublabel && (
          <p className="text-[10px] text-muted/60 leading-tight">{block.sublabel}</p>
        )}
      </div>

      <div className="mt-1">
        <p className="text-sm font-bold text-gray-900">{formatCurrency(block.total)}</p>
        {block.count > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <p className="text-[10px] text-muted">{pluralAccounts(block.count)}</p>
            <ChevronRight size={10} color="#8E8E93" />
          </div>
        )}
      </div>
    </button>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pluralAccounts(n: number) {
  if (n === 0) return 'нет счетов'
  if (n === 1) return '1 счёт'
  if (n >= 2 && n <= 4) return `${n} счёта`
  return `${n} счетов`
}

const OWNER_LABELS: Record<string, string> = {
  ilya: 'Филипп',
  anastasia: 'Анастасия',
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  savingsGoals: SavingsGoal[]
  pensionFunds: PensionFund[]
  monthlyTransactions: Transaction[]
}

export default function FinancialPortrait({ savingsGoals, pensionFunds, monthlyTransactions }: Props) {
  const [activeBlock, setActiveBlock] = useState<Block | null>(null)

  // ── Build blocks ────────────────────────────────────────────────────────────

  // 1. Накопления
  const savingsBlock: Block = {
    id: 'savings',
    label: 'Накопления',
    sublabel: 'Цели',
    Icon: PiggyBank,
    iconColor: '#C8920A',
    iconBg: '#FFF8E1',
    total: savingsGoals.reduce((s, g) => s + g.currentAmount, 0),
    count: savingsGoals.filter(g => !g.isCompleted).length,
    navigateTo: '/savings',
    emptyHint: 'Добавьте цели в разделе Накопления',
    items: savingsGoals.map(g => ({
      id: g.id!,
      label: g.title,
      sublabel: `цель: ${formatCurrency(g.targetAmount)}`,
      amount: g.currentAmount,
      progress: g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0,
      color: g.colorHex,
    })),
  }

  // 2. Пенсия
  const pensionFunds_ = pensionFunds.filter(f => f.fundType === 'pension')
  const pensionBlock: Block = {
    id: 'pension',
    label: 'Пенсия',
    sublabel: 'Пенсионные фонды',
    Icon: Landmark,
    iconColor: '#2D6CDF',
    iconBg: '#EEF3FD',
    total: pensionFunds_.reduce((s, f) => s + f.currentBalance, 0),
    count: pensionFunds_.length,
    navigateTo: '/savings',
    emptyHint: 'Добавьте пенсионный фонд в разделе Накопления',
    items: pensionFunds_.map(f => ({
      id: f.id!,
      label: f.name,
      sublabel: `${OWNER_LABELS[f.owner]} • +${formatCurrency(f.monthlyContribution)}/мес`,
      amount: f.currentBalance,
      owner: OWNER_LABELS[f.owner],
    })),
  }

  // 3. Керен Хиштальмут
  const kerenFunds = pensionFunds.filter(f => f.fundType === 'keren_hishtalmut')
  const kerenBlock: Block = {
    id: 'keren',
    label: 'Керен Хиштальмут',
    sublabel: 'קרן השתלמות',
    Icon: BookOpen,
    iconColor: '#7B5CF0',
    iconBg: '#F0EEFF',
    total: kerenFunds.reduce((s, f) => s + f.currentBalance, 0),
    count: kerenFunds.length,
    navigateTo: '/savings',
    emptyHint: 'Добавьте Керен Хиштальмут в разделе Накопления',
    items: kerenFunds.map(f => ({
      id: f.id!,
      label: f.name,
      sublabel: `${OWNER_LABELS[f.owner]} • +${formatCurrency(f.monthlyContribution)}/мес • работодатель ${f.employerContributionPercent}%`,
      amount: f.currentBalance,
    })),
  }

  // 4. Пицуим
  const pitzuimFunds = pensionFunds.filter(f => f.fundType === 'pitzuim')
  const pitzuimBlock: Block = {
    id: 'pitzuim',
    label: 'Пицуим',
    sublabel: 'פיצויים',
    Icon: ShieldCheck,
    iconColor: '#FF9500',
    iconBg: '#FFF4E5',
    total: pitzuimFunds.reduce((s, f) => s + f.currentBalance, 0),
    count: pitzuimFunds.length,
    navigateTo: '/savings',
    emptyHint: 'Добавьте пицуим в разделе Накопления',
    items: pitzuimFunds.map(f => ({
      id: f.id!,
      label: f.name,
      sublabel: `${OWNER_LABELS[f.owner]} • работодатель ${f.employerContributionPercent}%`,
      amount: f.currentBalance,
    })),
  }

  // 5. Инвестиции
  const investFunds = pensionFunds.filter(f => f.fundType === 'investment')
  const investBlock: Block = {
    id: 'invest',
    label: 'Инвестиции',
    sublabel: 'Портфели',
    Icon: TrendingUp,
    iconColor: '#30D158',
    iconBg: '#E8F8EE',
    total: investFunds.reduce((s, f) => s + f.currentBalance, 0),
    count: investFunds.length,
    navigateTo: '/savings',
    emptyHint: 'Добавьте инвестиционный счёт в разделе Накопления',
    items: investFunds.map(f => ({
      id: f.id!,
      label: f.name,
      sublabel: `${OWNER_LABELS[f.owner]} • +${formatCurrency(f.monthlyContribution)}/мес`,
      amount: f.currentBalance,
    })),
  }

  // 6. Доходы
  const incomeByCategory = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of monthlyTransactions.filter(t => t.type === 'income')) {
      map[t.categoryKey] = (map[t.categoryKey] || 0) + t.amount
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [monthlyTransactions])

  const totalIncome = incomeByCategory.reduce((s, [, v]) => s + v, 0)
  const incomeBlock: Block = {
    id: 'income',
    label: 'Доходы',
    sublabel: 'этот месяц',
    Icon: TrendingUp,
    iconColor: '#30D158',
    iconBg: '#E8F8EE',
    total: totalIncome,
    count: incomeByCategory.length,
    navigateTo: '/transactions',
    emptyHint: 'Нет доходов в этом месяце',
    items: incomeByCategory.map(([key, amount], i) => {
      const cat = getCategoryByKey(key)
      return {
        id: i,
        label: cat?.nameRu ?? key,
        amount,
      }
    }),
  }

  // 7. Расходы
  const expenseByCategory = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of monthlyTransactions.filter(t => t.type === 'expense')) {
      map[t.categoryKey] = (map[t.categoryKey] || 0) + t.amount
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [monthlyTransactions])

  const totalExpenses = expenseByCategory.reduce((s, [, v]) => s + v, 0)
  const expenseBlock: Block = {
    id: 'expense',
    label: 'Расходы',
    sublabel: 'этот месяц',
    Icon: TrendingDown,
    iconColor: '#FF453A',
    iconBg: '#FFF0EF',
    total: totalExpenses,
    count: expenseByCategory.length,
    navigateTo: '/transactions',
    emptyHint: 'Нет расходов в этом месяце',
    items: expenseByCategory.map(([key, amount], i) => {
      const cat = getCategoryByKey(key)
      return {
        id: i,
        label: cat?.nameRu ?? key,
        amount,
      }
    }),
  }

  // Show only blocks that have data OR are always visible (savings/pension/keren)
  const alwaysVisible = ['savings', 'pension', 'keren', 'income', 'expense']
  const blocks: Block[] = [
    savingsBlock,
    pensionBlock,
    kerenBlock,
    pitzuimBlock,
    investBlock,
    incomeBlock,
    expenseBlock,
  ].filter(b => alwaysVisible.includes(b.id) || b.count > 0)

  return (
    <>
      <div className="mx-4 mb-4">
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-black/5">
            <p className="text-xs text-muted font-medium uppercase tracking-wide">Финансовый портрет</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2">
            {blocks.map(block => (
              <BlockCard key={block.id} block={block} onClick={() => setActiveBlock(block)} />
            ))}
          </div>
        </div>
      </div>

      {activeBlock && (
        <DetailSheet block={activeBlock} onClose={() => setActiveBlock(null)} />
      )}
    </>
  )
}
