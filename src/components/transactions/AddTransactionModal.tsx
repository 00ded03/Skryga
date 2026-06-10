import React, { useState, useEffect } from 'react'
import { X, Camera, Check } from 'lucide-react'
import { db } from '../../db/database'
import { expenseCategories, incomeCategories } from '../../data/categories'
import { useStore } from '../../store/useStore'
import type { AppCategory, BudgetOwner } from '../../types'
import * as LucideIcons from 'lucide-react'

const QUICK_AMOUNTS = [50, 100, 200, 500]

const OWNER_OPTIONS: { value: BudgetOwner; label: string; color: string }[] = [
  { value: 'family', label: 'Семейные', color: '#2D6CDF' },
  { value: 'ilya', label: 'Илья', color: '#2D6CDF' },
  { value: 'anastasia', label: 'Анастасия', color: '#7B5CF0' },
]

export default function AddTransactionModal() {
  const { closeAddTransaction, defaultTransactionType, openScanner } = useStore()

  const [txType, setTxType] = useState<'expense' | 'income'>(defaultTransactionType)
  const [amountStr, setAmountStr] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | null>(null)
  const [selectedSubcategoryKey, setSelectedSubcategoryKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [owner, setOwner] = useState<BudgetOwner>('family')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const categories = txType === 'expense' ? expenseCategories : incomeCategories

  useEffect(() => {
    setSelectedCategory(null)
    setSelectedSubcategoryKey(null)
    setTitle('')
  }, [txType])

  useEffect(() => {
    if (selectedCategory && !title) {
      setTitle(selectedCategory.nameRu)
    }
  }, [selectedCategory])

  function handleAmountKey(key: string) {
    if (key === 'backspace') {
      setAmountStr((s) => s.slice(0, -1))
      return
    }
    if (key === '.' && amountStr.includes('.')) return
    if (amountStr.length >= 8) return
    setAmountStr((s) => s + key)
  }

  function addQuickAmount(v: number) {
    const current = parseFloat(amountStr) || 0
    setAmountStr(String(current + v))
  }

  async function handleSave() {
    const amount = parseFloat(amountStr)
    if (!amount || amount <= 0) return
    if (!selectedCategory) return
    setSaving(true)
    try {
      await db.transactions.add({
        date: new Date(date),
        amount,
        type: txType,
        categoryKey: selectedCategory.key,
        subcategoryKey: selectedSubcategoryKey || undefined,
        title: title || selectedCategory.nameRu,
        notes: notes || undefined,
        owner,
        isFromScan: false,
        createdAt: new Date(),
      })
      closeAddTransaction()
    } finally {
      setSaving(false)
    }
  }

  const amount = parseFloat(amountStr) || 0
  const canSave = amount > 0 && !!selectedCategory

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end">
      <div
        className="w-full bg-background rounded-t-ios-xl overflow-y-auto"
        style={{
          maxHeight: '95vh',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          animation: 'slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Handle + close */}
        <div className="flex items-center justify-center pt-3 pb-1 relative">
          <div className="w-10 h-1 bg-black/10 rounded-full" />
          <button
            onClick={closeAddTransaction}
            className="absolute right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center active:opacity-70 shadow-card"
          >
            <X size={18} color="#8E8E93" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Type tabs */}
          <div className="flex bg-white rounded-ios p-1 gap-1 shadow-card mt-2">
            <button
              onClick={() => setTxType('expense')}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
                txType === 'expense' ? 'bg-expense text-white' : 'text-muted'
              }`}
            >
              Расход
            </button>
            <button
              onClick={() => setTxType('income')}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
                txType === 'income' ? 'bg-income text-white' : 'text-muted'
              }`}
            >
              Доход
            </button>
          </div>

          {/* Amount display */}
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span
                className="text-4xl font-bold"
                style={{ color: txType === 'income' ? '#30D158' : '#FF453A' }}
              >
                ₪
              </span>
              <span
                className={`text-5xl font-bold ${!amountStr ? 'text-gray-300' : ''}`}
                style={{ color: amountStr ? (txType === 'income' ? '#30D158' : '#FF453A') : undefined }}
              >
                {amountStr || '0'}
              </span>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {['1','2','3','4','5','6','7','8','9','.','0','backspace'].map((k) => (
                <button
                  key={k}
                  onClick={() => handleAmountKey(k)}
                  className="py-3 rounded-ios bg-background text-lg font-medium text-gray-900 active:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  {k === 'backspace' ? '⌫' : k}
                </button>
              ))}
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-3">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  onClick={() => addQuickAmount(v)}
                  className="flex-1 py-2 rounded-ios bg-primary/10 text-primary text-sm font-medium active:opacity-70"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Category grid */}
          <div className="card p-4">
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Категория</p>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((cat) => {
                const isSelected = selectedCategory?.key === cat.key
                const iconKey = cat.icon as keyof typeof LucideIcons
                const Icon = (LucideIcons[iconKey] as React.FC<{ size?: number; color?: string }>) || LucideIcons.MoreHorizontal
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedCategory(cat)
                      setSelectedSubcategoryKey(null)
                    }}
                    className="flex flex-col items-center gap-1.5 active:opacity-70"
                  >
                    <div
                      className="w-12 h-12 rounded-ios flex items-center justify-center transition-transform"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: isSelected ? `0 0 0 3px ${cat.color}60, 0 0 0 5px ${cat.color}30` : 'none',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <Icon size={22} color="#fff" />
                    </div>
                    <span className="text-[10px] text-center leading-tight text-gray-700 truncate w-full px-0.5">
                      {cat.nameRu}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subcategories */}
          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <div className="card p-4">
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Подкатегория</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {selectedCategory.subcategories.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setSelectedSubcategoryKey(sub.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedSubcategoryKey === sub.key
                        ? 'bg-primary text-white'
                        : 'bg-background text-gray-700'
                    }`}
                  >
                    {sub.nameRu}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          <div className="card p-4 space-y-3">
            <div>
              <p className="text-xs text-muted font-medium mb-1">Название</p>
              <input
                type="text"
                placeholder={selectedCategory?.nameRu || 'Название операции'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-1">Дата</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-2">Кто платит</p>
              <div className="flex gap-2">
                {OWNER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOwner(opt.value)}
                    className={`flex-1 py-2.5 rounded-ios text-sm font-medium transition-colors ${
                      owner === opt.value ? 'text-white' : 'bg-background text-muted'
                    }`}
                    style={owner === opt.value ? { backgroundColor: opt.color } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-1">Заметка (необязательно)</p>
              <textarea
                placeholder="Комментарий..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input-field resize-none"
              />
            </div>
          </div>

          {/* Scan receipt */}
          <button
            onClick={() => {
              closeAddTransaction()
              openScanner()
            }}
            className="w-full py-3 rounded-ios border-2 border-primary/30 flex items-center justify-center gap-2 text-primary font-medium text-sm active:opacity-70"
          >
            <Camera size={18} />
            Сканировать чек
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${
              !canSave ? 'opacity-40' : ''
            }`}
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
