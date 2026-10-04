import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth.tsx'
import {
  type CollectionGame,
  type OwnFormat,
  type Ownership,
  type Progress,
  normalizeCollectionGame,
  parseCollection,
  readLocalCollection,
  writeLocalCollection,
} from './collection.ts'
import type { Game } from './platforms.ts'
import { supabase } from './supabase.ts'

export type AddonMatch = {
  parent_id: number
  parent_title: string
}

type MatchMap = Record<string, AddonMatch>

type LibraryContextValue = {
  ready: boolean
  syncing: boolean
  collection: CollectionGame[]
  matches: MatchMap
  deleted: Set<string>
  setOwnership: (
    platformId: string,
    platformLabel: string,
    game: Game,
    ownership: Ownership,
  ) => void
  setProgress: (platformId: string, gameId: number, progress: Progress) => void
  setFormat: (platformId: string, gameId: number, format: OwnFormat) => void
  removeGame: (platformId: string, gameId: number) => void
  setMatch: (platformId: string, addonId: number, parent: AddonMatch) => void
  clearMatch: (platformId: string, addonId: number) => void
  getMatch: (platformId: string, addonId: number) => AddonMatch | null
  deleteAddon: (platformId: string, addonId: number) => void
  isDeleted: (platformId: string, addonId: number) => boolean
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

const LOCAL_MATCHES_KEY = 'holmfred-addon-matches'
const LOCAL_DELETED_KEY = 'holmfred-deleted-addons'
const SAVE_DEBOUNCE_MS = 600

function collectionKey(platformId: string, gameId: number) {
  return `${platformId}:${gameId}`
}

function parseMatches(raw: string | null): MatchMap {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const next: MatchMap = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as AddonMatch).parent_id === 'number' &&
        typeof (value as AddonMatch).parent_title === 'string'
      ) {
        next[key] = {
          parent_id: (value as AddonMatch).parent_id,
          parent_title: (value as AddonMatch).parent_title,
        }
      }
    }
    return next
  } catch {
    return {}
  }
}

function parseDeleted(raw: string | null): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed.filter((value): value is string => typeof value === 'string'),
    )
  } catch {
    return new Set()
  }
}

function readLocalMatches() {
  return parseMatches(localStorage.getItem(LOCAL_MATCHES_KEY))
}

function readLocalDeleted() {
  return parseDeleted(localStorage.getItem(LOCAL_DELETED_KEY))
}

function mergeGames(local: CollectionGame[], remote: CollectionGame[]) {
  if (remote.length === 0) return local
  if (local.length === 0) return remote
  const byKey = new Map<string, CollectionGame>()
  for (const game of remote) {
    byKey.set(collectionKey(game.platformId, game.id), game)
  }
  for (const game of local) {
    const key = collectionKey(game.platformId, game.id)
    if (!byKey.has(key)) byKey.set(key, game)
  }
  return [...byKey.values()]
}

function mergeMatches(local: MatchMap, remote: MatchMap) {
  return { ...local, ...remote }
}

function mergeDeleted(local: Set<string>, remote: Set<string>) {
  return new Set([...local, ...remote])
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [collection, setCollection] = useState<CollectionGame[]>(() =>
    readLocalCollection(),
  )
  const [matches, setMatches] = useState<MatchMap>(() => readLocalMatches())
  const [deleted, setDeleted] = useState<Set<string>>(() => readLocalDeleted())
  const [ready, setReady] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const skipNextSave = useRef(true)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      if (!user) {
        setReady(false)
        return
      }

      setReady(false)
      skipNextSave.current = true

      const localGames = readLocalCollection()
      const localMatches = readLocalMatches()
      const localDeleted = readLocalDeleted()

      const { data, error } = await supabase
        .from('user_libraries')
        .select('games, addon_matches, deleted_addons')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Failed to load library from Supabase:', error.message)
        setCollection(localGames)
        setMatches(localMatches)
        setDeleted(localDeleted)
        setReady(true)
        return
      }

      const remoteGames = parseCollection(
        data?.games ? JSON.stringify(data.games) : null,
      ).map(normalizeCollectionGame)
      const remoteMatches = parseMatches(
        data?.addon_matches ? JSON.stringify(data.addon_matches) : null,
      )
      const remoteDeleted = parseDeleted(
        data?.deleted_addons ? JSON.stringify(data.deleted_addons) : null,
      )

      const nextGames = mergeGames(localGames, remoteGames)
      const nextMatches = mergeMatches(localMatches, remoteMatches)
      const nextDeleted = mergeDeleted(localDeleted, remoteDeleted)

      setCollection(nextGames)
      setMatches(nextMatches)
      setDeleted(nextDeleted)
      writeLocalCollection(nextGames)
      localStorage.setItem(LOCAL_MATCHES_KEY, JSON.stringify(nextMatches))
      localStorage.setItem(
        LOCAL_DELETED_KEY,
        JSON.stringify([...nextDeleted]),
      )
      setReady(true)
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user || !ready) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    writeLocalCollection(collection)
    localStorage.setItem(LOCAL_MATCHES_KEY, JSON.stringify(matches))
    localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify([...deleted]))

    if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      setSyncing(true)
      void supabase
        .from('user_libraries')
        .upsert(
          {
            user_id: user.id,
            games: collection,
            addon_matches: matches,
            deleted_addons: [...deleted],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save library to Supabase:', error.message)
          }
          setSyncing(false)
        })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
    }
  }, [collection, matches, deleted, user, ready])

  function setOwnership(
    platformId: string,
    platformLabel: string,
    game: Game,
    ownership: Ownership,
  ) {
    setCollection((current) => {
      const key = collectionKey(platformId, game.id)
      const existing = current.find(
        (item) => collectionKey(item.platformId, item.id) === key,
      )

      if (existing?.ownership === ownership) {
        return current.filter(
          (item) => collectionKey(item.platformId, item.id) !== key,
        )
      }

      if (existing) {
        return current.map((item) =>
          collectionKey(item.platformId, item.id) === key
            ? {
                ...item,
                ...game,
                platformId,
                platformLabel,
                ownership,
                progress: ownership === 'own' ? item.progress : null,
                format: ownership === 'own' ? item.format : null,
              }
            : item,
        )
      }

      return [
        ...current,
        {
          ...game,
          platformId,
          platformLabel,
          ownership,
          progress: null,
          format: null,
        },
      ]
    })
  }

  function setProgress(
    platformId: string,
    gameId: number,
    progress: Progress,
  ) {
    setCollection((current) =>
      current.map((item) =>
        collectionKey(item.platformId, item.id) ===
        collectionKey(platformId, gameId)
          ? { ...item, progress }
          : item,
      ),
    )
  }

  function setFormat(
    platformId: string,
    gameId: number,
    format: OwnFormat,
  ) {
    setCollection((current) =>
      current.map((item) =>
        collectionKey(item.platformId, item.id) ===
        collectionKey(platformId, gameId)
          ? { ...item, format }
          : item,
      ),
    )
  }

  function removeGame(platformId: string, gameId: number) {
    const key = collectionKey(platformId, gameId)
    setCollection((current) =>
      current.filter(
        (item) => collectionKey(item.platformId, item.id) !== key,
      ),
    )
  }

  function setMatch(
    platformId: string,
    addonId: number,
    parent: AddonMatch,
  ) {
    setMatches((current) => ({
      ...current,
      [collectionKey(platformId, addonId)]: parent,
    }))
  }

  function clearMatch(platformId: string, addonId: number) {
    setMatches((current) => {
      const next = { ...current }
      delete next[collectionKey(platformId, addonId)]
      return next
    })
  }

  function getMatch(platformId: string, addonId: number) {
    return matches[collectionKey(platformId, addonId)] ?? null
  }

  function deleteAddon(platformId: string, addonId: number) {
    setDeleted((current) => {
      const next = new Set(current)
      next.add(collectionKey(platformId, addonId))
      return next
    })
  }

  function isDeleted(platformId: string, addonId: number) {
    return deleted.has(collectionKey(platformId, addonId))
  }

  const value = useMemo(
    () => ({
      ready,
      syncing,
      collection,
      matches,
      deleted,
      setOwnership,
      setProgress,
      setFormat,
      removeGame,
      setMatch,
      clearMatch,
      getMatch,
      deleteAddon,
      isDeleted,
    }),
    [ready, syncing, collection, matches, deleted],
  )

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  )
}

export function useLibrary() {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary must be used within LibraryProvider')
  return value
}
