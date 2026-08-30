import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Edit2, X, Download, Upload, Trash2, Bell, ChevronRight, LogOut, UserRound, UserPlus, Cloud } from 'lucide-react'
import { db } from '../db/database'
import { allCategories, expenseCategories, getCategoryName } from '../data/categories'
import { formatCurrency, fmtInputNum, parseInputNum } from '../lib/currency'
import { useScrollLock } from '../hooks/useScrollLock'
import type {
  FamilySettings, BudgetLimit, BudgetOwner, Transaction, TransactionType, SavingsGoal, PensionFund,
} from '../types'
import * as LucideIcons from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { useCloudSync } from '../sync/CloudSyncProvider'

const CSV_HEADER = ['Дата', 'Тип', 'Категория', 'Подкатегория', 'Название', 'Сумма', 'Владелец', 'Заметки']
const BACKUP_VERSION = 1

interface SkrygaBackup {
  app: 'skryga'
  version: number
  exportedAt: string
  data: {
    transactions: Transaction[]
    savingsGoals: SavingsGoal[]
    pensionFunds: PensionFund[]
    budgetLimits: BudgetLimit[]
    settings: FamilySettings[]
  }
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''))
      if (row.some(value => value.trim())) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell.replace(/\r$/, ''))
  if (row.some(value => value.trim())) rows.push(row)
  return rows
}

function parseCsvDate(value: string): Date | null {
  const trimmed = value.trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const localMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  const parts = isoMatch
    ? [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])]
    : localMatch
      ? [Number(localMatch[3]), Number(localMatch[2]), Number(localMatch[1])]
      : null
  if (!parts) return null
  const [year, month, day] = parts
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function transactionFingerprint(tx: Pick<Transaction, 'date' | 'type' | 'categoryKey' | 'title' | 'amount' | 'owner'>): string {
  return [new Date(tx.date).toISOString().slice(0, 10), tx.type, tx.categoryKey, tx.title.trim(), tx.amount, tx.owner].join('|')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function parseBackup(raw: unknown): SkrygaBackup | null {
  if (!isObject(raw) || raw.app !== 'skryga' || raw.version !== BACKUP_VERSION || !isObject(raw.data)) return null
  const { data } = raw
  if (!Array.isArray(data.transactions) || !Array.isArray(data.savingsGoals)
    || !Array.isArray(data.pensionFunds) || !Array.isArray(data.budgetLimits) || !Array.isArray(data.settings)) return null

  const transactions = data.transactions.map(item => {
    if (!isObject(item)) return null
    const date = new Date(String(item.date))
    const createdAt = new Date(String(item.createdAt))
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(createdAt.getTime())
      || !isFiniteNonNegative(item.amount) || item.amount === 0
      || (item.type !== 'income' && item.type !== 'expense')
      || !allCategories.some(category => category.key === item.categoryKey && category.type === item.type)
      || typeof item.title !== 'string' || !item.title.trim()
      || !['family', 'ilya', 'anastasia'].includes(String(item.owner))) return null
    return { ...item, date, createdAt } as unknown as Transaction
  })
  const savingsGoals = data.savingsGoals.map(item => {
    if (!isObject(item)) return null
    const createdAt = new Date(String(item.createdAt))
    const deadline = item.deadline ? new Date(String(item.deadline)) : undefined
    if (!Number.isFinite(createdAt.getTime()) || (deadline && !Number.isFinite(deadline.getTime()))
      || typeof item.title !== 'string' || !item.title.trim()
      || !isFiniteNonNegative(item.targetAmount) || item.targetAmount === 0
      || !isFiniteNonNegative(item.currentAmount)) return null
    return { ...item, createdAt, deadline } as unknown as SavingsGoal
  })
  const pensionFunds = data.pensionFunds.map(item => {
    if (!isObject(item)) return null
    const lastUpdated = new Date(String(item.lastUpdated))
    if (!Number.isFinite(lastUpdated.getTime()) || typeof item.name !== 'string' || !item.name.trim()
      || !isFiniteNonNegative(item.currentBalance) || !isFiniteNonNegative(item.monthlyContribution)
      || !isFiniteNonNegative(item.employerContributionPercent)
      || !['pension', 'keren_hishtalmut', 'pitzuim', 'investment'].includes(String(item.fundType))
      || !['ilya', 'anastasia'].includes(String(item.owner))) return null
    return { ...item, lastUpdated } as unknown as PensionFund
  })

  const validLimits = data.budgetLimits.every(item => isObject(item)
    && allCategories.some(category => category.type === 'expense' && category.key === item.categoryKey)
    && isFiniteNonNegative(item.monthlyLimit) && item.monthlyLimit > 0
    && isFiniteNonNegative(item.alertPercent) && item.alertPercent <= 100)
  const validSettings = data.settings.every(item => isObject(item)
    && typeof item.member1Name === 'string' && typeof item.member2Name === 'string'
    && typeof item.currency === 'string' && typeof item.monthStartDay === 'number'
    && item.monthStartDay >= 1 && item.monthStartDay <= 28)

  if (transactions.some(item => !item) || savingsGoals.some(item => !item) || pensionFunds.some(item => !item)
    || !validLimits || !validSettings) return null

  return {
    app: 'skryga',
    version: BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    data: {
      transactions: transactions as Transaction[],
      savingsGoals: savingsGoals as SavingsGoal[],
      pensionFunds: pensionFunds as PensionFund[],
      budgetLimits: data.budgetLimits as unknown as BudgetLimit[],
      settings: data.settings as unknown as FamilySettings[],
    },
  }
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-12 h-7 rounded-full relative transition-colors overflow-hidden flex-shrink-0 ${enabled ? 'bg-income' : 'bg-gray-300'}`}
    >
      <span
        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: enabled ? 22 : 2 }}
      />
    </button>
  )
}

// ── Edit Profile ─────────────────────────────────────────────────────────────

function EditProfileModal({ settings, onClose }: { settings: FamilySettings; onClose: () => void }) {
  useScrollLock()
  const [m1Name, setM1Name] = useState(settings.member1Name)
  const [m1Emoji, setM1Emoji] = useState(settings.member1Emoji)
  const [m2Name, setM2Name] = useState(settings.member2Name)
  const [m2Emoji, setM2Emoji] = useState(settings.member2Emoji)

  async function handleSave() {
    await db.settings.update(settings.id!, { member1Name: m1Name, member1Emoji: m1Emoji, member2Name: m2Name, member2Emoji: m2Emoji })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" style={{ maxHeight: '85dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-3 border-b border-black/5">
          <h3 className="text-base font-semibold text-gray-900">Редактировать профиль</h3>
          <button onClick={onClose} className="active:opacity-70"><X size={22} color="#8E8E93" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-xs text-muted font-medium uppercase tracking-wide">Участник 1</p>
          <div className="flex gap-3">
            <input type="text" placeholder="Эмодзи" value={m1Emoji} onChange={e => setM1Emoji(e.target.value)}
              className="input-field w-20 text-center text-2xl" maxLength={2} />
            <input type="text" placeholder="Имя" value={m1Name} onChange={e => setM1Name(e.target.value)} className="input-field flex-1" />
          </div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide">Участник 2</p>
          <div className="flex gap-3">
            <input type="text" placeholder="Эмодзи" value={m2Emoji} onChange={e => setM2Emoji(e.target.value)}
              className="input-field w-20 text-center text-2xl" maxLength={2} />
            <input type="text" placeholder="Имя" value={m2Name} onChange={e => setM2Name(e.target.value)} className="input-field flex-1" />
          </div>
        </div>
        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleSave} className="btn-primary w-full">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

// ── Budget Limit Modal ────────────────────────────────────────────────────────

function BudgetLimitModal({ limit, onClose }: { limit?: BudgetLimit; onClose: () => void }) {
  useScrollLock()
  const isEdit = !!limit
  const [selectedCategory, setSelectedCategory] = useState(limit?.categoryKey ?? '')
  const [amount, setAmount] = useState(limit ? fmtInputNum(String(limit.monthlyLimit)) : '')
  const [alertPct, setAlertPct] = useState(String(limit?.alertPercent ?? 80))

  async function handleSave() {
    if (!selectedCategory || !amount) return
    const data = { categoryKey: selectedCategory, monthlyLimit: parseInputNum(amount), alertPercent: parseFloat(alertPct) || 80 }
    if (isEdit && limit!.id) {
      await db.budgetLimits.update(limit!.id, data)
    } else {
      await db.budgetLimits.add(data)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-ios-xl flex flex-col" style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2 border-b border-black/5">
          <h3 className="text-base font-semibold text-gray-900">{isEdit ? 'Редактировать лимит' : 'Новый лимит'}</h3>
          <button onClick={onClose} className="active:opacity-70"><X size={22} color="#8E8E93" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-4" style={{ overscrollBehavior: 'contain' }}>

          {/* Category selector */}
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Категория</p>
            <div className="grid grid-cols-4 gap-2">
              {expenseCategories.map(cat => {
                const isSelected = selectedCategory === cat.key
                const iconKey = cat.icon as keyof typeof LucideIcons
                const Icon = (LucideIcons[iconKey] as React.FC<{ size?: number; color?: string }>) || LucideIcons.MoreHorizontal
                return (
                  <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                    className="flex flex-col items-center gap-1 active:opacity-70">
                    <div className="w-12 h-12 rounded-ios flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: isSelected ? `0 0 0 3px ${cat.color}60, 0 0 0 5px ${cat.color}30` : 'none',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      }}>
                      <Icon size={22} color="#fff" />
                    </div>
                    <span className="text-[10px] text-center leading-tight text-gray-700 truncate w-full">{cat.nameRu}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Месячный лимит</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">₪</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(fmtInputNum(e.target.value))}
                className="input-field pl-7 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Alert percent */}
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Уведомить при достижении</p>
            <div className="flex gap-2">
              {[50, 70, 80, 90].map(pct => (
                <button key={pct} onClick={() => setAlertPct(String(pct))}
                  className={`flex-1 py-2.5 rounded-ios text-sm font-medium transition-colors ${alertPct === String(pct) ? 'bg-primary text-white' : 'bg-background text-muted'}`}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 pt-2 pb-4 bg-white border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom,8px),16px)' }}>
          <button onClick={handleSave} disabled={!selectedCategory || !amount}
            className={`btn-primary w-full ${!selectedCategory || !amount ? 'opacity-40' : ''}`}>
            {isEdit ? 'Сохранить' : 'Добавить лимит'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Budget Limit Row ──────────────────────────────────────────────────────────

function BudgetLimitRow({ limit, onEdit }: { limit: BudgetLimit; onEdit: (l: BudgetLimit) => void }) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-black/5 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{getCategoryName(limit.categoryKey)}</p>
        <p className="text-xs text-muted">Лимит: {formatCurrency(limit.monthlyLimit)}/мес · уведомление {limit.alertPercent}%</p>
      </div>
      <button onClick={() => onEdit(limit)} className="p-2 active:opacity-70"><Edit2 size={16} color="#2D6CDF" /></button>
      <button onClick={() => limit.id && db.budgetLimits.delete(limit.id)} className="p-2 active:opacity-70"><Trash2 size={16} color="#FF453A" /></button>
    </div>
  )
}

// ── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({ icon, label, value, onClick, danger, rightEl }: {
  icon: React.ReactNode; label: string; value?: string; onClick?: () => void; danger?: boolean; rightEl?: React.ReactNode
}) {
  return (
    <button className="flex items-center gap-3 w-full px-4 py-3.5 border-b border-black/5 last:border-0 active:bg-black/5 text-left" onClick={onClick}>
      <span className="flex-shrink-0">{icon}</span>
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-expense' : 'text-gray-900'}`}>{label}</span>
      {value && <span className="text-sm text-muted">{value}</span>}
      {rightEl}
      {!rightEl && onClick && <ChevronRight size={16} color="#C7C7CC" />}
    </button>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-ios-lg p-6 w-full max-w-sm shadow-card-lg">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Подтвердите действие</h3>
        <p className="text-sm text-muted mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-background rounded-ios text-sm font-medium text-gray-900 active:opacity-70">Отмена</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-expense rounded-ios text-white text-sm font-semibold active:opacity-70">Удалить</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth()
  const { familyId, role, status: syncStatus, lastSyncedAt } = useCloudSync()
  const settings = useLiveQuery(() => db.settings.toArray().then(r => r[0]), [])
  const limits = useLiveQuery(() => db.budgetLimits.toArray(), [])

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [limitModal, setLimitModal] = useState<BudgetLimit | null | 'new'>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notif_enabled') === 'true')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')

  function toggleNotif() {
    const next = !notifEnabled
    setNotifEnabled(next)
    localStorage.setItem('notif_enabled', String(next))
  }

  function handleExportCSV() {
    db.transactions.toArray().then(txs => {
      const header = CSV_HEADER.join(',')
      const rows = txs.map(t => {
        const date = new Date(t.date).toISOString().slice(0, 10)
        return [date, t.type === 'income' ? 'Доход' : 'Расход', t.categoryKey, t.subcategoryKey || '',
          t.title, t.amount, t.owner, t.notes || ''].map(csvCell).join(',')
      })
      const csv = [header, ...rows].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `skryga_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    })
  }

  async function handleExportBackup() {
    const [transactions, savingsGoals, pensionFunds, budgetLimits, allSettings] = await Promise.all([
      db.transactions.toArray(), db.savingsGoals.toArray(), db.pensionFunds.toArray(),
      db.budgetLimits.toArray(), db.settings.toArray(),
    ])
    const backup: SkrygaBackup = {
      app: 'skryga',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { transactions, savingsGoals, pensionFunds, budgetLimits, settings: allSettings },
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skryga_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleRestoreBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size > 20 * 1024 * 1024) {
        alert('Выберите JSON-копию «Скряги» размером не более 20 МБ.')
        return
      }
      const backup = parseBackup(JSON.parse(await file.text()) as unknown)
      if (!backup) {
        alert('Файл не является совместимой резервной копией «Скряги».')
        return
      }
      const counts = backup.data
      const confirmed = window.confirm(
        `Заменить текущие данные резервной копией?\n\n` +
        `Операции: ${counts.transactions.length}\nЦели: ${counts.savingsGoals.length}\n` +
        `Фонды: ${counts.pensionFunds.length}\nЛимиты: ${counts.budgetLimits.length}\n\n` +
        'Перед восстановлением рекомендуется скачать копию текущих данных.'
      )
      if (!confirmed) return

      await db.transaction('rw', [db.transactions, db.savingsGoals, db.pensionFunds, db.budgetLimits, db.settings], async () => {
        await Promise.all([
          db.transactions.clear(), db.savingsGoals.clear(), db.pensionFunds.clear(),
          db.budgetLimits.clear(), db.settings.clear(),
        ])
        if (counts.transactions.length) await db.transactions.bulkAdd(counts.transactions)
        if (counts.savingsGoals.length) await db.savingsGoals.bulkAdd(counts.savingsGoals)
        if (counts.pensionFunds.length) await db.pensionFunds.bulkAdd(counts.pensionFunds)
        if (counts.budgetLimits.length) await db.budgetLimits.bulkAdd(counts.budgetLimits)
        if (counts.settings.length) await db.settings.bulkAdd(counts.settings)
      })
      alert('Резервная копия восстановлена. Приложение будет перезагружено.')
      window.location.reload()
    } catch (error) {
      console.error('Backup restore failed:', error)
      alert('Не удалось восстановить резервную копию. Текущие данные не изменены.')
    } finally {
      e.target.value = ''
    }
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Импорт поддерживает только CSV-файлы, экспортированные из «Скряги».')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('CSV-файл слишком большой. Максимальный размер — 5 МБ.')
        return
      }

      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
      const header = rows.shift()?.map(value => value.trim())
      if (!header || CSV_HEADER.some((name, index) => header[index] !== name)) {
        alert('Не удалось распознать структуру CSV. Используйте файл, экспортированный из «Скряги».')
        return
      }

      const existing = new Set((await db.transactions.toArray()).map(transactionFingerprint))
      const validCategories = new Set(allCategories.map(category => category.key))
      const validOwners = new Set<BudgetOwner>(['family', 'ilya', 'anastasia'])
      const imported: Transaction[] = []
      let skipped = 0

      for (const columns of rows) {
        const [dateValue, typeValue, categoryKey, subcategoryKey, title, amountValue, ownerValue, notes] = columns
        const date = parseCsvDate(dateValue ?? '')
        const type: TransactionType | null = typeValue === 'Доход' || typeValue === 'income'
          ? 'income'
          : typeValue === 'Расход' || typeValue === 'expense' ? 'expense' : null
        const amount = Number(String(amountValue ?? '').replace(/\s/g, '').replace(',', '.'))
        const owner = ownerValue as BudgetOwner
        const categoryMatchesType = allCategories.some(category => category.key === categoryKey && category.type === type)

        if (!date || !type || !categoryKey || !validCategories.has(categoryKey) || !categoryMatchesType || !title?.trim()
          || !Number.isFinite(amount) || amount <= 0 || !validOwners.has(owner)) {
          skipped += 1
          continue
        }

        const transaction: Transaction = {
          date,
          type,
          categoryKey,
          subcategoryKey: subcategoryKey || undefined,
          title: title.trim(),
          amount,
          owner,
          notes: notes?.trim() || undefined,
          isFromScan: false,
          createdAt: new Date(),
        }
        const fingerprint = transactionFingerprint(transaction)
        if (existing.has(fingerprint)) {
          skipped += 1
          continue
        }
        existing.add(fingerprint)
        imported.push(transaction)
      }

      if (imported.length) await db.transactions.bulkAdd(imported)
      alert(`Импорт завершён: добавлено ${imported.length}, пропущено ${skipped}.`)
    } catch (error) {
      console.error('CSV import failed:', error)
      alert('Не удалось импортировать CSV. Файл повреждён или имеет неподдерживаемый формат.')
    } finally {
      e.target.value = ''
    }
  }

  async function handleClearData() {
    await db.transactions.clear(); await db.savingsGoals.clear()
    await db.pensionFunds.clear(); await db.budgetLimits.clear(); await db.settings.clear()
    window.location.reload()
  }

  async function handleSignOut() {
    const confirmed = window.confirm('Выйти из аккаунта на этом устройстве? Локальные финансовые данные останутся в браузере.')
    if (!confirmed || !supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) alert('Не удалось выйти. Попробуйте ещё раз.')
  }

  async function handleInvite() {
    if (!supabase || !user || !familyId || !inviteEmail.trim()) return
    setInviteMessage('')
    const { data, error } = await supabase.from('family_invitations').insert({
      family_id: familyId,
      email: inviteEmail.trim().toLowerCase(),
      invited_by: user.id,
    }).select('token').single()
    if (error) {
      setInviteMessage('Не удалось создать приглашение.')
      return
    }
    const inviteUrl = `${window.location.origin}/?invite=${data.token}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteMessage('Ссылка скопирована. Отправьте её члену семьи.')
    } catch {
      setInviteMessage(`Ссылка: ${inviteUrl}`)
    }
    setInviteEmail('')
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="pt-12 pb-4 px-4 bg-white border-b border-black/5">
        <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Аккаунт</p>
          <div className="card overflow-hidden">
            <SettingsRow icon={<UserRound size={18} color="#2D6CDF" />} label={user?.email ?? 'Пользователь'} />
            <SettingsRow icon={<Cloud size={18} color={syncStatus === 'error' ? '#FF453A' : '#30A46C'} />}
              label="Облачная синхронизация"
              value={syncStatus === 'syncing' ? 'Синхронизация…' : syncStatus === 'error' ? 'Ошибка' : lastSyncedAt ? 'Включена' : 'Подключение…'} />
            {role === 'owner' && (
              <div className="px-4 py-4 border-b border-black/5">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus size={18} color="#2D6CDF" />
                  <span className="text-sm font-medium text-gray-900">Пригласить в семью</span>
                </div>
                <div className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)}
                    placeholder="email участника" className="input-field text-sm select-text" />
                  <button onClick={handleInvite} disabled={!inviteEmail.trim() || !familyId}
                    className="px-4 rounded-ios bg-primary text-white text-sm font-semibold disabled:opacity-40">Создать ссылку</button>
                </div>
                {inviteMessage && <p className="text-xs text-muted mt-2 break-all">{inviteMessage}</p>}
              </div>
            )}
            <SettingsRow icon={<LogOut size={18} color="#FF453A" />} label="Выйти из аккаунта" danger onClick={handleSignOut} />
          </div>
        </div>

        {/* Profile */}
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Профиль</p>
          <div className="card overflow-hidden">
            {settings && (
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">{settings.member1Emoji}</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: '#7B5CF020' }}>{settings.member2Emoji}</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{settings.member1Name} & {settings.member2Name}</p>
                  <p className="text-xs text-muted">Семья • {settings.currency}</p>
                </div>
                <button onClick={() => setShowEditProfile(true)} className="p-2 active:opacity-70"><Edit2 size={18} color="#2D6CDF" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Budget limits */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs text-muted font-medium uppercase tracking-wide">Лимиты бюджета</p>
            <button onClick={() => setLimitModal('new')} className="text-xs text-primary font-medium active:opacity-70">+ Добавить</button>
          </div>
          <div className="card overflow-hidden">
            {(!limits || limits.length === 0) ? (
              <p className="text-center text-muted text-sm py-6">Лимиты не установлены</p>
            ) : (
              limits.map(l => <BudgetLimitRow key={l.id} limit={l} onEdit={l => setLimitModal(l)} />)
            )}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Уведомления</p>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Bell size={18} color="#8E8E93" />
              <span className="flex-1 text-sm font-medium text-gray-900">Уведомления</span>
              <Toggle enabled={notifEnabled} onToggle={toggleNotif} />
            </div>
          </div>
        </div>

        {/* Data */}
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Данные</p>
          <div className="card overflow-hidden">
            <SettingsRow icon={<Download size={18} color="#30A46C" />} label="Скачать полную копию" value="JSON"
              onClick={handleExportBackup} />
            <SettingsRow icon={<Upload size={18} color="#30A46C" />} label="Восстановить полную копию"
              rightEl={<label className="cursor-pointer"><ChevronRight size={16} color="#C7C7CC" /><input type="file" accept=".json,application/json" onChange={handleRestoreBackup} className="hidden" /></label>} />
            <SettingsRow icon={<Upload size={18} color="#2D6CDF" />} label="Восстановить из CSV"
              rightEl={<label className="cursor-pointer"><ChevronRight size={16} color="#C7C7CC" /><input type="file" accept=".csv,text/csv" onChange={handleImportCSV} className="hidden" /></label>} />
            <SettingsRow icon={<Download size={18} color="#2D6CDF" />} label="Скачать CSV" onClick={handleExportCSV} />
          </div>
        </div>

        {/* Danger */}
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">Опасная зона</p>
          <div className="card overflow-hidden">
            <SettingsRow icon={<Trash2 size={18} color="#FF453A" />} label="Очистить все данные" danger onClick={() => setShowDeleteConfirm(true)} />
          </div>
        </div>

        {/* About */}
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2 px-1">О приложении</p>
          <div className="card overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Skryga Finance</span>
              <span className="text-sm text-muted">v1.0.0</span>
            </div>
            <div className="px-4 py-3 border-t border-black/5">
              <p className="text-xs text-muted text-center">Семейный финансовый планировщик для Израиля 🇮🇱</p>
            </div>
          </div>
        </div>
      </div>

      {showEditProfile && settings && <EditProfileModal settings={settings} onClose={() => setShowEditProfile(false)} />}
      {limitModal !== null && (
        <BudgetLimitModal
          limit={limitModal === 'new' ? undefined : limitModal}
          onClose={() => setLimitModal(null)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmDialog
          message="Это удалит все транзакции, цели накоплений и настройки. Действие необратимо."
          onConfirm={handleClearData}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
