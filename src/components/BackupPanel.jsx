import { useId, useState } from 'react'
import { isSyncEnabled } from '../sync/syncClient.js'
import { buildSampleItems, createBackup, parseBackup } from '../utils/backup.js'
import { todayString } from '../utils/date.js'
import { downloadTextFile } from '../utils/download.js'

const MAX_BACKUP_BYTES = 2 * 1024 * 1024

export default function BackupPanel({ items, history, onReplace, onClearAll }) {
  // 結果のメッセージは、押したボタンのある欄（section）に出す
  const [result, setResult] = useState({ section: '', message: '', error: '' })
  const restoreInputId = useId()

  function showResult(section, message, error = '') {
    setResult({ section, message, error })
  }

  function renderResult(section) {
    if (result.section !== section) return null
    return (
      <>
        {result.error && <p className="form-error" role="alert">{result.error}</p>}
        {result.message && <p className="form-message" role="status">{result.message}</p>}
      </>
    )
  }

  // 同期中の端末では、置き換え・削除が同期先（ほかの端末）にも反映されることを伝える
  const syncNote = () => (isSyncEnabled() ? '\n※同期中のため、同期先とほかの端末のデータも同じように変わります。' : '')

  function confirmReplace(action) {
    if (items.length === 0) return true
    return window.confirm(
      `今の在庫（${items.length}品）を${action}に置き換えます。よろしいですか？\n自分のデータは、先に「書き出す」で保存しておくと安心です。${syncNote()}`,
    )
  }

  async function handleLoadSample() {
    if (!confirmReplace('サンプルデータ')) return
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}sample-pantry.json`)
      if (!response.ok) throw new Error()
      const sampleItems = buildSampleItems(await response.json(), todayString())
      onReplace(sampleItems)
      showResult('sample', `サンプルデータ（${sampleItems.length}品）を読み込みました`)
    } catch {
      showResult('sample', '', 'サンプルデータを読み込めませんでした')
    }
  }

  function handleExport() {
    const backup = createBackup(items, history)
    downloadTextFile(`pantry-chef-backup-${todayString()}.json`, JSON.stringify(backup, null, 2), 'application/json')
    showResult('backup', `在庫（${items.length}品）を書き出しました`)
  }

  async function handleRestoreFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) {
      showResult('backup', '', 'ファイルが大きすぎます（2MBまで）')
      return
    }
    try {
      const backup = parseBackup(await file.text())
      if (!confirmReplace('ファイルの内容')) return
      onReplace(backup.items, backup.history)
      showResult('backup', `ファイルから在庫（${backup.items.length}品）を復元しました`)
    } catch (restoreError) {
      showResult('backup', '', restoreError.message || 'ファイルを読み込めませんでした')
    }
  }

  function handleClearAll() {
    if (!window.confirm(`在庫と名前の候補を、すべて削除します。元に戻せません。よろしいですか？${syncNote()}`)) return
    onClearAll()
    showResult('clear', 'すべてのデータを削除しました')
  }

  return (
    <>
      <div className="panel">
        <h3 className="panel__title">サンプルデータ</h3>
        <p className="help-text">架空の食材20品で、アプリをお試しできます。今の在庫は置き換えられます。</p>
        <button type="button" className="button" onClick={handleLoadSample}>
          サンプルを読み込む
        </button>
        {renderResult('sample')}
      </div>

      <div className="panel">
        <h3 className="panel__title">データの書き出し・復元</h3>
        <p className="help-text">在庫をJSONファイルに保存します。保存したファイルから、在庫を元に戻せます。</p>
        <div className="button-row">
          <button type="button" className="button" onClick={handleExport}>
            書き出す
          </button>
          <label htmlFor={restoreInputId} className="button file-button">
            ファイルから復元
          </label>
          <input
            id={restoreInputId}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            onChange={handleRestoreFile}
          />
        </div>
        {renderResult('backup')}
      </div>

      <div className="panel">
        <h3 className="panel__title">全データ削除</h3>
        <p className="help-text">在庫と名前の候補をすべて消します。</p>
        <button type="button" className="button button--danger" onClick={handleClearAll}>
          すべて削除する
        </button>
        {renderResult('clear')}
      </div>
    </>
  )
}
