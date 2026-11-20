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

  return { items, history, addItem, updateItem, removeItem }
}
