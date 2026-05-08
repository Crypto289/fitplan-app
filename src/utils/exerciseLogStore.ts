export interface ExerciseLogEntry {
  date: string
  weight: number
  reps?: number
}

export interface ExerciseLog {
  exerciseName: string
  entries: ExerciseLogEntry[]
}

export function exerciseLogKey(profileId: string): string {
  return `fitplan_exercise_log_${profileId}`
}

function isEntry(x: unknown): x is ExerciseLogEntry {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.date === 'string' && typeof o.weight === 'number' && o.weight > 0
}

function isLog(x: unknown): x is ExerciseLog {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.exerciseName === 'string' && Array.isArray(o.entries)
}

export function loadLogs(profileId: string): ExerciseLog[] {
  try {
    const raw = localStorage.getItem(exerciseLogKey(profileId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLog).map((l) => ({
      exerciseName: l.exerciseName,
      entries: l.entries.filter(isEntry),
    }))
  } catch {
    return []
  }
}

export function persistLogs(profileId: string, logs: ExerciseLog[]): void {
  localStorage.setItem(exerciseLogKey(profileId), JSON.stringify(logs))
}

export function clearLogs(profileId: string): void {
  localStorage.removeItem(exerciseLogKey(profileId))
}

function nameKey(s: string): string {
  return s.trim().toLowerCase()
}

export function getLog(logs: ExerciseLog[], exerciseName: string): ExerciseLog | undefined {
  const k = nameKey(exerciseName)
  return logs.find((l) => nameKey(l.exerciseName) === k)
}

export function appendEntry(
  profileId: string,
  exerciseName: string,
  entry: ExerciseLogEntry,
): ExerciseLog[] {
  const logs = loadLogs(profileId)
  const k = nameKey(exerciseName)
  const idx = logs.findIndex((l) => nameKey(l.exerciseName) === k)
  let next: ExerciseLog[]
  if (idx === -1) {
    next = [...logs, { exerciseName: exerciseName.trim(), entries: [entry] }]
  } else {
    next = logs.map((l, i) =>
      i === idx ? { ...l, entries: [...l.entries, entry] } : l,
    )
  }
  persistLogs(profileId, next)
  return next
}
