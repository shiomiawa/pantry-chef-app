import { addDays } from './date.js'
import { LOCATIONS, normalizeDate } from './importItems.js'

const BACKUP_FORMAT = 'pantry-chef-backup'
const BACKUP_VERSION = 1

export function createBackup(items, history) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    items,
    history,
  }
}

function isValidItem(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.name === 'string' &&
    item.name.trim() !== '' &&
    typeof item.quantity === 'number' &&
    item.quantity >= 0 &&
    typeof item.unit === 'string' &&
    (item.expiry === '' || item.expiry === undefined || (typeof item.expiry === 'string' && normalizeDate(item.expiry) === item.expiry)) &&
    LOCATIONS.includes(item.location)
  )
}

// 書き出したファイルの中身を確かめる。形式が違えば日本語のメッセージで Error を投げる
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSONファイルとして読めませんでした')
  }
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.items)) {
    throw new Error('パントリーシェフで書き出したファイルではありません')
  }
  const invalidIndex = data.items.findIndex((item) => !isValidItem(item))
  if (invalidIndex !== -1) {
    throw new Error(`${invalidIndex + 1}件目の食材データの形式が正しくありません`)
  }

  const items = data.items.map((item) => ({
    id: typeof item.id === 'string' ? item.id : undefined,
    name: item.name.trim(),
    quantity: item.quantity,
    unit: item.unit,
    expiry: item.expiry ?? '',
    location: item.location,
    addedAt: typeof item.addedAt === 'string' ? item.addedAt : undefined,
  }))
  const history = data.history && typeof data.history === 'object' && !Array.isArray(data.history) ? data.history : null
  return { items, history }
}

// サンプルの期限は「今日から何日後か」（expiryInDays）で持ち、読み込んだ日を基準に日付へ変える
export function buildSampleItems(sample, today) {
  if (!sample || !Array.isArray(sample.items)) {
    throw new Error('サンプルデータの形式が正しくありません')
  }
  return sample.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiry: typeof item.expiryInDays === 'number' ? addDays(today, item.expiryInDays) : '',
    location: item.location,
  }))
}
