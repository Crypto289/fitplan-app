import { makeId } from './profileStore'

export type DiaryRating = 1 | 2 | 3 | 4 | 5

export interface DiaryEntry {
  id: string
  date: string
  trainingDay: string
  rating: DiaryRating
  completed: boolean
  note: string
}

export const DIARY_NOTE_MAX = 500

export function diaryKey(profileId: string): string {
  return `fitplan_diary_${profileId}`
}

function isEntry(x: unknown): x is DiaryEntry {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.date === 'string' &&
    typeof o.trainingDay === 'string' &&
    typeof o.rating === 'number' &&
    o.rating >= 1 &&
    o.rating <= 5 &&
    typeof o.completed === 'boolean' &&
    typeof o.note === 'string'
  )
}

export function loadDiary(profileId: string): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(diaryKey(profileId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry)
  } catch {
    return []
  }
}

export function persistDiary(profileId: string, entries: DiaryEntry[]): void {
  localStorage.setItem(diaryKey(profileId), JSON.stringify(entries))
}

export function clearDiary(profileId: string): void {
  localStorage.removeItem(diaryKey(profileId))
}

export function newDiaryEntry(input: Omit<DiaryEntry, 'id'>): DiaryEntry {
  return { id: makeId(), ...input }
}

// Returns the local-time Mon–Sun ISO date strings for the week containing `now`.
function isoWeekRange(now: Date): { mondayISO: string; sundayISO: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // JS Sunday=0 ... Saturday=6 → shift so Monday=0
  const dayIdx = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayIdx)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { mondayISO: toISO(monday), sundayISO: toISO(sunday) }
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function weekStats(
  entries: DiaryEntry[],
  plannedPerWeek: number,
  now: Date = new Date(),
): { done: number; planned: number } {
  const { mondayISO, sundayISO } = isoWeekRange(now)
  const done = entries.filter(
    (e) => e.completed && e.date >= mondayISO && e.date <= sundayISO,
  ).length
  return { done, planned: plannedPerWeek }
}
