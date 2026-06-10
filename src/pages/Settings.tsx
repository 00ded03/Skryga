import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Edit2, X, Download, Upload, Trash2, Bell, ChevronRight } from 'lucide-react'
import { db } from '../db/database'
import { expenseCategories, getCategoryName } from '../data/categories'
import { formatCurrency, fmtInputNum, parseInputNum } from '../lib/currency'
import { useScrollLock } from '../hooks/useScrollLock'
import type { FamilySettings, BudgetLimit } from '../types'
import * as LucideIcons from 'lucide-react'

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
  const settings = useLiveQuery(() => db.settings.toArray().then(r => r[0]), [])
  const limits = useLiveQuery(() => db.budgetLimits.toArray(), [])

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [limitModal, setLimitModal] = useState<BudgetLimit | null | 'new'>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notif_enabled') === 'true')

  function toggleNotif() {
    const next = !notifEnabled
    setNotifEnabled(next)
    localStorage.setItem('notif_enabled', String(next))
  }

  function handleExportCSV() {
    db.transactions.toArray().then(txs => {
      const header = 'Дата,Тип,Категория,Подкатегория,Название,Сумма,Владелец,Заметки'
      const rows = txs.map(t => {
        const date = new Date(t.date).toLocaleDateString('ru-IL')
        return [date, t.type === 'income' ? 'Доход' : 'Расход', t.categoryKey, t.subcategoryKey || '',
          `"${t.title.replace(/"/g, '""')}"`, t.amount, t.owner, `"${(t.notes || '').replace(/"/g, '""')}"`].join(',')
      })
      const csv = [header, ...rows].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `skryga_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    })
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    alert(`Файл "${file.name}" получен. Импорт будет реализован в следующей версии.`)
    e.target.value = ''
  }

  async function handleClearData() {
    await db.transactions.clear(); await db.savingsGoals.clear()
    await db.pensionFunds.clear(); await db.budgetLimits.clear(); await db.settings.clear()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="pt-12 pb-4 px-4 bg-white border-b border-black/5">
        <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
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
            <SettingsRow icon={<Upload size={18} color="#2D6CDF" />} label="Импортировать выписку" value="CSV/PDF"
              rightEl={<label className="cursor-pointer"><ChevronRight size={16} color="#C7C7CC" /><input type="file" accept=".csv,.pdf" onChange={handleImportCSV} className="hidden" /></label>} />
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
