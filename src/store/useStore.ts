import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BudgetOwner } from '../types'

interface AppState {
  activeMonth: Date
  setActiveMonth: (date: Date) => void

  transactionFilter: 'all' | 'income' | 'expense' | 'family' | 'personal'
  setTransactionFilter: (f: AppState['transactionFilter']) => void

  isAddTransactionOpen: boolean
  openAddTransaction: (type?: 'income' | 'expense') => void
  closeAddTransaction: () => void
  defaultTransactionType: 'income' | 'expense'

  isScannerOpen: boolean
  openScanner: () => void
  closeScanner: () => void

  activeTab: 'dashboard' | 'transactions' | 'analytics' | 'savings' | 'settings'
  setActiveTab: (tab: AppState['activeTab']) => void

  ownerFilter: BudgetOwner | 'all'
  setOwnerFilter: (owner: AppState['ownerFilter']) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      activeMonth: new Date(),
      setActiveMonth: (date) => set({ activeMonth: date }),

      transactionFilter: 'all',
      setTransactionFilter: (f) => set({ transactionFilter: f }),

      isAddTransactionOpen: false,
      defaultTransactionType: 'expense',
      openAddTransaction: (type = 'expense') =>
        set({ isAddTransactionOpen: true, defaultTransactionType: type }),
      closeAddTransaction: () => set({ isAddTransactionOpen: false }),

      isScannerOpen: false,
      openScanner: () => set({ isScannerOpen: true }),
      closeScanner: () => set({ isScannerOpen: false }),

      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      ownerFilter: 'all',
      setOwnerFilter: (owner) => set({ ownerFilter: owner }),
    }),
    {
      name: 'skryga-ui-state',
      partialize: (state) => ({ activeMonth: state.activeMonth }),
    },
  ),
)
