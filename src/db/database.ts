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
    // v3 keeps the existing records. Database migrations must never guess which
    // financial records are demos: an incorrect guess would destroy user data.
    this.version(3).stores({
      transactions: '++id, date, type, categoryKey, owner, createdAt',
      savingsGoals: '++id, createdAt',
      pensionFunds: '++id, owner',
      budgetLimits: '++id, categoryKey',
      settings: '++id',
    })
    this.version(4).stores({
      transactions: '++id, &cloudId, date, type, categoryKey, owner, createdAt',
      savingsGoals: '++id, &cloudId, createdAt',
      pensionFunds: '++id, &cloudId, owner',
      budgetLimits: '++id, &cloudId, categoryKey',
      settings: '++id, &cloudId',
    }).upgrade(async tx => {
      for (const tableName of ['transactions', 'savingsGoals', 'pensionFunds', 'budgetLimits', 'settings']) {
        await tx.table(tableName).toCollection().modify(record => {
          if (!record.cloudId) record.cloudId = crypto.randomUUID()
        })
      }
    })

    for (const table of [this.transactions, this.savingsGoals, this.pensionFunds, this.budgetLimits, this.settings]) {
      table.hook('creating', (_primaryKey, record) => {
        if (!record.cloudId) record.cloudId = crypto.randomUUID()
      })
    }
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
