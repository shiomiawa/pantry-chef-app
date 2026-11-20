// 日付は 'YYYY-MM-DD' の文字列で扱う（端末のタイムゾーン基準）

export function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayString() {
  return toDateString(new Date())
}

export function parseDateString(value) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(value, days) {
  const date = parseDateString(value)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

// 月末をまたいでも翌々月にずれないよう、その月の最終日に丸める（例：1/31 + 1か月 → 2/28）
export function addMonths(value, months) {
  const date = parseDateString(value)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return toDateString(date)
}

export function formatShortDate(value) {
  const date = parseDateString(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
