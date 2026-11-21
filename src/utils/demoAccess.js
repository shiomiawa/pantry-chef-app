// AI提案の費用対策（画面側）。本当の守りはサーバー側のデモコードの確認と、Anthropic Console の月額上限。
import { todayString } from './date.js'

// デモコードは sessionStorage に置く（タブを閉じると消える）
const DEMO_CODE_KEY = 'pantry-demo-code'
const COUNT_KEY = 'pantry-suggest-count'

// デモコードで使う人の1日の上限。同期コードを入れた自分の端末は上限なし
export const DAILY_SUGGEST_LIMIT = 5

export function loadDemoCode() {
  try {
    return sessionStorage.getItem(DEMO_CODE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDemoCode(code) {
  try {
    if (code) sessionStorage.setItem(DEMO_CODE_KEY, code)
    else sessionStorage.removeItem(DEMO_CODE_KEY)
  } catch {
    // 保存できなくても、入力した値でそのまま提案できる
  }
}

// 1日の提案回数。
// ※ブラウザ側の目安にすぎない。ローカルストレージを消したり、別のブラウザを使ったりすれば回避できる。
//   回数を確実に制限するには、サーバー側で回数を記憶する仕組みが必要（設計書の段階2）。
export function getTodayCount() {
  try {
    const saved = JSON.parse(localStorage.getItem(COUNT_KEY) ?? 'null')
    return saved && saved.date === todayString() && Number.isInteger(saved.count) ? saved.count : 0
  } catch {
    return 0
  }
}

export function incrementTodayCount() {
  const count = getTodayCount() + 1
  try {
    localStorage.setItem(COUNT_KEY, JSON.stringify({ date: todayString(), count }))
  } catch {
    // 保存できない環境では数えられないが、提案自体はできる
  }
  return count
}
