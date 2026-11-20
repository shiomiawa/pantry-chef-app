// AIの分量（「200g」「1/2個」「2切れ」）を、在庫の数量と単位に読み替える。
// 「大さじ1」「少々」のように読めないものは null（呼び出し側で数量1などにする）
export function parseAmount(raw) {
  if (!raw) return null
  const value = raw
    .trim()
    .replace(/[０-９．／]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
  const match = value.match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?\s*([^\d\s]{1,6})?$/)
  if (!match) return null
  const [, whole, denominator, unit] = match
  const quantity = denominator ? Number(whole) / Number(denominator) : Number(whole)
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  return { quantity: Math.round(quantity * 100) / 100, unit: unit ?? '' }
}
