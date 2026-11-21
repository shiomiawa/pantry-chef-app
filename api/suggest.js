// Vercel関数：POST /api/suggest
// 在庫と条件を受け取り、Claude API で献立3案を作って JSON で返す。
// ローカル開発では vite.config.js の開発用ミドルウェアがこの関数を呼ぶ。
import { SuggestError, suggestMenus } from '../server/suggestMenus.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'POST で送ってください' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    // デモコード（または自分専用の同期コード）はヘッダー X-Access-Code で受け取る（URLに載せるとログに残りやすいため）
    const result = await suggestMenus(body, process.env, req.headers?.['x-access-code'])
    res.status(200).json(result)
  } catch (error) {
    // APIキーや内部の情報は返さず、利用者向けの短い文だけを返す
    if (error instanceof SuggestError) {
      res.status(error.status).json({ error: error.message })
    } else if (error instanceof SyntaxError) {
      res.status(400).json({ error: '送られたデータの形式が正しくありません' })
    } else {
      console.error('[suggest] 予期しないエラー', error?.name ?? '')
      res.status(500).json({ error: '提案を作れませんでした。時間をおいてお試しください' })
    }
  }
}
