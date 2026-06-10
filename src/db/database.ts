import Dexie, { Table } from 'dexie'
import type { Transaction, SavingsGoal, PensionFund, BudgetLimit, FamilySettings } from '../types'

class SkrygaDB extends Dexie {
  transactions!: Table<Transaction, number>
  savingsGoals!: Table<SavingsGoal, number>
  pensionFunds!: Table<PensionFund, number>
  budgetLimits!: Table<BudgetLimit, number>
  settings!: Table<FamilySettings, number>

  constructor() {
    super('SkrygaDB')
    this.version(1).stores({
      transactions: '++id, date, type, categoryKey, owner, createdAt',
      savingsGoals: '++id, createdAt',
      pensionFunds: '++id, owner',
      budgetLimits: '++id, categoryKey',
      settings: '++id',
    })
    // v2: rename Илья → Филипп
    this.version(2).stores({
      transactions: '++id, date, type, categoryKey, owner, createdAt',
      savingsGoals: '++id, createdAt',
      pensionFunds: '++id, owner',
      budgetLimits: '++id, categoryKey',
      settings: '++id',
    }).upgrade(tx =>
      tx.table('settings').toCollection().modify((s: FamilySettings) => {
        if (s.member1Name === 'Илья') s.member1Name = 'Филипп'
      })
    )
    // v3: clear all demo data — user will enter real data
    this.version(3).stores({
      transactions: '++id, date, type, categoryKey, owner, createdAt',
      savingsGoals: '++id, createdAt',
      pensionFunds: '++id, owner',
      budgetLimits: '++id, categoryKey',
      settings: '++id',
    }).upgrade(async tx => {
      await tx.table('transactions').clear()
      await tx.table('savingsGoals').clear()
      await tx.table('pensionFunds').clear()
    })
  }
}

export const db = new SkrygaDB()

export async function seedDefaults() {
  const existing = await db.settings.count()
  if (existing > 0) return

  await db.settings.add({
    member1Name: 'Филипп',
    member1Emoji: '👨',
    member1Color: '#2D6CDF',
    member2Name: 'Анастасия',
    member2Emoji: '👩',
    member2Color: '#7B5CF0',
    currency: '₪',
    monthStartDay: 1,
  })

  // No sample data — user enters real data
}
