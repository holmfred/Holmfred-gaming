import type { Game } from './platforms.ts'

export type Ownership = 'own' | 'dont-own'
export type Progress =
  | 'beaten'
  | 'completed'
  | 'platinumed'
  | 'not-finished'
export type OwnFormat = 'physical' | 'digital' | 'both'

export type CollectionGame = Game & {
  platformId: string
  platformLabel: string
  ownership: Ownership
  progress: Progress | null
  format: OwnFormat | null
}

const STORAGE_KEY = 'holmfred-collection'
const LEGACY_FAVORITES_KEY = 'holmfred-favorites'
const USER_PREFIX = 'holmfred-collection:'

export function normalizeCollectionGame(game: CollectionGame): CollectionGame {
  return {
    ...game,
    ownership: game.ownership === 'dont-own' ? 'dont-own' : 'own',
    progress:
      game.progress === 'beaten' ||
      game.progress === 'completed' ||
      game.progress === 'platinumed' ||
      game.progress === 'not-finished'
        ? game.progress
        : null,
    format:
      game.format === 'physical' ||
      game.format === 'digital' ||
      game.format === 'both'
        ? game.format
        : null,
  }
}

function isCollectionGame(value: unknown): value is CollectionGame {
  if (!value || typeof value !== 'object') return false
  const game = value as Partial<CollectionGame>
  return (
    typeof game.id === 'number' &&
    typeof game.title === 'string' &&
    Array.isArray(game.genres) &&
    typeof game.platformId === 'string' &&
    typeof game.platformLabel === 'string' &&
    (game.ownership === 'own' || game.ownership === 'dont-own')
  )
}

export function parseCollection(raw: string | null): CollectionGame[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCollectionGame).map(normalizeCollectionGame)
  } catch {
    return []
  }
}

function readUserScopedCollection() {
  let best: CollectionGame[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(USER_PREFIX)) continue
    const games = parseCollection(localStorage.getItem(key))
    if (games.length > best.length) best = games
  }
  return best
}

export function readLocalCollection(): CollectionGame[] {
  const existing = parseCollection(localStorage.getItem(STORAGE_KEY))
  if (existing.length > 0) return existing

  const fromUser = readUserScopedCollection()
  if (fromUser.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUser))
    return fromUser
  }

  const legacy = parseCollection(localStorage.getItem(LEGACY_FAVORITES_KEY))
  if (legacy.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
  }
  return legacy
}

export function writeLocalCollection(games: CollectionGame[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}
