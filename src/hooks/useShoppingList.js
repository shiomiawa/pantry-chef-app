import { useEffect, useState } from 'react'
import { DATA_REPLACED_EVENT, saveSyncedJson } from '../sync/syncClient.js'
import { todayString } from '../utils/date.js'
import { namesMatch } from '../utils/names.js'

const STORAGE_KEY = 'pantry-shopping'

function loadItems() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

// crypto.randomUUID は http の LAN アドレス（スマホ実機確認など）では使えないため代替を用意する
function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// 買い物リスト。1件は { id, name, amount, from（どの料理用か）, checked（購入済み）, addedAt }
export function useShoppingList() {
  const [items, setItems] = useState(loadItems)

  // 保存（保存できない環境でも画面は動かし続ける）。同期を使っている端末では、変更をサーバーへ送る
  useEffect(() => {
    saveSyncedJson(STORAGE_KEY, items)
  }, [items])

  // ほかの端末のデータが同期で届いたら読み直す
  useEffect(() => {
    function reload() {
      setItems(loadItems())
    }
    window.addEventListener(DATA_REPLACED_EVENT, reload)
    return () => window.removeEventListener(DATA_REPLACED_EVENT, reload)
  }, [])

  // 同じ名前（「鶏もも肉」と「鶏もも肉（国産）」も同じとみなす）は重ねて追加しない
  function addItems(entries, from = '') {
    const next = [...items]
    let added = 0
    let skipped = 0
    for (const entry of entries) {
      const name = entry.name.trim()
      if (!name) continue
      if (next.some((item) => namesMatch(item.name, name))) {
        skipped += 1
        continue
      }
      next.push({ id: createId(), name, amount: entry.amount ?? '', from, checked: false, addedAt: todayString() })
      added += 1
    }
    if (added > 0) setItems(next)
    return { added, skipped }
  }

  function toggleChecked(id) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function clearChecked() {
    setItems((prev) => prev.filter((item) => !item.checked))
  }

  return { items, addItems, toggleChecked, removeItem, clearChecked }
}
