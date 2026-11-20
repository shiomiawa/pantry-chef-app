import { parseDateString, todayString } from './date.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SOON_DAYS = 3
const WARNING_DAYS = 7

// 期限までの残り日数。今日が期限なら 0、過ぎていればマイナス
export function daysUntilExpiry(expiry, today = todayString()) {
  const target = parseDateString(expiry)
  const base = parseDateString(today)
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  const baseUtc = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())
  return Math.round((targetUtc - baseUtc) / MS_PER_DAY)
}

// status: expired（期限切れ・赤）/ soon（3日以内・オレンジ）/ warning（7日以内・黄）/ ok / none（期限なし）
export function getExpiryStatus(expiry, today = todayString()) {
  if (!expiry) {
    return { status: 'none', days: null, label: '期限なし' }
  }
  const days = daysUntilExpiry(expiry, today)
  if (days < 0) return { status: 'expired', days, label: `${-days}日過ぎ` }
  if (days === 0) return { status: 'soon', days, label: '今日まで' }
  if (days <= SOON_DAYS) return { status: 'soon', days, label: `あと${days}日` }
  if (days <= WARNING_DAYS) return { status: 'warning', days, label: `あと${days}日` }
  return { status: 'ok', days, label: `あと${days}日` }
}

// 期限が近い順。期限なしは最後、同じ期限なら名前順
export function compareByExpiry(a, b) {
  if (!a.expiry && !b.expiry) return a.name.localeCompare(b.name, 'ja')
  if (!a.expiry) return 1
  if (!b.expiry) return -1
  if (a.expiry !== b.expiry) return a.expiry < b.expiry ? -1 : 1
  return a.name.localeCompare(b.name, 'ja')
}
