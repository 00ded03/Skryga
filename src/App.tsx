import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TabBar from './components/layout/TabBar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import Savings from './pages/Savings'
import Settings from './pages/Settings'
import AddTransactionModal from './components/transactions/AddTransactionModal'
import { useStore } from './store/useStore'

export default function App() {
  const isAddTransactionOpen = useStore((s) => s.isAddTransactionOpen)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans select-none">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <TabBar />
        {isAddTransactionOpen && <AddTransactionModal />}
      </div>
    </BrowserRouter>
  )
}
