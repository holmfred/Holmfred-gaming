export type Game = {
  id: number
  url: string
  title: string
  genres: Array<string | null>
  release_year: number | null
  cover?: string | null
  parent_id?: number | null
  parent_title?: string | null
}

export function isAddon(game: Game) {
  return game.genres.some(
    (genre) => typeof genre === 'string' && /add-?on/i.test(genre),
  )
}

type GameModule = {
  default: Game[]
}

export type Platform = {
  id: string
  label: string
  load: () => Promise<GameModule>
}

export const platforms: Platform[] = [
  {
    id: 'playstation',
    label: 'PlayStation',
    load: () => import('./data/PlayStation.json'),
  },
  {
    id: 'playstation-2',
    label: 'PlayStation 2',
    load: () => import('./data/PlayStation_2.json'),
  },
  {
    id: 'playstation-3',
    label: 'PlayStation 3',
    load: () => import('./data/PlayStation_3.json'),
  },
  {
    id: 'playstation-4',
    label: 'PlayStation 4',
    load: () => import('./data/PlayStation_4.json'),
  },
  {
    id: 'playstation-5',
    label: 'PlayStation 5',
    load: () => import('./data/PlayStation_5.json'),
  },
  {
    id: 'playstation-vita',
    label: 'PlayStation Vita',
    load: () => import('./data/PlayStation_Vita.json'),
  },
]
