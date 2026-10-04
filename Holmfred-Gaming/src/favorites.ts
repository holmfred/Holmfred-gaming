import { useEffect, useState } from 'react'
import type { Game } from './platforms.ts'

export type Ownership = 'own' | 'dont-own'
export type Progress = 'completed' | 'platinumed' | 'not-finished'

export type FavoriteGame = Game & {
  platformId: string
  platformLabel: string
  ownership: Ownership | null
  progress: Progress | null
}

const STORAGE_KEY = 'holmfred-favorites'

function favoriteKey(platformId: string, gameId: number) {
  return `${platformId}:${gameId}`
}

function readFavorites(): FavoriteGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFavoriteGame).map(normalizeFavorite)
  } catch {
    return []
  }
}

function normalizeFavorite(game: FavoriteGame): FavoriteGame {
  return {
    ...game,
    ownership:
      game.ownership === 'own' || game.ownership === 'dont-own'
        ? game.ownership
        : null,
    progress:
      game.progress === 'completed' ||
      game.progress === 'platinumed' ||
      game.progress === 'not-finished'
        ? game.progress
        : null,
  }
}

function isFavoriteGame(value: unknown): value is FavoriteGame {
  if (!value || typeof value !== 'object') return false
  const game = value as Partial<FavoriteGame>
  return (
    typeof game.id === 'number' &&
    typeof game.title === 'string' &&
    Array.isArray(game.genres) &&
    typeof game.platformId === 'string' &&
    typeof game.platformLabel === 'string'
  )
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteGame[]>(() => readFavorites())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  function isFavorite(platformId: string, gameId: number) {
    const key = favoriteKey(platformId, gameId)
    return favorites.some(
      (game) => favoriteKey(game.platformId, game.id) === key,
    )
  }

  function toggleFavorite(
    platformId: string,
    platformLabel: string,
    game: Game,
  ) {
    setFavorites((current) => {
      const key = favoriteKey(platformId, game.id)
      const exists = current.some(
        (item) => favoriteKey(item.platformId, item.id) === key,
      )

      if (exists) {
        return current.filter(
          (item) => favoriteKey(item.platformId, item.id) !== key,
        )
      }

      return [
        ...current,
        {
          ...game,
          platformId,
          platformLabel,
          ownership: null,
          progress: null,
        },
      ]
    })
  }

  function setOwnership(
    platformId: string,
    gameId: number,
    ownership: Ownership,
  ) {
    setFavorites((current) =>
      current.map((item) =>
        favoriteKey(item.platformId, item.id) === favoriteKey(platformId, gameId)
          ? { ...item, ownership }
          : item,
      ),
    )
  }

  function setProgress(
    platformId: string,
    gameId: number,
    progress: Progress,
  ) {
    setFavorites((current) =>
      current.map((item) =>
        favoriteKey(item.platformId, item.id) === favoriteKey(platformId, gameId)
          ? { ...item, progress }
          : item,
      ),
    )
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    setOwnership,
    setProgress,
  }
}
