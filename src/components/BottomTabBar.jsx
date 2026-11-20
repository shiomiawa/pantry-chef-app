const TABS = [
  { id: 'pantry', label: '在庫' },
  { id: 'menu', label: '献立' },
  { id: 'shopping', label: '買い物' },
  { id: 'settings', label: '設定' },
]

export default function BottomTabBar({ activeTab, onChange }) {
  return (
    <nav className="tab-bar" aria-label="画面の切り替え">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? 'tab-bar__tab tab-bar__tab--active' : 'tab-bar__tab'}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
