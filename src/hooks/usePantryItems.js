import { useEffect, useState } from 'react'
import { todayString } from '../utils/date.js'

const STORAGE_KEY = 'pantry-items'
// 食材名ごとの前回の単位・保管場所。名前の候補にも使う（使い切って一覧から消えた食材も残す）
const HISTORY_KEY = 'pantry-history'

function loadJson(key, fallback, isValid) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 保存できない環境（プライベートモードなど）でも画面は動かし続ける
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// crypto.randomUUID は http の LAN アドレス（スマホ実機確認など）では使えないため代替を用意する
function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function usePantryItems() {
  const [items, setItems] = useState(() => loadJson(STORAGE_KEY, [], Array.isArray))
  const [history, setHistory] = useState(() => loadJson(HISTORY_KEY, {}, isPlainObject))

  useEffect(() => {
    saveJson(STORAGE_KEY, items)
  }, [items])

  useEffect(() => {
    saveJson(HISTORY_KEY, history)
  }, [history])

  function rememberItem({ name, unit, location }) {
    setHistory((prev) => ({ ...prev, [name]: { unit, location } }))
  }

  function addItem(data) {
    const item = { id: createId(), ...data, addedAt: todayString() }
    setItems((prev) => [...prev, item])
    rememberItem(item)
  }

  function updateItem(id, data) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
    if (data.name) rememberItem(data)
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  // 名前の候補に、まだない食材だけを足す（既にある前回の値は上書きしない）
  function mergeIntoHistory(baseHistory, list) {
    const merged = { ...baseHistory }
    for (const { name, unit, location } of list) {
      if (!merged[name]) merged[name] = { unit, location }
    }
    return merged
  }

  // CSV取り込み用：今の在庫の後ろにまとめて追加する
  function addItems(list) {
    const today = todayString()
    const newItems = list.map((data) => ({ id: createId(), ...data, addedAt: today }))
    setItems((prev) => [...prev, ...newItems])
    setHistory((prev) => {
      const next = { ...prev }
      for (const { name, unit, location } of newItems) next[name] = { unit, location }
      return next
    })
  }

  // サンプル読込・復元用：在庫を丸ごと置き換える。nextHistory があれば名前の候補も置き換える
  function replaceItems(list, nextHistory = null) {
    const today = todayString()
    const nextItems = list.map(({ id, addedAt, ...data }) => ({
      id: id || createId(),
      ...data,
      addedAt: addedAt || today,
    }))
    setItems(nextItems)
    setHistory((prev) => mergeIntoHistory(nextHistory ?? prev, nextItems))
  }

  function clearAll() {
    setItems([])
    setHistory({})
  }

  return { items, history, addItem, updateItem, removeItem, addItems, replaceItems, clearAll }
}
