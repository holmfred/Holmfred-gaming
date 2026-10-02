export type Game = {
  id: number
  url: string
  title: string
  genres: Array<string | null>
  release_year: number | null
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
    id: 'playstation-vita',
    label: 'PlayStation Vita',
    load: () => import('./data/PlayStation_Vita.json'),
  },
]
