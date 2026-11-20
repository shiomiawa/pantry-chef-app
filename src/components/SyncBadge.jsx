import { useSyncState } from '../hooks/useSyncState.js'

const LABELS = {
  synced: '✓ 同期済み',
  pending: '↑ 送信待ち',
  syncing: '⟳ 同期中',
  offline: '… オフライン',
  error: '⚠ 同期エラー',
}

// 画面上部の小さな同期の状態。同期していない端末には何も出さない
export default function SyncBadge() {
  const { status, message } = useSyncState()
  if (status === 'off') return null
  return (
    <span className={`sync-badge sync-badge--${status}`} role="status" title={message || undefined}>
      {LABELS[status] ?? ''}
    </span>
  )
}
