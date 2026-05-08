import { makeId } from './profileStore'

export interface TrackerEntry {
  id: string
  date: string
  weight?: number
  bodyFat?: number
  note?: string
}

export const TRACKER_NOTE_MAX = 200
export const TRACKER_CHART_POINTS = 8

export function trackerKey(profileId: string): string {
  return `fitplan_tracker_${profileId}`
}

function isEntry(x: unknown): x is TrackerEntry {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.date === 'string'
}

export function loadEntries(profileId: string): TrackerEntry[] {
  try {
    const raw = localStorage.getItem(trackerKey(profileId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry)
  } catch {
    return []
  }
}

export function persistEntries(profileId: string, entries: TrackerEntry[]): void {
  localStorage.setItem(trackerKey(profileId), JSON.stringify(entries))
}

export function clearEntries(profileId: string): void {
  localStorage.removeItem(trackerKey(profileId))
}

export function newEntry(input: Omit<TrackerEntry, 'id'>): TrackerEntry {
  return { id: makeId(), ...input }
}
