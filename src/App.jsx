import { useState } from 'react'
import BottomTabBar from './components/BottomTabBar.jsx'
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>パントリーシェフ</h1>
      </header>
      <main className="app-main">
        <Screen />
      </main>
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
