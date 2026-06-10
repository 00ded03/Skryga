import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X, TrendingUp, Landmark, Building2, Edit2, Trash2 } from 'lucide-react'
import { db } from '../db/database'
import { formatCurrency } from '../lib/currency'
import { useScrollLock } from '../hooks/useScrollLock'
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

function GoalIcon({ iconName, color, size = 24 }: { iconName: string; color: string; size?: number }) {
  const Icon = (LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<{ size?: number; color?: string }>) || LucideIcons.PiggyBank
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size + 12, height: size + 12, backgroundColor: color + '20' }}>
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
    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: color + '20', color }}>{label}</span>
  )
}

function ConfirmSheet({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  useScrollLock()
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-card-lg">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Удалить?</h3>
        <p className="text-sm text-muted mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 bg-background rounded-ios text-sm font-medium text-gray-900 active:opacity-70">
            Отмена
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 bg-expense rounded-ios text-white text-sm font-semibold active:opacity-70">
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
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
        <div className="flex-shrink-0 p-6 pb-2">
          <div className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900">Пополнить</h3>
          <p className="text-sm text-muted">{goal.title}</p>
        </div>
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
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleDeposit} className="btn-primary w-full">Пополнить</button>
        </div>
      </div>
    </div>
  )
}

function GoalModal({
  goal,
  onClose,
}: {
  goal?: SavingsGoal
  onClose: () => void
}) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : '')
  const [currentAmount, setCurrentAmount] = useState(goal ? String(goal.currentAmount) : '')
  const [deadline, setDeadline] = useState(
    goal?.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : ''
  )
  const [selectedIcon, setSelectedIcon] = useState(goal?.iconName ?? 'Plane')
  const [selectedColor, setSelectedColor] = useState(goal?.colorHex ?? '#2D6CDF')

  const isEdit = !!goal

  async function handleSave() {
    if (!title || !targetAmount) return
    const data = {
      title,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      deadline: deadline ? new Date(deadline) : undefined,
      iconName: selectedIcon,
      colorHex: selectedColor,
      isCompleted: parseFloat(currentAmount) >= parseFloat(targetAmount),
      createdAt: goal?.createdAt ?? new Date(),
    }
    if (isEdit && goal.id) {
      await db.savingsGoals.update(goal.id, data)
    } else {
      await db.savingsGoals.add(data)
    }
    onClose()
  }

  useScrollLock()
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2 border-b border-black/5">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Редактировать цель' : 'Новая цель'}
          </h3>
          <button onClick={onClose} className="active:opacity-70"><X size={22} color="#8E8E93" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3 pt-4" style={{ overscrollBehavior: 'contain' }}>
          <input type="text" placeholder="Название цели" value={title}
            onChange={e => setTitle(e.target.value)} className="input-field" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₪</span>
            <input type="number" placeholder="Целевая сумма" value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)} className="input-field pl-7" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₪</span>
            <input type="number" placeholder="Уже накоплено" value={currentAmount}
              onChange={e => setCurrentAmount(e.target.value)} className="input-field pl-7" />
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
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleSave} className="btn-primary w-full">
            {isEdit ? 'Сохранить изменения' : 'Создать цель'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FundModal({
  fund,
  onClose,
}: {
  fund?: PensionFund
  onClose: () => void
}) {
  const [name, setName] = useState(fund?.name ?? '')
  const [fundType, setFundType] = useState<PensionFund['fundType']>(fund?.fundType ?? 'pension')
  const [owner, setOwner] = useState<PensionFund['owner']>(fund?.owner ?? 'ilya')
  const [balance, setBalance] = useState(fund ? String(fund.currentBalance) : '')
  const [monthly, setMonthly] = useState(fund ? String(fund.monthlyContribution) : '')
  const [employer, setEmployer] = useState(fund ? String(fund.employerContributionPercent) : '')

  const isEdit = !!fund

  async function handleSave() {
    if (!name) return
    const data = {
      name,
      fundType,
      currentBalance: parseFloat(balance) || 0,
      monthlyContribution: parseFloat(monthly) || 0,
      employerContributionPercent: parseFloat(employer) || 0,
      owner,
      lastUpdated: new Date(),
    }
    if (isEdit && fund.id) {
      await db.pensionFunds.update(fund.id, data)
    } else {
      await db.pensionFunds.add(data)
    }
    onClose()
  }

  useScrollLock()
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2 border-b border-black/5">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Редактировать фонд' : 'Новый фонд'}
          </h3>
          <button onClick={onClose} className="active:opacity-70"><X size={22} color="#8E8E93" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-3 pt-4" style={{ overscrollBehavior: 'contain' }}>
          <input type="text" placeholder="Название фонда" value={name}
            onChange={e => setName(e.target.value)} className="input-field" />
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
            <input type="number" placeholder="Текущий баланс" value={balance}
              onChange={e => setBalance(e.target.value)} className="input-field pl-7" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₪</span>
            <input type="number" placeholder="Взнос в месяц" value={monthly}
              onChange={e => setMonthly(e.target.value)} className="input-field pl-7" />
          </div>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
            <input type="number" placeholder="Взнос работодателя %" value={employer}
              onChange={e => setEmployer(e.target.value)} className="input-field pr-7" />
          </div>
        </div>
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleSave} className="btn-primary w-full">
            {isEdit ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Savings() {
  const goals = useLiveQuery(() => db.savingsGoals.toArray(), [])
  const funds = useLiveQuery(() => db.pensionFunds.toArray(), [])

  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null)
  const [editGoal, setEditGoal] = useState<SavingsGoal | undefined>(undefined)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editFund, setEditFund] = useState<PensionFund | undefined>(undefined)
  const [showAddFund, setShowAddFund] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const totalSaved = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0
  const totalTarget = goals?.reduce((s, g) => s + g.targetAmount, 0) ?? 0

  const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  function formatDeadline(date?: Date) {
    if (!date) return null
    const d = new Date(date)
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`
  }

  function askDelete(message: string, onConfirm: () => void) {
    setConfirmDelete({ message, onConfirm })
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="pt-12 pb-6 px-4"
        style={{ background: 'linear-gradient(135deg, #2D6CDF 0%, #7B5CF0 100%)' }}>
        <h1 className="text-white text-xl font-bold mb-1">Накопления</h1>
        <p className="text-white/70 text-sm">Цели и пенсионные фонды</p>
        <div className="mt-4 flex items-end gap-2">
          <p className="text-3xl font-bold text-white">{formatCurrency(totalSaved)}</p>
          <p className="text-white/60 text-sm mb-1">из {formatCurrency(totalTarget)}</p>
        </div>
        {totalTarget > 0 && (
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalSaved / totalTarget) * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-semibold text-gray-900">Цели накоплений</p>
            <button onClick={() => setShowAddGoal(true)}
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center active:opacity-70">
              <Plus size={18} color="#fff" />
            </button>
          </div>

          {(!goals || goals.length === 0) && (
            <p className="text-center text-muted text-sm py-8">Целей пока нет</p>
          )}

          {goals?.map(goal => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
            return (
              <div key={goal.id} className="card p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
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
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-lg font-bold" style={{ color: goal.colorHex }}>{Math.round(pct)}%</p>
                    <div className="flex gap-1">
                      <button onClick={() => setEditGoal(goal)}
                        className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center active:opacity-70">
                        <Edit2 size={13} color="#2D6CDF" />
                      </button>
                      <button onClick={() => askDelete(`Удалить цель "${goal.title}"?`, () => goal.id && db.savingsGoals.delete(goal.id))}
                        className="w-7 h-7 rounded-full bg-expense/10 flex items-center justify-center active:opacity-70">
                        <Trash2 size={13} color="#FF453A" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: goal.colorHex }} />
                </div>

                <button onClick={() => setDepositGoal(goal)}
                  className="w-full py-2 rounded-ios border border-primary text-primary text-sm font-medium active:opacity-70">
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
            <button onClick={() => setShowAddFund(true)}
              className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center active:opacity-70">
              <Plus size={18} color="#fff" />
            </button>
          </div>

          {(!funds || funds.length === 0) && (
            <p className="text-center text-muted text-sm py-8">Фондов пока нет</p>
          )}

          {funds?.map(fund => (
            <div key={fund.id} className="card p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
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
                    {fund.owner === 'ilya' ? 'Филипп' : 'Анастасия'} •
                    +{formatCurrency(fund.monthlyContribution)}/мес •
                    Работодатель: {fund.employerContributionPercent}%
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditFund(fund)}
                    className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center active:opacity-70">
                    <Edit2 size={13} color="#2D6CDF" />
                  </button>
                  <button onClick={() => askDelete(`Удалить фонд "${fund.name}"?`, () => fund.id && db.pensionFunds.delete(fund.id))}
                    className="w-7 h-7 rounded-full bg-expense/10 flex items-center justify-center active:opacity-70">
                    <Trash2 size={13} color="#FF453A" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-gray-900">{formatCurrency(fund.currentBalance)}</p>
                <p className="text-xs text-muted">
                  Обновлено: {new Date(fund.lastUpdated).toLocaleDateString('ru-IL')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {depositGoal && <DepositSheet goal={depositGoal} onClose={() => setDepositGoal(null)} />}
      {showAddGoal && <GoalModal onClose={() => setShowAddGoal(false)} />}
      {editGoal && <GoalModal goal={editGoal} onClose={() => setEditGoal(undefined)} />}
      {showAddFund && <FundModal onClose={() => setShowAddFund(false)} />}
      {editFund && <FundModal fund={editFund} onClose={() => setEditFund(undefined)} />}
      {confirmDelete && (
        <ConfirmSheet
          message={confirmDelete.message}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
