import { useEffect, useState } from 'react'
import BottomTabBar from './components/BottomTabBar.jsx'
import SyncBadge from './components/SyncBadge.jsx'
import { startSync } from './sync/syncClient.js'
import PantryScreen from './screens/PantryScreen.jsx'
import MenuScreen from './screens/MenuScreen.jsx'
import ShoppingScreen from './screens/ShoppingScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'

const SCREENS = {
  pantry: PantryScreen,
  menu: MenuScreen,
  shopping: ShoppingScreen,
  settings: SettingsScreen,
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pantry')
  const Screen = SCREENS[activeTab]

  // 同期コードを入れた端末だけ、自分専用の同期を動かす（入れていない端末では何もしない）
  useEffect(() => {
    startSync()
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>パントリーシェフ</h1>
        <SyncBadge />
      </header>
      <main className="app-main">
        <Screen />
      </main>
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
