// 自分専用の同期（画面側）。同期コードを入れた端末だけで動き、入れていない端末では何もしない。
// - アプリを開いたとき・画面に戻ったとき・電波が戻ったときに、サーバーの最新データを読み込む
// - ローカルで変更されたら、少し待ってまとめてサーバーへ送る
// - 2台の変更がぶつかったら、更新日時（updatedAt）が新しいほうを採用する

const CODE_KEY = 'pantry-sync-code'
const META_KEY = 'pantry-sync-meta' // { updatedAt, pending, lastSyncedAt }
const PUSH_DELAY_MS = 2000

// 同期するローカルストレージのキーと、サーバーに送るときの名前
const SYNCED_KEYS = {
  items: { key: 'pantry-items', empty: [] },
  shopping: { key: 'pantry-shopping', empty: [] },
  history: { key: 'pantry-history', empty: {} },
  lastSuggestion: { key: 'pantry-last-suggestion', empty: null },
}

// サーバーのデータでローカルを置き換えたときに出す。各画面はこれを受けて読み直す
export const DATA_REPLACED_EVENT = 'pantry:data-replaced'

// ---- 小さな道具 ----

function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // 保存できない環境では同期もしない
  }
}

function readJson(key, fallback) {
  try {
    const raw = readStorage(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function loadMeta() {
  return readJson(META_KEY, { updatedAt: null, pending: false, lastSyncedAt: null })
}

function saveMeta(meta) {
  writeStorage(META_KEY, JSON.stringify(meta))
}

export function getSyncCode() {
  return readStorage(CODE_KEY) ?? ''
}

export function isSyncEnabled() {
  return getSyncCode() !== ''
}

// ---- 状態（画面上部の表示と設定画面で使う） ----
// status: off（同期していない）/ synced / pending（送信待ち）/ syncing / offline / error

let state = { status: isSyncEnabled() ? 'pending' : 'off', message: '', lastSyncedAt: loadMeta().lastSyncedAt }
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export function subscribeSync(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSyncState() {
  return state
}

// ---- ローカルのデータの読み書き ----

function readLocalData() {
  const data = {}
  for (const [name, { key, empty }] of Object.entries(SYNCED_KEYS)) {
    data[name] = readJson(key, empty) ?? empty
  }
  return data
}

function writeLocalData(data) {
  for (const [name, { key, empty }] of Object.entries(SYNCED_KEYS)) {
    const value = data?.[name] ?? empty
    writeStorage(key, value === null ? null : JSON.stringify(value))
  }
  window.dispatchEvent(new Event(DATA_REPLACED_EVENT))
}

function adoptRecord(record) {
  writeLocalData(record.data)
  const now = new Date().toISOString()
  saveMeta({ updatedAt: record.updatedAt, pending: false, lastSyncedAt: now })
  setState({ status: 'synced', message: '', lastSyncedAt: now })
}

// ---- サーバーとのやりとり ----

async function callSync(method, code, body) {
  const response = await fetch('/api/sync', {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Sync-Code': code },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await response.json()
  } catch {
    json = null
  }
  return { status: response.status, json }
}

function handleFailure(status, json) {
  const message =
    status === 401 ? '同期コードが違います。設定画面で入れ直してください' : json?.error || '同期できませんでした'
  setState({ status: 'error', message })
}

let pushTimer = null
let isPushing = false
let pushAgain = false

async function push() {
  const code = getSyncCode()
  if (!code) return
  if (isPushing) {
    pushAgain = true
    return
  }
  if (!navigator.onLine) {
    setState({ status: 'offline', message: '' })
    return
  }

  isPushing = true
  setState({ status: 'syncing', message: '' })
  try {
    const meta = loadMeta()
    const { status, json } = await callSync('PUT', code, { data: readLocalData(), updatedAt: meta.updatedAt })
    if (status === 200) {
      const now = new Date().toISOString()
      // 送っている間に新しい変更があれば、送信待ちのまま残す
      const latest = loadMeta()
      const stillPending = latest.updatedAt !== meta.updatedAt
      saveMeta({ ...latest, pending: stillPending, lastSyncedAt: now })
      setState({ status: stillPending ? 'pending' : 'synced', message: '', lastSyncedAt: now })
      if (stillPending) pushAgain = true
    } else if (status === 409 && json?.record) {
      // ほかの端末の変更のほうが新しい：そちらを採用する
      adoptRecord(json.record)
    } else {
      handleFailure(status, json)
    }
  } catch {
    setState({ status: 'offline', message: '' })
  } finally {
    isPushing = false
    if (pushAgain) {
      pushAgain = false
      schedulePush()
    }
  }
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, PUSH_DELAY_MS)
}

// サーバーの最新を読み込む。ローカルに送信待ちの変更があり、そちらが新しければ送る
export async function pullLatest() {
  const code = getSyncCode()
  if (!code) return
  if (!navigator.onLine) {
    setState({ status: 'offline', message: '' })
    return
  }

  setState({ status: 'syncing', message: '' })
  try {
    const { status, json } = await callSync('GET', code)
    if (status !== 200) {
      handleFailure(status, json)
      return
    }
    const record = json?.record
    const meta = loadMeta()
    const remoteTime = record ? Date.parse(record.updatedAt) : 0
    const localTime = meta.updatedAt ? Date.parse(meta.updatedAt) : 0

    if (record && remoteTime > localTime) {
      adoptRecord(record)
    } else if (meta.pending || !record) {
      await push()
    } else {
      const now = new Date().toISOString()
      saveMeta({ ...meta, lastSyncedAt: now })
      setState({ status: 'synced', message: '', lastSyncedAt: now })
    }
  } catch {
    setState({ status: 'offline', message: '' })
  }
}

// ---- 各画面から呼ぶ ----

// 同期する4つのデータをローカルで変更したときに呼ぶ
export function notifyLocalChange() {
  if (!isSyncEnabled()) return
  saveMeta({ ...loadMeta(), updatedAt: new Date().toISOString(), pending: true })
  setState({ status: 'pending', message: '' })
  schedulePush()
}

// 同期するデータをローカルストレージに保存し、本当に変わったときだけ同期に知らせる。
// 画面を開いただけ（中身が同じ）や、空のキーに空の初期値を入れただけでは知らせない。
// そうしないと、古い端末を開いただけで新しいデータを上書きしてしまうため
export function saveSyncedJson(key, value) {
  let text
  try {
    text = JSON.stringify(value)
  } catch {
    return
  }
  const previous = readStorage(key)
  if (previous === text) return
  writeStorage(key, text)
  const isEmptyDefault = text === '[]' || text === '{}' || text === 'null'
  if (previous === null && isEmptyDefault) return
  notifyLocalChange()
}

// この端末の在庫・買い物リストの件数（同期を始めるときの確認に使う）
export function getLocalSummary() {
  const data = readLocalData()
  return { items: data.items.length, shopping: data.shopping.length }
}

// 同期を始める前に、コードが正しいかとサーバーにデータがあるかを確かめる
export async function checkRemote(code) {
  let result
  try {
    result = await callSync('GET', code)
  } catch {
    throw new Error('通信できませんでした。電波のよいところでもう一度お試しください')
  }
  if (result.status === 401) throw new Error('同期コードが違います')
  if (result.status !== 200) throw new Error(result.json?.error || '同期できませんでした')
  return result.json?.record ?? null
}

// 同期を始める。サーバーにデータがあればそれでこの端末を置き換え、なければこの端末のデータを送る
export async function enableSync(code, remoteRecord) {
  writeStorage(CODE_KEY, code)
  if (remoteRecord) {
    adoptRecord(remoteRecord)
  } else {
    saveMeta({ updatedAt: new Date().toISOString(), pending: true, lastSyncedAt: null })
    setState({ status: 'pending', message: '' })
    await push()
  }
}

// 同期を止める。この端末のデータはそのまま残る
export function disableSync() {
  clearTimeout(pushTimer)
  writeStorage(CODE_KEY, null)
  writeStorage(META_KEY, null)
  setState({ status: 'off', message: '', lastSyncedAt: null })
}

export async function syncNow() {
  await pullLatest()
}

// アプリの起動時に1回呼ぶ
let started = false
export function startSync() {
  if (started) return
  started = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullLatest()
  })
  window.addEventListener('online', () => pullLatest())
  pullLatest()
}
