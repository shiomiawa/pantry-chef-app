import { useSyncExternalStore } from 'react'
import { getSyncState, subscribeSync } from '../sync/syncClient.js'

// 同期の状態（status / message / lastSyncedAt）を画面で使う
export function useSyncState() {
  return useSyncExternalStore(subscribeSync, getSyncState)
}
