import { useLibrary, type AddonMatch } from './library.tsx'

export type { AddonMatch }

export function useAddonMatches() {
  const { matches, setMatch, clearMatch, getMatch } = useLibrary()
  return { matches, setMatch, clearMatch, getMatch }
}
