import { Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  List,
  BarChart2,
  PiggyBank,
  Settings,
  Plus,
} from 'lucide-react'
import { useStore } from '../../store/useStore'

const tabs = [
  { path: '/', label: 'Обзор', icon: Home, tab: 'dashboard' as const },
  { path: '/transactions', label: 'Операции', icon: List, tab: 'transactions' as const },
  { path: '/analytics', label: 'Аналитика', icon: BarChart2, tab: 'analytics' as const },
  { path: '/savings', label: 'Накопления', icon: PiggyBank, tab: 'savings' as const },
  { path: '/settings', label: 'Настройки', icon: Settings, tab: 'settings' as const },
]

export default function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setActiveTab, openAddTransaction } = useStore()

  const currentPath = location.pathname

  function handleTabPress(path: string, tab: typeof tabs[number]['tab']) {
    setActiveTab(tab)
    navigate(path)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div
        className="border-t border-black/5"
        style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
      >
        <div className="flex items-center justify-around px-2 pt-1">
          {tabs.map((tab, index) => {
            if (index === 2) {
              return <TabItem key={tab.path} tab={tab} isActive={currentPath === tab.path}
                onPress={() => handleTabPress(tab.path, tab.tab)} />
            }
            if (index === 1) {
              return (
                <Fragment key={tab.path}>
                  <TabItem
                    tab={tab}
                    isActive={currentPath === tab.path}
                    onPress={() => handleTabPress(tab.path, tab.tab)}
                  />
                  {/* FAB in center */}
                  <button
                    key="fab"
                    onClick={() => openAddTransaction('expense')}
                    className="flex-shrink-0 w-14 h-14 rounded-full bg-primary shadow-card-lg flex items-center justify-center active:scale-95 transition-transform -mt-4"
                    style={{ boxShadow: '0 4px 16px rgba(45,108,223,0.45)' }}
                    aria-label="Добавить операцию"
                  >
                    <Plus size={28} color="#fff" strokeWidth={2.5} />
                  </button>
                </Fragment>
              )
            }
            return (
              <TabItem
                key={tab.path}
                tab={tab}
                isActive={currentPath === tab.path}
                onPress={() => handleTabPress(tab.path, tab.tab)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface TabItemProps {
  tab: typeof tabs[number]
  isActive: boolean
  onPress: () => void
}

function TabItem({ tab, isActive, onPress }: TabItemProps) {
  const Icon = tab.icon
  return (
    <button
      onClick={onPress}
      className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-[52px] active:opacity-70 transition-opacity"
    >
      <Icon
        size={24}
        color={isActive ? '#2D6CDF' : '#8E8E93'}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      <span
        className="text-[10px] font-medium"
        style={{ color: isActive ? '#2D6CDF' : '#8E8E93' }}
      >
        {tab.label}
      </span>
    </button>
  )
}
