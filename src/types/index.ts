export type TransactionType = 'income' | 'expense'
export type BudgetOwner = 'family' | 'ilya' | 'anastasia'

export interface Transaction {
  id?: number
  date: Date
  amount: number
  type: TransactionType
  categoryKey: string
  subcategoryKey?: string
  title: string
  notes?: string
  owner: BudgetOwner
  receiptImageBase64?: string
  isFromScan: boolean
  merchantName?: string
  createdAt: Date
}

export interface SavingsGoal {
  id?: number
  title: string
  targetAmount: number
  currentAmount: number
  deadline?: Date
  iconName: string
  colorHex: string
  isCompleted: boolean
  createdAt: Date
}

export interface PensionFund {
  id?: number
  name: string
  fundType: 'pension' | 'keren_hishtalmut' | 'investment'
  currentBalance: number
  monthlyContribution: number
  employerContributionPercent: number
  owner: 'ilya' | 'anastasia'
  lastUpdated: Date
}

export interface BudgetLimit {
  id?: number
  categoryKey: string
  monthlyLimit: number
  alertPercent: number
}

export interface FamilySettings {
  id?: number
  member1Name: string
  member1Emoji: string
  member1Color: string
  member2Name: string
  member2Emoji: string
  member2Color: string
  currency: string
  monthStartDay: number
}

export interface AppCategory {
  key: string
  nameRu: string
  icon: string
  color: string
  type: 'expense' | 'income'
  subcategories: AppSubcategory[]
}

export interface AppSubcategory {
  key: string
  nameRu: string
  icon: string
}

export interface ScanResult {
  amount?: number
  merchantName?: string
  date?: Date
  suggestedCategoryKey?: string
  suggestedSubcategoryKey?: string
  title?: string
  rawText?: string
}
