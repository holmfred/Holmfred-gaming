import {
  type OwnFormat,
  type Ownership,
  type Progress,
} from './collection.ts'
import { useLibrary } from './library.tsx'

function collectionKey(platformId: string, gameId: number) {
  return `${platformId}:${gameId}`
}

export function useCollection() {
  const {
    collection,
    setOwnership,
    setProgress,
    setFormat,
    removeGame,
  } = useLibrary()

  function getOwnership(platformId: string, gameId: number): Ownership | null {
    const key = collectionKey(platformId, gameId)
    return (
      collection.find(
        (game) => collectionKey(game.platformId, game.id) === key,
      )?.ownership ?? null
    )
  }

  function getProgress(platformId: string, gameId: number): Progress | null {
    const key = collectionKey(platformId, gameId)
    return (
      collection.find(
        (game) => collectionKey(game.platformId, game.id) === key,
      )?.progress ?? null
    )
  }

  function getFormat(platformId: string, gameId: number): OwnFormat | null {
    const key = collectionKey(platformId, gameId)
    return (
      collection.find(
        (game) => collectionKey(game.platformId, game.id) === key,
      )?.format ?? null
    )
  }

  const haveGames = collection.filter((game) => game.ownership === 'own')
  const wantGames = collection.filter((game) => game.ownership === 'dont-own')

  return {
    collection,
    haveGames,
    wantGames,
    getOwnership,
    getProgress,
    getFormat,
    setOwnership,
    setProgress,
    setFormat,
    removeGame,
  }
}
