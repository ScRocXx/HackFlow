'use client'

import { useState, useEffect } from 'react'
import {
  addOutboxMutation,
  getOutboxMutations,
  removeOutboxMutation,
  OutboxMutation,
} from './idb-store'
import { toggleDeliverable, claimDeliverable, addDeliverable } from '@/app/actions/deliverables'
import { updateSquadScratchpad } from '@/app/actions/vault'

export type SyncState = 'synced' | 'syncing' | 'offline'

type SyncListener = (state: SyncState, pendingCount: number) => void
const listeners = new Set<SyncListener>()

let currentSyncState: SyncState = 'synced'
let pendingCount = 0
let isProcessing = false

function notifyListeners() {
  listeners.forEach((listener) => listener(currentSyncState, pendingCount))
}

export function subscribeSyncStatus(listener: SyncListener) {
  listeners.add(listener)
  listener(currentSyncState, pendingCount)
  return () => {
    listeners.delete(listener)
  }
}

export async function processPendingOutbox(): Promise<void> {
  if (isProcessing || typeof window === 'undefined') return
  isProcessing = true

  try {
    const mutations = await getOutboxMutations()
    pendingCount = mutations.length

    if (mutations.length === 0) {
      currentSyncState = 'synced'
      notifyListeners()
      isProcessing = false
      return
    }

    currentSyncState = 'syncing'
    notifyListeners()

    for (const mutation of mutations) {
      let success = false
      let isNetworkFailure = false

      try {
        let res: any
        if (mutation.type === 'DELIVERABLE_TOGGLE') {
          res = await toggleDeliverable(mutation.payload.id, mutation.payload.isDone)
        } else if (mutation.type === 'DELIVERABLE_CLAIM') {
          res = await claimDeliverable(mutation.payload.id)
        } else if (mutation.type === 'DELIVERABLE_ADD') {
          res = await addDeliverable(mutation.payload.stageId, mutation.payload.title)
        } else if (mutation.type === 'SCRATCHPAD_UPDATE') {
          res = await updateSquadScratchpad(mutation.payload.squadId, mutation.payload.data)
        }
        success = Boolean(res?.success)

        if (!success) {
          const errStr = (res?.error || '').toLowerCase()
          isNetworkFailure = (typeof navigator !== 'undefined' && !navigator.onLine) ||
            errStr.includes('fetch') ||
            errStr.includes('network')
        }
      } catch (err: any) {
        // Network connection error during fetch: keep remaining mutations in queue
        isNetworkFailure = true
      }

      if (success) {
        await removeOutboxMutation(mutation.id)
      } else if (isNetworkFailure) {
        // Truly offline or network dropped: stop processing remaining queue
        break
      } else {
        // 4xx or database constraint violation: drop poison pill so queue doesn't freeze
        console.warn(`[Outbox] Dropping rejected mutation ${mutation.id} (${mutation.type}) to unblock sync queue.`)
        await removeOutboxMutation(mutation.id)
      }
    }

    const remaining = await getOutboxMutations()
    pendingCount = remaining.length
    currentSyncState = remaining.length > 0 ? 'offline' : 'synced'
    notifyListeners()
  } catch {
    currentSyncState = 'offline'
    notifyListeners()
  } finally {
    isProcessing = false
  }
}

export async function executeWithOfflineOutbox(
  type: OutboxMutation['type'],
  payload: any,
  onlineAction: () => Promise<any>
): Promise<{ success: boolean; queuedLocally?: boolean; error?: string }> {
  // If browser reports offline up-front, immediately enqueue to IndexedDB
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await addOutboxMutation({ type, payload })
    pendingCount += 1
    currentSyncState = 'offline'
    notifyListeners()
    return { success: true, queuedLocally: true }
  }

  try {
    const result = await onlineAction()
    if (result && result.success) {
      // Online execution succeeded immediately
      return { success: true }
    } else {
      // Check if error is network-related
      const isNetworkErr =
        result?.error &&
        (result.error.toLowerCase().includes('fetch failed') ||
          result.error.toLowerCase().includes('network') ||
          result.error.toLowerCase().includes('failed to fetch'))

      if (isNetworkErr) {
        await addOutboxMutation({ type, payload })
        pendingCount += 1
        currentSyncState = 'offline'
        notifyListeners()
        return { success: true, queuedLocally: true }
      }

      return { success: false, error: result?.error || 'Action failed' }
    }
  } catch (error: any) {
    // Exception thrown typically means offline / unreachable network
    await addOutboxMutation({ type, payload })
    pendingCount += 1
    currentSyncState = 'offline'
    notifyListeners()
    return { success: true, queuedLocally: true }
  }
}

// React Hook for connection state pill
export function useSyncStatus() {
  const [state, setState] = useState<SyncState>(currentSyncState)
  const [count, setCount] = useState<number>(pendingCount)

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newState, newCount) => {
      setState(newState)
      setCount(newCount)
    })

    const handleOnline = () => {
      processPendingOutbox()
    }

    window.addEventListener('online', handleOnline)

    // Initial check on mount
    processPendingOutbox()

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return { syncState: state, pendingCount: count, retrySync: processPendingOutbox }
}
