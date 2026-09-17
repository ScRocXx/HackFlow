'use client'

import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let intervalId: ReturnType<typeof setInterval> | null = null
let currentNow = typeof window !== 'undefined' ? Date.now() : 0

function startTicker() {
  if (intervalId === null && typeof window !== 'undefined') {
    currentNow = Date.now()
    intervalId = setInterval(() => {
      currentNow = Date.now()
      listeners.forEach((listener) => listener())
    }, 1000)
  }
}

function stopTicker() {
  if (listeners.size === 0 && intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    startTicker()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stopTicker()
    }
  }
}

function getSnapshot() {
  return currentNow
}

function getServerSnapshot() {
  return 0
}

/**
 * Shared singleton ticker hook.
 * Only a single setInterval exists in the browser regardless of how many CountdownTimers are mounted.
 * Returns the current timestamp (ms) updated once per second.
 */
export function useTicker(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
