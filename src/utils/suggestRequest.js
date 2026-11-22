import { saveSyncedJson } from '../sync/syncClient.js'
import { compareByExpiry } from './expiryStatus.js'

// サーバー（server/suggestMenus.js）の上限と合わせる
export const MAX_SUGGEST_ITEMS = 150
const MAX_NAME_LENGTH = 40
const LAST_SUGGESTION_KEY = 'pantry-last-suggestion'

// 送る在庫を選ぶ：数量0は除き、最優先（★）→ 期限が近い順に150品まで
export function selectItemsForSuggestion(items) {
  return items
    .filter((item) => item.quantity > 0)
    .sort((a, b) => Number(b.priority === true) - Number(a.priority === true) || compareByExpiry(a, b))
    .slice(0, MAX_SUGGEST_ITEMS)
}

export function buildSuggestRequest(items, { wants, servings, maxMissing, cuisine, dishVariations }, today) {
  return {
    today,
    items: selectItemsForSuggestion(items).map((item) => ({
      name: item.name.slice(0, MAX_NAME_LENGTH),
      quantity: item.quantity,
      unit: item.unit,
      expiry: item.expiry ?? '',
      location: item.location,
      priority: item.priority === true,
    })),
    wants,
    servings,
    maxMissing,
    cuisine,
    dishVariations: dishVariations === true,
  }
}

// accessCode：デモコード、または自分専用の同期コード
export async function requestSuggestion(payload, accessCode) {
  let response
  try {
    response = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Code': accessCode },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('通信できませんでした。電波のよいところでもう一度お試しください')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok || !data || !Array.isArray(data.menus)) {
    throw new Error(data?.error || '提案を作れませんでした。時間をおいてお試しください')
  }
  return data.menus
}

// 最後の提案はタブを切り替えても残るようにローカルストレージに置く（STEP 7 の買い物リストでも使う）
export function loadLastSuggestion() {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_SUGGESTION_KEY) ?? 'null')
    return data && Array.isArray(data.menus) ? data : null
  } catch {
    return null
  }
}

// 保存できなくても画面には表示する。同期を使っている端末では、スマホでも手順を見られるようサーバーへ送る
export function saveLastSuggestion(suggestion) {
  saveSyncedJson(LAST_SUGGESTION_KEY, suggestion)
}
