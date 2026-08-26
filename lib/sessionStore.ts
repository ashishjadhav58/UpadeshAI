export type StoredSession = {
  sessionId: string
  title: string
  updatedAt: string
}

const KEY = 'upadesh-session-list'
const ACTIVE_KEY = 'dharma-session-id'

export function loadSessionList(): StoredSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessionList(list: StoredSession[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)))
}

/** Upsert a session at the top of the list */
export function rememberSession(sessionId: string, title?: string) {
  const list = loadSessionList().filter((s) => s.sessionId !== sessionId)
  const prev = loadSessionList().find((s) => s.sessionId === sessionId)
  list.unshift({
    sessionId,
    title: (title || prev?.title || 'New chat').substring(0, 60),
    updatedAt: new Date().toISOString(),
  })
  saveSessionList(list)
  localStorage.setItem(ACTIVE_KEY, sessionId)
  return list
}

export function removeSession(sessionId: string) {
  const list = loadSessionList().filter((s) => s.sessionId !== sessionId)
  saveSessionList(list)
  if (localStorage.getItem(ACTIVE_KEY) === sessionId) {
    localStorage.removeItem(ACTIVE_KEY)
  }
  return list
}

export function clearActiveSession() {
  localStorage.removeItem(ACTIVE_KEY)
}
