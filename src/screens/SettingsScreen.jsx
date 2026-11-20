import BackupPanel from '../components/BackupPanel.jsx'
import CsvImportPanel from '../components/CsvImportPanel.jsx'
import SyncPanel from '../components/SyncPanel.jsx'
import { usePantryItems } from '../hooks/usePantryItems.js'

export default function SettingsScreen() {
  const { items, history, addItems, replaceItems, clearAll } = usePantryItems()

  return (
    <section className="screen">
      <h2 className="screen__title">設定</h2>
      <CsvImportPanel onImport={addItems} />
      <SyncPanel />
      <BackupPanel items={items} history={history} onReplace={replaceItems} onClearAll={clearAll} />
    </section>
  )
}
