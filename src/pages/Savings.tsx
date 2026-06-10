import React, { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X, TrendingUp, Landmark, Building2 } from 'lucide-react'
import { db } from '../db/database'
import { formatCurrency } from '../lib/currency'
import type { SavingsGoal, PensionFund } from '../types'
import * as LucideIcons from 'lucide-react'

const GOAL_ICONS = ['Plane', 'Car', 'Home', 'Laptop', 'Gem', 'Heart', 'Book', 'ShoppingBag', 'Gamepad2', 'Baby']
const GOAL_COLORS = ['#2D6CDF', '#7B5CF0', '#FF6B6B', '#30D158', '#FFB347', '#FF9671', '#4ECDC4', '#845EC2']

function CircleProgress({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0F4FF" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  )
}

function GoalIcon({ iconName, color, size = 24 }: { iconName: string; color: string; size?: number }) {
  const iconKey = iconName as keyof typeof LucideIcons
  const Icon = (LucideIcons[iconKey] as React.FC<{ size?: number; color?: string }>) || LucideIcons.PiggyBank
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size + 12, height: size + 12, backgroundColor: color + '20' }}
    >
      <Icon size={size} color={color} />
    </div>
  )
}

function FundTypeBadge({ type }: { type: PensionFund['fundType'] }) {
  const map = {
    pension: { label: 'Пенсия', color: '#2D6CDF' },
    keren_hishtalmut: { label: 'Керен Хиштальмут', color: '#7B5CF0' },
    investment: { label: 'Инвестиции', color: '#30D158' },
  }
  const { label, color } = map[type]
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20', color }}>
      {label}
    </span>
  )
}

function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = prev
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [])
}

function DepositSheet({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  useScrollLock()

  async function handleDeposit() {
    const n = parseFloat(amount)
    if (!n || !goal.id) return
    await db.savingsGoals.update(goal.id, {
      currentAmount: goal.currentAmount + n,
      isCompleted: goal.currentAmount + n >= goal.targetAmount,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" onClick={e => e.stopPropagation()}
        style={{ maxHeight: '60dvh' }}>
        {/* Header */}
        <div className="flex-shrink-0 p-6 pb-2">
          <div className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900">Пополнить</h3>
          <p className="text-sm text-muted">{goal.title}</p>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-400">₪</span>
            <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
              className="input-field text-2xl font-bold flex-1" autoFocus />
          </div>
          <div className="flex gap-2">
            {[100, 500, 1000, 2000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                className="flex-1 py-2 bg-background rounded-ios text-sm font-medium text-primary active:opacity-70">
                +{v}
              </button>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleDeposit} className="btn-primary w-full">Пополнить</button>
        </div>
      </div>
    </div>
  )
}

function AddGoalModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('Plane')
  const [selectedColor, setSelectedColor] = useState('#2D6CDF')

  async function handleSave() {
    if (!title || !targetAmount) return
    await db.savingsGoals.add({
      title,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      deadline: deadline ? new Date(deadline) : undefined,
      iconName: selectedIcon,
      colorHex: selectedColor,
      isCompleted: false,
      createdAt: new Date(),
    })
    onClose()
  }

  useScrollLock()
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2">
          <h3 className="text-base font-semibold text-gray-900">Новая цель</h3>
          <button onClick={onClose} className="active:opacity-70"><X size={22} color="#8E8E93" /></button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3" style={{ overscrollBehavior: 'contain' }}>
          <input type="text" placeholder="Название цели" value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₪</span>
            <input type="number" placeholder="Целевая сумма" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="input-field pl-7" />
          </div>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-field" />
          <div>
            <p className="text-xs text-muted mb-2">Иконка</p>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map(ic => {
                const Icon = (LucideIcons[ic as keyof typeof LucideIcons] as React.FC<{ size?: number; color?: string }>) || LucideIcons.Star
                return (
                  <button key={ic} onClick={() => setSelectedIcon(ic)}
                    className={`p-3 rounded-ios flex items-center justify-center transition-colors ${selectedIcon === ic ? 'bg-primary' : 'bg-background'}`}>
                    <Icon size={20} color={selectedIcon === ic ? '#fff' : '#8E8E93'} />
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted mb-2">Цвет</p>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-offset-1 ring-primary' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleSave} className="btn-primary w-full">Создать цель</button>
        </div>
      </div>
    </div>
  )
}

function AddFundModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [fundType, setFundType] = useState<PensionFund['fundType']>('pension')
  const [owner, setOwner] = useState<PensionFund['owner']>('ilya')
  const [balance, setBalance] = useState('')
  const [monthly, setMonthly] = useState('')
  const [employer, setEmployer] = useState('')

  async function handleSave() {
    if (!name) return
    await db.pensionFunds.add({
      name,
      fundType,
      currentBalance: parseFloat(balance) || 0,
      monthlyContribution: parseFloat(monthly) || 0,
      employerContributionPercent: parseFloat(employer) || 0,
      owner,
      lastUpdated: new Date(),
    })
    onClose()
  }

  useScrollLock()
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2">
          <h3 className="text-base font-semibold text-gray-900">Новый фонд</h3>
          <button onClick={onClose} className="active:opacity-70"><X size={22} color="#8E8E93" /></button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3" style={{ overscrollBehavior: 'contain' }}>
          <input type="text" placeholder="Название фонда" value={name} onChange={e => setName(e.target.value)} className="input-field" />
          <div className="flex bg-background rounded-ios p-1 gap-1">
            {(['pension', 'keren_hishtalmut', 'investment'] as PensionFund['fundType'][]).map(t => {
              const labels = { pension: 'Пенсия', keren_hishtalmut: 'К.Хиштальмут', investment: 'Инвестиции' }
              return (
                <button key={t} onClick={() => setFundType(t)}
                  className={`flex-1 py-2 rounded-[10px] text-xs font-medium transition-colors ${fundType === t ? 'bg-primary text-white' : 'text-muted'}`}>
                  {labels[t]}
                </button>
              )
            })}
          </div>
          <div className="flex bg-background rounded-ios p-1 gap-1">
            {(['ilya', 'anastasia'] as PensionFund['owner'][]).map(o => (
              <button key={o} onClick={() => setOwner(o)}
                className={`flex-1 py-2 rounded-[10px] text-sm font-medium transition-colors ${owner === o ? 'bg-primary text-white' : 'text-muted'}`}>
                {o === 'ilya' ? 'Филипп' : 'Анастасия'}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₪</span>
            <input type="number" placeholder="Текущий баланс" value={balance} onChange={e => setBalance(e.target.value)} className="input-field pl-7" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₪</span>
            <input type="number" placeholder="Взнос в месяц" value={monthly} onChange={e => setMonthly(e.target.value)} className="input-field pl-7" />
          </div>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
            <input type="number" placeholder="Взнос работодателя %" value={employer} onChange={e => setEmployer(e.target.value)} className="input-field pr-7" />
          </div>
        </div>
        {/* Footer */}
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleSave} className="btn-primary w-full">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

export default function Savings() {
  const goals = useLiveQuery(() => db.savingsGoals.toArray(), [])
  const funds = useLiveQuery(() => db.pensionFunds.toArray(), [])

  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddFund, setShowAddFund] = useState(false)
  const [editFundId, setEditFundId] = useState<number | null>(null)
  const [editFundBalance, setEditFundBalance] = useState('')

  const totalSaved = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0
  const totalTarget = goals?.reduce((s, g) => s + g.targetAmount, 0) ?? 0

  async function handleUpdateFundBalance(id: number) {
    const n = parseFloat(editFundBalance)
    if (!n) return
    await db.pensionFunds.update(id, { currentBalance: n, lastUpdated: new Date() })
    setEditFundId(null)
    setEditFundBalance('')
  }

  const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  function formatDeadline(date?: Date) {
    if (!date) return null
    const d = new Date(date)
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div
        className="pt-12 pb-6 px-4"
        style={{ background: 'linear-gradient(135deg, #2D6CDF 0%, #7B5CF0 100%)' }}
      >
        <h1 className="text-white text-xl font-bold mb-1">Накопления</h1>
        <p className="text-white/70 text-sm">Цели и пенсионные фонды</p>
        <div className="mt-4 flex items-end gap-2">
          <p className="text-3xl font-bold text-white">{formatCurrency(totalSaved)}</p>
          <p className="text-white/60 text-sm mb-1">из {formatCurrency(totalTarget)}</p>
        </div>
        {totalTarget > 0 && (
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalSaved / totalTarget) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-gray-900">Цели накоплений</p>
            <button
              onClick={() => setShowAddGoal(true)}
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center active:opacity-70"
            >
              <Plus size={18} color="#fff" />
            </button>
          </div>

          {(!goals || goals.length === 0) && (
            <p className="text-center text-muted text-sm py-8">Целей пока нет</p>
          )}

          {goals?.map((goal) => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            return (
              <div key={goal.id} className="card p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <CircleProgress pct={pct} color={goal.colorHex} size={64} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <GoalIcon iconName={goal.iconName} color={goal.colorHex} size={20} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </p>
                    {goal.deadline && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">
                        до {formatDeadline(goal.deadline)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: goal.colorHex }}>
                      {Math.round(pct)}%
                    </p>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: goal.colorHex }}
                  />
                </div>

                <button
                  onClick={() => setDepositGoal(goal)}
                  className="w-full py-2 rounded-ios border border-primary text-primary text-sm font-medium active:opacity-70"
                >
                  Пополнить
                </button>
              </div>
            )
          })}
        </div>

        {/* Pension funds */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-gray-900">Пенсионные фонды</p>
            <button
              onClick={() => setShowAddFund(true)}
              className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center active:opacity-70"
            >
              <Plus size={18} color="#fff" />
            </button>
          </div>

          {(!funds || funds.length === 0) && (
            <p className="text-center text-muted text-sm py-8">Фондов пока нет</p>
          )}

          {funds?.map((fund) => (
            <div key={fund.id} className="card p-4 mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {fund.fundType === 'pension' && <Landmark size={20} color="#2D6CDF" />}
                  {fund.fundType === 'keren_hishtalmut' && <Building2 size={20} color="#7B5CF0" />}
                  {fund.fundType === 'investment' && <TrendingUp size={20} color="#30D158" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{fund.name}</p>
                    <FundTypeBadge type={fund.fundType} />
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {fund.owner === 'ilya' ? 'Илья' : 'Анастасия'} •
                    Взнос: {formatCurrency(fund.monthlyContribution)}/мес •
                    Работодатель: {fund.employerContributionPercent}%
                  </p>
                </div>
              </div>

              {editFundId === fund.id ? (
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₪</span>
                    <input
                      type="number"
                      placeholder="Новый баланс"
                      value={editFundBalance}
                      onChange={(e) => setEditFundBalance(e.target.value)}
                      className="input-field pl-7 text-sm"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => fund.id && handleUpdateFundBalance(fund.id)}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    ОК
                  </button>
                  <button
                    onClick={() => setEditFundId(null)}
                    className="py-2 px-3 bg-background rounded-ios text-muted text-sm active:opacity-70"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(fund.currentBalance)}</p>
                  <button
                    onClick={() => {
                      setEditFundId(fund.id!)
                      setEditFundBalance(String(fund.currentBalance))
                    }}
                    className="text-xs text-primary font-medium active:opacity-70"
                  >
                    Обновить баланс
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {depositGoal && <DepositSheet goal={depositGoal} onClose={() => setDepositGoal(null)} />}
      {showAddGoal && <AddGoalModal onClose={() => setShowAddGoal(false)} />}
      {showAddFund && <AddFundModal onClose={() => setShowAddFund(false)} />}
    </div>
  )
}
