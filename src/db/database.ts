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
    // v2: rename Илья → Филипп in existing settings
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

  const now = new Date()
  const sampleTransactions: Omit<Transaction, 'id'>[] = [
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), amount: 284, type: 'expense', categoryKey: 'food', subcategoryKey: 'groceries', title: 'Супермаркет Шуферсал', owner: 'family', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), amount: 9250, type: 'income', categoryKey: 'salary', subcategoryKey: 'salary_main', title: 'Зарплата — Филипп', owner: 'ilya', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2), amount: 380, type: 'expense', categoryKey: 'bills', subcategoryKey: 'electricity', title: 'Хеврат Хашмаль', owner: 'family', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2), amount: 127, type: 'expense', categoryKey: 'food', subcategoryKey: 'delivery', title: 'Wolt — доставка', owner: 'family', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3), amount: 210, type: 'expense', categoryKey: 'transport', subcategoryKey: 'fuel', title: 'Бензин', owner: 'ilya', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4), amount: 8250, type: 'income', categoryKey: 'salary', subcategoryKey: 'salary_main', title: 'Зарплата — Анастасия', owner: 'anastasia', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4), amount: 650, type: 'expense', categoryKey: 'health', subcategoryKey: 'pharmacy', title: 'Аптека SuperPharm', owner: 'family', isFromScan: false, createdAt: new Date() },
    { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5), amount: 1200, type: 'expense', categoryKey: 'bills', subcategoryKey: 'rent', title: 'Ипотека', owner: 'family', isFromScan: false, createdAt: new Date() },
  ]
  await db.transactions.bulkAdd(sampleTransactions as Transaction[])

  await db.savingsGoals.bulkAdd([
    { title: 'Отпуск в Европе', targetAmount: 15000, currentAmount: 8500, deadline: new Date(now.getFullYear(), 7, 1), iconName: 'Plane', colorHex: '#2D6CDF', isCompleted: false, createdAt: new Date() },
    { title: 'Новый автомобиль', targetAmount: 80000, currentAmount: 32700, deadline: new Date(now.getFullYear() + 1, 0, 1), iconName: 'Car', colorHex: '#7B5CF0', isCompleted: false, createdAt: new Date() },
  ])

  await db.pensionFunds.bulkAdd([
    { name: 'Пенсионный фонд', fundType: 'pension', currentBalance: 124500, monthlyContribution: 1850, employerContributionPercent: 8.33, owner: 'ilya', lastUpdated: new Date() },
    { name: 'Керен Хиштальмут', fundType: 'keren_hishtalmut', currentBalance: 38200, monthlyContribution: 620, employerContributionPercent: 7.5, owner: 'ilya', lastUpdated: new Date() },
    { name: 'Пенсионный фонд', fundType: 'pension', currentBalance: 67300, monthlyContribution: 1200, employerContributionPercent: 8.33, owner: 'anastasia', lastUpdated: new Date() },
  ])
}
