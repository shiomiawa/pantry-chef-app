import { useId, useState } from 'react'
import { useSyncState } from '../hooks/useSyncState.js'
import { checkRemote, disableSync, enableSync, getLocalSummary, syncNow } from '../sync/syncClient.js'

const STATUS_TEXT = {
  synced: '同期済み',
  pending: '送信待ち（少し待つと送られます）',
  syncing: '同期中…',
  offline: 'オフライン（電波が戻ったら送ります）',
  error: 'エラー',
}

function formatDateTime(iso) {
  if (!iso) return 'まだありません'
  const date = new Date(iso)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function SyncPanel() {
  const { status, message, lastSyncedAt } = useSyncState()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const inputId = useId()
  const isEnabled = status !== 'off'

  async function handleEnable(event) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setIsWorking(true)
    setError('')
    try {
      const record = await checkRemote(trimmed)
      const remote = {
        items: record?.data?.items?.length ?? 0,
        shopping: record?.data?.shopping?.length ?? 0,
      }
      const local = getLocalSummary()
      const isRemoteEmpty = remote.items === 0 && remote.shopping === 0
      const isLocalEmpty = local.items === 0 && local.shopping === 0

      // 空のデータで、もう一方の本物のデータを消さないようにする
      let useRemote
      if (isRemoteEmpty) {
        useRemote = false // 同期先が空なら、この端末のデータを送る
      } else if (isLocalEmpty) {
        useRemote = true // この端末が空なら、同期先のデータを受け取る
      } else {
        // 両方にデータがあるときは、どちらを残すかを選んでもらう
        const remoteText = `同期先：在庫${remote.items}品・買い物${remote.shopping}品（最終更新 ${formatDateTime(record.updatedAt)}）`
        const localText = `この端末：在庫${local.items}品・買い物${local.shopping}品`
        if (
          window.confirm(
            `${remoteText}\n${localText}\n\n同期先のデータで、この端末のデータを置き換えますか？\n（キャンセルすると、反対にこの端末のデータで同期先を上書きするか聞きます）`,
          )
        ) {
          useRemote = true
        } else if (
          window.confirm(
            `${localText}\n${remoteText}\n\nこの端末のデータで、同期先のデータを上書きしますか？\n（キャンセルすると、同期を始めません）`,
          )
        ) {
          useRemote = false
        } else {
          return
        }
      }

      await enableSync(trimmed, useRemote ? record : null)
      setCode('')
    } catch (enableError) {
      setError(enableError.message)
    } finally {
      setIsWorking(false)
    }
  }

  function handleDisable() {
    if (window.confirm('この端末の同期を止めます。この端末のデータはそのまま残ります。よろしいですか？')) {
      disableSync()
    }
  }

  return (
    <div className="panel">
      <h3 className="panel__title">同期（自分のPCとスマホ）</h3>
      <p className="help-text">
        同期コードを入れた端末どうしで、在庫・買い物リスト・名前の候補・最後の提案・保存したレシピをそろえます。コードを知っている人だけが使えます。
      </p>

      {isEnabled ? (
        <>
          <p className="sync-status">
            状態：<strong>{STATUS_TEXT[status] ?? ''}</strong>
            <br />
            最後に同期：{formatDateTime(lastSyncedAt)}
          </p>
          {status === 'error' && message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <div className="button-row">
            <button type="button" className="button" onClick={() => syncNow()}>
              今すぐ同期
            </button>
            <button type="button" className="button" onClick={handleDisable}>
              同期を止める
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleEnable}>
          <div className="field">
            <label htmlFor={inputId}>同期コード</label>
            <div className="inline-input">
              <input
                id={inputId}
                type="password"
                autoComplete="off"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                  setError('')
                }}
              />
              <button type="submit" className="button button--primary" disabled={!code.trim() || isWorking}>
                {isWorking ? '確認中…' : '同期を始める'}
              </button>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
