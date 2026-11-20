// Vercel関数：GET / PUT /api/sync
// 自分専用の同期。同期コードはヘッダー X-Sync-Code で受け取る（URLに載せるとログに残りやすいため）。
// ローカル開発では vite.config.js の開発用ミドルウェアがこの関数を呼ぶ。
import { SyncError, handleSync } from '../server/syncStore.js'

export default async function handler(req, res) {
  try {
    const body = typeof req.body === 'string' && req.body !== '' ? JSON.parse(req.body) : req.body
    const { status, json } = await handleSync(
      { method: req.method, code: req.headers?.['x-sync-code'], body },
      process.env,
    )
    res.status(status).json(json)
  } catch (error) {
    // 接続情報や内部の情報は返さず、利用者向けの短い文だけを返す
    if (error instanceof SyncError) {
      res.status(error.status).json({ error: error.message })
    } else if (error instanceof SyntaxError) {
      res.status(400).json({ error: '送られたデータの形式が正しくありません' })
    } else {
      console.error('[sync] 予期しないエラー', error?.name ?? '')
      res.status(502).json({ error: '同期できませんでした。時間をおいてお試しください' })
    }
  }
}
