import React, { useState, useEffect, useRef } from 'react'
import { X, Camera, Check, Loader2, Plus, FileText } from 'lucide-react'
import { db } from '../../db/database'
import { expenseCategories, incomeCategories } from '../../data/categories'
import { useStore } from '../../store/useStore'
import type { AppCategory, BudgetOwner } from '../../types'
import * as LucideIcons from 'lucide-react'

const QUICK_AMOUNTS = [50, 100, 200, 500]

const OWNER_OPTIONS: { value: BudgetOwner; label: string; color: string }[] = [
  { value: 'family', label: 'Семейные', color: '#2D6CDF' },
  { value: 'ilya', label: 'Филипп', color: '#2D6CDF' },
  { value: 'anastasia', label: 'Анастасия', color: '#7B5CF0' },
]

export default function AddTransactionModal() {
  const { closeAddTransaction, defaultTransactionType } = useStore()

  const [txType, setTxType] = useState<'expense' | 'income'>(defaultTransactionType)
  const [amountStr, setAmountStr] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | null>(null)
  const [selectedSubcategoryKey, setSelectedSubcategoryKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [owner, setOwner] = useState<BudgetOwner>('family')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const categories = txType === 'expense' ? expenseCategories : incomeCategories

  // Lock body scroll while modal is open (fix #3)
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

  useEffect(() => {
    setSelectedCategory(null)
    setSelectedSubcategoryKey(null)
    setTitle('')
  }, [txType])

  useEffect(() => {
    if (selectedCategory && !title) setTitle(selectedCategory.nameRu)
  }, [selectedCategory])

  function handleAmountKey(key: string) {
    if (key === 'backspace') { setAmountStr(s => s.slice(0, -1)); return }
    if (key === '.' && amountStr.includes('.')) return
    if (amountStr.length >= 8) return
    setAmountStr(s => s + key)
  }

  function addQuickAmount(v: number) {
    const current = parseFloat(amountStr) || 0
    setAmountStr(String(current + v))
  }

  async function scanFile(file: File, documentType?: 'receipt' | 'salary_slip') {
    setScanning(true)
    setScanMsg(documentType === 'salary_slip' ? 'Читаю тлуш…' : 'Читаю чек…')
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1])
        reader.readAsDataURL(file)
      })
      setScanMsg('Распознаю…')
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type, documentType }),
      })
      const result = await res.json()
      if (result.amount) setAmountStr(String(result.amount))
      if (result.title || result.merchantName) setTitle(result.title || result.merchantName)
      if (result.date) setDate(result.date)
      if (result.suggestedCategoryKey) {
        const all = [...expenseCategories, ...incomeCategories]
        const cat = all.find(c => c.key === result.suggestedCategoryKey)
        if (cat) { setSelectedCategory(cat); setTxType(cat.type) }
      }
      setScanMsg('Готово!')
      setTimeout(() => setScanMsg(''), 1500)
    } catch {
      setScanMsg('Не удалось распознать')
      setTimeout(() => setScanMsg(''), 2000)
    } finally {
      setScanning(false)
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await scanFile(file, 'receipt')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await scanFile(file, 'salary_slip')
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  async function handleSave() {
    const amount = parseFloat(amountStr)
    if (!amount || amount <= 0 || !selectedCategory) return
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
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end"
      onClick={e => e.target === e.currentTarget && closeAddTransaction()}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handlePdfSelected}
      />

      {/* Modal sheet — flex column so footer is always visible (fix #2) */}
      <div
        className="w-full bg-background rounded-t-ios-xl flex flex-col"
        style={{
          maxHeight: '95dvh',
          animation: 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* ── Fixed header ── */}
        <div className="flex-shrink-0 flex items-center justify-center pt-3 pb-1 relative">
          <div className="w-10 h-1 bg-black/10 rounded-full" />
          <button
            onClick={closeAddTransaction}
            className="absolute right-4 w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center active:opacity-70"
          >
            <X size={18} color="#8E8E93" />
          </button>
        </div>

        {/* Type switcher in header */}
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="flex bg-white rounded-ios p-1 gap-1 shadow-card">
            <button
              onClick={() => setTxType('expense')}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${txType === 'expense' ? 'bg-expense text-white' : 'text-muted'}`}
            >
              Расход
            </button>
            <button
              onClick={() => setTxType('income')}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${txType === 'income' ? 'bg-income text-white' : 'text-muted'}`}
            >
              Доход
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2" style={{ overscrollBehavior: 'contain' }}>

          {/* Amount */}
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-bold" style={{ color: txType === 'income' ? '#30D158' : '#FF453A' }}>₪</span>
              <span className={`text-5xl font-bold`} style={{ color: amountStr ? (txType === 'income' ? '#30D158' : '#FF453A') : '#D1D5DB' }}>
                {amountStr || '0'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {['1','2','3','4','5','6','7','8','9','.','0','backspace'].map(k => (
                <button key={k} onClick={() => handleAmountKey(k)}
                  className="py-3 rounded-ios bg-background text-lg font-medium text-gray-900 active:bg-gray-200 transition-colors flex items-center justify-center">
                  {k === 'backspace' ? '⌫' : k}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              {QUICK_AMOUNTS.map(v => (
                <button key={v} onClick={() => addQuickAmount(v)}
                  className="flex-1 py-2 rounded-ios bg-primary/10 text-primary text-sm font-medium active:opacity-70">
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Category grid (fix #5 — "новая категория" в конце) */}
          <div className="card p-4">
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Категория</p>
            <div className="grid grid-cols-4 gap-3">
              {categories.map(cat => {
                const isSelected = selectedCategory?.key === cat.key
                const iconKey = cat.icon as keyof typeof LucideIcons
                const Icon = (LucideIcons[iconKey] as React.FC<{ size?: number; color?: string }>) || LucideIcons.MoreHorizontal
                return (
                  <button key={cat.key} onClick={() => { setSelectedCategory(cat); setSelectedSubcategoryKey(null) }}
                    className="flex flex-col items-center gap-1.5 active:opacity-70">
                    <div className="w-12 h-12 rounded-ios flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: isSelected ? `0 0 0 3px ${cat.color}60, 0 0 0 5px ${cat.color}30` : 'none',
                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                      }}>
                      <Icon size={22} color="#fff" />
                    </div>
                    <span className="text-[10px] text-center leading-tight text-gray-700 truncate w-full">{cat.nameRu}</span>
                  </button>
                )
              })}
              {/* Добавить свою категорию */}
              <button
                onClick={() => alert('Кастомные категории — в следующем обновлении!')}
                className="flex flex-col items-center gap-1.5 active:opacity-70"
              >
                <div className="w-12 h-12 rounded-ios flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50">
                  <Plus size={20} color="#8E8E93" />
                </div>
                <span className="text-[10px] text-center leading-tight text-muted">Новая</span>
              </button>
            </div>
          </div>

          {/* Subcategories */}
          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <div className="card p-4">
              <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Подкатегория</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedCategory.subcategories.map(sub => (
                  <button key={sub.key} onClick={() => setSelectedSubcategoryKey(sub.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${selectedSubcategoryKey === sub.key ? 'bg-primary text-white' : 'bg-background text-gray-700'}`}>
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
              <input type="text" placeholder={selectedCategory?.nameRu || 'Название операции'} value={title}
                onChange={e => setTitle(e.target.value)} className="input-field" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-1">Дата</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-2">Кто платит</p>
              <div className="flex gap-2">
                {OWNER_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setOwner(opt.value)}
                    className={`flex-1 py-2.5 rounded-ios text-sm font-medium transition-colors ${owner === opt.value ? 'text-white' : 'bg-background text-muted'}`}
                    style={owner === opt.value ? { backgroundColor: opt.color } : {}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted font-medium mb-1">Заметка (необязательно)</p>
              <textarea placeholder="Комментарий..." value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} className="input-field resize-none" />
            </div>
          </div>
        </div>

        {/* ── Fixed footer — always visible (fix #2) ── */}
        <div className="flex-shrink-0 px-4 pt-2 pb-2 space-y-2 bg-background border-t border-black/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 16px)' }}>

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="flex-1 py-3 rounded-ios border-2 border-primary/30 flex items-center justify-center gap-2 text-primary font-medium text-sm active:opacity-70"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              {scanMsg || 'Сканировать чек'}
            </button>
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={scanning}
              className="flex-1 py-3 rounded-ios border-2 border-secondary/30 flex items-center justify-center gap-2 text-secondary font-medium text-sm active:opacity-70"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Загрузить PDF
            </button>
          </div>

          <button onClick={handleSave} disabled={!canSave || saving}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${!canSave ? 'opacity-40' : ''}`}>
            {saving
              ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><Check size={18} />Сохранить</>}
          </button>
        </div>
      </div>
    </div>
  )
}
