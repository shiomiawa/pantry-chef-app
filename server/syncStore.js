// 自分専用の同期の本体。Vercel関数（api/sync.js）と、ローカル開発用の Vite サーバーの両方から呼ぶ。
// Upstash の接続情報と同期コードは環境変数から受け取り、コードには書かない。
import { createHash, timingSafeEqual } from 'node:crypto'
import { Redis } from '@upstash/redis'

export const SYNC_KEY = 'pantry:data'
export const MAX_SYNC_BYTES = 200_000

// 画面に出してよい、利用者向けのエラー。status はHTTPステータス
export class SyncError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// 長さの違いや一致した文字数から推測されないよう、ハッシュにそろえてから一定時間で比べる
function codesMatch(given, expected) {
  const a = createHash('sha256').update(String(given)).digest()
  const b = createHash('sha256').update(String(expected)).digest()
  return timingSafeEqual(a, b)
}

function createRedis(env) {
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
    automaticDeserialization: false, // JSON は自分で文字列にして保存する
  })
}

// 同期するデータ：在庫・買い物リスト・名前の候補・最後のAI提案
function validateData(data) {
  if (
    !isPlainObject(data) ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.shopping) ||
    !isPlainObject(data.history) ||
    !(data.lastSuggestion === null || isPlainObject(data.lastSuggestion))
  ) {
    throw new SyncError(400, '同期するデータの形式が正しくありません')
  }
}

function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

// request: { method, code, body }。戻り値: { status, json }
export async function handleSync(request, env, { redis } = {}) {
  if (!env.SYNC_CODE || !env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('[sync] SYNC_CODE または UPSTASH_REDIS_REST_URL / TOKEN が未設定です')
    throw new SyncError(503, '同期が設定されていません')
  }
  if (!request.code || !codesMatch(request.code, env.SYNC_CODE)) {
    throw new SyncError(401, '同期コードが違います')
  }

  const store = redis ?? createRedis(env)

  async function readRecord() {
    const raw = await store.get(SYNC_KEY)
    if (raw === null || raw === undefined) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  if (request.method === 'GET') {
    return { status: 200, json: { record: await readRecord() } }
  }

  if (request.method === 'PUT') {
    const body = request.body
    if (!isPlainObject(body) || !isIsoDate(body.updatedAt)) {
      throw new SyncError(400, '同期するデータの形式が正しくありません')
    }
    validateData(body.data)

    const record = { data: body.data, updatedAt: body.updatedAt, savedAt: new Date().toISOString() }
    const text = JSON.stringify(record)
    if (text.length > MAX_SYNC_BYTES) throw new SyncError(413, '同期するデータが大きすぎます')

    // 2台の変更がぶつかったら、更新日時が新しいほうを採用する。サーバーのほうが新しければ保存せずに返す
    const current = await readRecord()
    if (current && isIsoDate(current.updatedAt) && Date.parse(current.updatedAt) > Date.parse(body.updatedAt)) {
      return { status: 409, json: { conflict: true, record: current } }
    }

    await store.set(SYNC_KEY, text)
    return { status: 200, json: { updatedAt: record.updatedAt } }
  }

  throw new SyncError(405, 'GET か PUT で送ってください')
}
