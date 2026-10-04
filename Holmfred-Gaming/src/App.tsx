import { useEffect, useMemo, useState } from 'react'
import { AddonMatchPicker } from './AddonMatchPicker.tsx'
import { useAddonMatches } from './addonMatches.ts'
import { useAuth } from './auth.tsx'
import { useDeletedAddons } from './deletedAddons.ts'
import { FormatMenu } from './FormatMenu.tsx'
import { GameCover } from './GameCover.tsx'
import { LoginScreen } from './LoginScreen.tsx'
import { useLibrary } from './library.tsx'
import { ProgressMenu } from './ProgressMenu.tsx'
import { supabaseConfigured } from './supabase.ts'
import { SupabaseSetup } from './SupabaseSetup.tsx'
import {
  type CollectionGame,
  type Ownership,
  type Progress,
} from './collection.ts'
import { isAddon, platforms, type Game } from './platforms.ts'
import { useCollection } from './useCollection.ts'
import './App.css'

const PAGE_SIZE = 40
const HAVE_ID = 'have'
const WANT_ID = 'want'
const ADDONS_ID = 'addons'
const ALL_PLATFORMS = 'all'

type AddonMatchFilter = 'all' | 'matched' | 'unmatched'
type HaveProgressFilter = 'all' | Progress | 'none'

type ListGame = Game & {
  platformId: string
  platformLabel: string
}

const ADDON_MATCH_OPTIONS: Array<{ id: AddonMatchFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'matched', label: 'Matched' },
  { id: 'unmatched', label: 'Unmatched' },
]

const HAVE_PROGRESS_OPTIONS: Array<{
  id: HaveProgressFilter
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: '100%' },
  { id: 'platinumed', label: 'Platinumed' },
  { id: 'beaten', label: 'Completed / No Trophies' },
  { id: 'not-finished', label: 'Not finished' },
  { id: 'none', label: 'No progress' },
]

function sortByTitle(games: ListGame[]) {
  return [...games].sort((a, b) => a.title.localeCompare(b.title))
}

function matchesHaveProgress(
  game: CollectionGame,
  filter: HaveProgressFilter,
) {
  if (filter === 'all') return true
  if (filter === 'none') return game.progress == null
  return game.progress === filter
}

function filterByTitle(games: ListGame[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return games
  return games.filter((game) => game.title.toLowerCase().includes(normalized))
}

function gameKey(game: { platformId: string; id: number }) {
  return `${game.platformId}:${game.id}`
}

function isAdminUser(email: string | undefined) {
  const allowed = (import.meta.env.VITE_ADMIN_EMAIL ?? '')
    .split(',')
    .map((value: string) => value.trim().toLowerCase())
    .filter(Boolean)
  if (!email || allowed.length === 0) return false
  return allowed.includes(email.trim().toLowerCase())
}

function Catalog() {
  const { user, logout } = useAuth()
  const { syncing } = useLibrary()
  const canManageAddons = isAdminUser(user?.email)
  const [platformId, setPlatformId] = useState(platforms[0].id)
  const [games, setGames] = useState<Game[]>([])
  const [allGames, setAllGames] = useState<ListGame[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [collectionPlatformFilter, setCollectionPlatformFilter] =
    useState(ALL_PLATFORMS)
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')
  const [haveProgressFilter, setHaveProgressFilter] =
    useState<HaveProgressFilter>('all')
  const [addonsPlatformFilter, setAddonsPlatformFilter] = useState(ALL_PLATFORMS)
  const [addonsSearchQuery, setAddonsSearchQuery] = useState('')
  const [addonMatchFilter, setAddonMatchFilter] =
    useState<AddonMatchFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedHaveKeys, setExpandedHaveKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const {
    haveGames,
    wantGames,
    getOwnership,
    getProgress,
    setOwnership,
    setProgress,
    setFormat,
    removeGame,
  } = useCollection()
  const { matches, setMatch, clearMatch, getMatch } = useAddonMatches()
  const { isDeleted, deleteAddon, deleted } = useDeletedAddons()

  const showingHave = platformId === HAVE_ID
  const showingWant = platformId === WANT_ID
  const showingCollection = showingHave || showingWant
  const showingAddons = platformId === ADDONS_ID
  const platform = platforms.find((item) => item.id === platformId) ?? platforms[0]
  const hasSearch = searchQuery.trim().length > 0
  const needsCatalog = hasSearch || showingAddons || showingHave
  const showPlatformMeta = showingCollection || hasSearch || showingAddons

  const activeCollection = (
    showingHave ? haveGames : showingWant ? wantGames : []
  ).filter(
    (game) => !isAddon(game) || !isDeleted(game.platformId, game.id),
  )
  const collectionPlatformIds = new Set(
    activeCollection.map((game) => game.platformId),
  )
  const hasCollectionSearch = collectionSearchQuery.trim().length > 0
  const filteredCollection = filterByTitle(
    collectionPlatformFilter === ALL_PLATFORMS
      ? activeCollection
      : activeCollection.filter(
          (game) => game.platformId === collectionPlatformFilter,
        ),
    collectionSearchQuery,
  )

  const resolvedCatalog = useMemo(() => {
    if (!allGames) return [] as ListGame[]
    return allGames
      .filter(
        (game) => !isAddon(game) || !isDeleted(game.platformId, game.id),
      )
      .map((game) => {
        if (!isAddon(game)) return game
        const override = matches[gameKey(game)]
        if (!override) return game
        return {
          ...game,
          parent_id: override.parent_id,
          parent_title: override.parent_title,
        }
      })
  }, [allGames, matches, deleted])

  const addonGames = useMemo(
    () => resolvedCatalog.filter(isAddon),
    [resolvedCatalog],
  )

  const sortedAddonGames = useMemo(
    () => (showingAddons ? sortByTitle(addonGames) : addonGames),
    [addonGames, showingAddons],
  )

  const addonsByParent = useMemo(() => {
    const map = new Map<string, ListGame[]>()
    if (!showingHave) return map
    for (const addon of addonGames) {
      if (addon.parent_id == null) continue
      const key = `${addon.platformId}:${addon.parent_id}`
      const group = map.get(key)
      if (group) group.push(addon)
      else map.set(key, [addon])
    }
    for (const [key, group] of map) {
      if (group.length > 1) map.set(key, sortByTitle(group))
    }
    return map
  }, [addonGames, showingHave])

  const hasAddonsSearch = addonsSearchQuery.trim().length > 0
  const addonsSearchNormalized = addonsSearchQuery.trim().toLowerCase()
  const filteredAddons = useMemo(() => {
    return sortedAddonGames.filter((game) => {
      if (
        addonsPlatformFilter !== ALL_PLATFORMS &&
        game.platformId !== addonsPlatformFilter
      ) {
        return false
      }
      if (addonMatchFilter === 'matched' && game.parent_id == null) {
        return false
      }
      if (addonMatchFilter === 'unmatched' && game.parent_id != null) {
        return false
      }
      if (!addonsSearchNormalized) return true
      return (
        game.title.toLowerCase().includes(addonsSearchNormalized) ||
        (game.parent_title?.toLowerCase().includes(addonsSearchNormalized) ??
          false)
      )
    })
  }, [
    sortedAddonGames,
    addonMatchFilter,
    addonsPlatformFilter,
    addonsSearchNormalized,
  ])

  const matchedAddonCount = useMemo(
    () => addonGames.filter((game) => game.parent_id != null).length,
    [addonGames],
  )
  const unmatchedAddonCount = addonGames.length - matchedAddonCount
  const baseGames = games.filter((game) => !isAddon(game))
  const needsMatchCandidates =
    showingAddons &&
    canManageAddons &&
    !hasSearch &&
    addonMatchFilter !== 'matched'
  const parentCandidatesByPlatform = useMemo(() => {
    const map = new Map<string, ListGame[]>()
    if (!needsMatchCandidates) return map
    for (const game of resolvedCatalog) {
      if (isAddon(game)) continue
      const group = map.get(game.platformId)
      if (group) group.push(game)
      else map.set(game.platformId, [game])
    }
    return map
  }, [needsMatchCandidates, resolvedCatalog])

  const progressFilteredCollection =
    showingHave && haveProgressFilter !== 'all'
      ? filteredCollection.filter((game) =>
          matchesHaveProgress(game as CollectionGame, haveProgressFilter),
        )
      : filteredCollection

  const haveParentKeys = new Set(
    progressFilteredCollection.map((game) => gameKey(game)),
  )
  const collectionListGames =
    showingHave && !hasSearch
      ? progressFilteredCollection.filter((game) => {
          if (!isAddon(game)) return true
          const parentId =
            matches[gameKey(game)]?.parent_id ?? game.parent_id ?? null
          if (parentId == null) return true
          return !haveParentKeys.has(`${game.platformId}:${parentId}`)
        })
      : progressFilteredCollection

  const listGames: ListGame[] = hasSearch
    ? sortByTitle(
        filterByTitle(
          (allGames ?? []).filter((game) => !isAddon(game)),
          searchQuery,
        ),
      )
    : showingAddons
      ? filteredAddons
      : showingCollection
        ? sortByTitle(collectionListGames)
        : sortByTitle(
            baseGames.map((game) => ({
              ...game,
              platformId: platform.id,
              platformLabel: platform.label,
            })),
          )

  const pageCount = Math.max(1, Math.ceil(listGames.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * PAGE_SIZE
  const visibleGames = listGames.slice(pageStart, pageStart + PAGE_SIZE)
  const listBusy = needsCatalog
    ? catalogLoading || !allGames
    : showingWant
      ? false
      : loading

  useEffect(() => {
    if (showingCollection || showingAddons) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    platform.load().then((module) => {
      if (cancelled) return
      setGames(module.default)
      setPage(0)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [platform, showingCollection, showingAddons])

  useEffect(() => {
    if (!needsCatalog) {
      setCatalogLoading(false)
      return
    }

    if (allGames) {
      setCatalogLoading(false)
      return
    }

    let cancelled = false
    setCatalogLoading(true)

    Promise.all(
      platforms.map(async (item) => {
        const module = await item.load()
        return module.default.map(
          (game): ListGame => ({
            ...game,
            platformId: item.id,
            platformLabel: item.label,
          }),
        )
      }),
    ).then((groups) => {
      if (cancelled) return
      setAllGames(groups.flat())
      setCatalogLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [needsCatalog, allGames])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [
    platformId,
    currentPage,
    hasSearch,
    addonMatchFilter,
    addonsPlatformFilter,
    addonsSearchQuery,
    collectionPlatformFilter,
    haveProgressFilter,
  ])

  useEffect(() => {
    if (
      collectionPlatformFilter !== ALL_PLATFORMS &&
      !activeCollection.some(
        (game) => game.platformId === collectionPlatformFilter,
      )
    ) {
      setCollectionPlatformFilter(ALL_PLATFORMS)
      setPage(0)
    }
  }, [activeCollection, collectionPlatformFilter])

  function selectView(id: string) {
    if (id === platformId) return
    setPlatformId(id)
    setSearchQuery('')
    setCollectionSearchQuery('')
    setExpandedHaveKeys(new Set())
    setLoading(id !== HAVE_ID && id !== WANT_ID && id !== ADDONS_ID)
    setCollectionPlatformFilter(ALL_PLATFORMS)
    setPage(0)
  }

  function confirmDeleteAddon(game: ListGame) {
    if (!canManageAddons) return
    const ok = window.confirm(
      `Permanently delete “${game.title}”? It will be hidden from Add-ons, Have, and Want.`,
    )
    if (!ok) return
    deleteAddon(game.platformId, game.id)
    clearMatch(game.platformId, game.id)
    removeGame(game.platformId, game.id)
  }

  function ownershipFor(game: ListGame): Ownership | null {
    if (showingWant && !hasSearch) return 'dont-own'
    return getOwnership(game.platformId, game.id)
  }

  function toggleHaveExpanded(key: string) {
    setExpandedHaveKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function renderCollectionActions(
    game: ListGame,
    ownership: Ownership | null,
    { showWant = true }: { showWant?: boolean } = {},
  ) {
    return (
      <div className="collection-actions">
        <button
          type="button"
          className="collection-toggle is-own"
          aria-pressed={ownership === 'own'}
          onClick={() =>
            setOwnership(
              game.platformId,
              game.platformLabel,
              game,
              'own',
            )
          }
        >
          Have
        </button>
        {showWant ? (
          <button
            type="button"
            className="collection-toggle is-dont-own"
            aria-pressed={ownership === 'dont-own'}
            onClick={() =>
              setOwnership(
                game.platformId,
                game.platformLabel,
                game,
                'dont-own',
              )
            }
          >
            Want
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="catalog">
      <header className="catalog-header">
        <div className="header-top">
          <p className="eyebrow">Holmfred Gaming</p>
          <div className="account-bar">
            {syncing ? <span className="account-name">Saving…</span> : null}
            <span className="account-name">{user?.email}</span>
            <button type="button" className="logout-button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>
        <div className="title-row">
          <h1>Game library</h1>
          <label className="search-field">
            <span className="visually-hidden">Search titles across all platforms</span>
            <input
              type="search"
              value={searchQuery}
              placeholder="Search all platforms…"
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setPage(0)
              }}
            />
          </label>
        </div>
        <nav className="platform-nav" aria-label="Consoles">
          <button
            type="button"
            aria-pressed={showingHave}
            onClick={() => selectView(HAVE_ID)}
          >
            Have
            {haveGames.length > 0 ? (
              <span className="nav-count">{haveGames.length}</span>
            ) : null}
          </button>
          <button
            type="button"
            aria-pressed={showingWant}
            onClick={() => selectView(WANT_ID)}
          >
            Want
            {wantGames.length > 0 ? (
              <span className="nav-count">{wantGames.length}</span>
            ) : null}
          </button>
          <button
            type="button"
            aria-pressed={showingAddons}
            onClick={() => selectView(ADDONS_ID)}
          >
            Add-ons
            {allGames ? (
              <span className="nav-count">{addonGames.length}</span>
            ) : null}
          </button>
          {platforms.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === platformId}
              onClick={() => selectView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="game-list">
        <div className="list-heading">
          <div className="list-heading-text">
            <h2>
              {hasSearch
                ? 'Search results'
                : showingHave
                  ? 'Have'
                  : showingWant
                    ? 'Want'
                    : showingAddons
                      ? 'Add-ons'
                      : platform.label}
            </h2>
            <p>
              {listBusy
                ? 'Loading games…'
                : hasSearch
                  ? `${listGames.length.toLocaleString()} matches across all platforms`
                  : showingCollection
                    ? activeCollection.length === 0
                      ? showingHave
                        ? 'No games marked as Have yet'
                        : 'No games marked as Want yet'
                      : hasCollectionSearch ||
                          collectionPlatformFilter !== ALL_PLATFORMS
                        ? `${listGames.length.toLocaleString()} of ${activeCollection.length.toLocaleString()} games`
                        : `${activeCollection.length.toLocaleString()} games`
                    : showingAddons
                      ? hasAddonsSearch ||
                        addonsPlatformFilter !== ALL_PLATFORMS ||
                        addonMatchFilter !== 'all'
                        ? `${listGames.length.toLocaleString()} shown · ${matchedAddonCount.toLocaleString()} matched · ${unmatchedAddonCount.toLocaleString()} unmatched`
                        : `${addonGames.length.toLocaleString()} total · ${matchedAddonCount.toLocaleString()} matched · ${unmatchedAddonCount.toLocaleString()} unmatched`
                      : `${baseGames.length.toLocaleString()} games`}
            </p>
          </div>

          {!hasSearch && showingCollection ? (
            <label className="search-field collection-search">
              <span className="visually-hidden">
                Search {showingHave ? 'Have' : 'Want'} titles
              </span>
              <input
                type="search"
                value={collectionSearchQuery}
                placeholder={`Search ${showingHave ? 'Have' : 'Want'}…`}
                onChange={(event) => {
                  setCollectionSearchQuery(event.target.value)
                  setPage(0)
                }}
              />
            </label>
          ) : null}

          {!hasSearch && showingCollection && activeCollection.length > 0 ? (
            <div className="list-toolbar">
              <div
                className="sort-controls"
                role="group"
                aria-label={`Filter ${showingHave ? 'Have' : 'Want'} by platform`}
              >
                <span className="sort-label">Platform</span>
                <button
                  type="button"
                  aria-pressed={collectionPlatformFilter === ALL_PLATFORMS}
                  onClick={() => {
                    setCollectionPlatformFilter(ALL_PLATFORMS)
                    setPage(0)
                  }}
                >
                  All
                </button>
                {platforms
                  .filter((item) => collectionPlatformIds.has(item.id))
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={collectionPlatformFilter === item.id}
                      onClick={() => {
                        setCollectionPlatformFilter(item.id)
                        setPage(0)
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
              {showingHave ? (
                <div
                  className="sort-controls"
                  role="group"
                  aria-label="Filter Have by progress"
                >
                  <span className="sort-label">Progress</span>
                  {HAVE_PROGRESS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={haveProgressFilter === option.id}
                      onClick={() => {
                        setHaveProgressFilter(option.id)
                        setPage(0)
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {!hasSearch && showingAddons ? (
            <label className="search-field addons-search">
              <span className="visually-hidden">Search add-ons</span>
              <input
                type="search"
                value={addonsSearchQuery}
                placeholder="Search add-ons…"
                onChange={(event) => {
                  setAddonsSearchQuery(event.target.value)
                  setPage(0)
                }}
              />
            </label>
          ) : null}

          {!hasSearch && showingAddons && addonGames.length > 0 ? (
            <div className="list-toolbar addons-toolbar">
              <div
                className="sort-controls"
                role="group"
                aria-label="Filter add-ons by match status"
              >
                <span className="sort-label">Match</span>
                {ADDON_MATCH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={addonMatchFilter === option.id}
                    onClick={() => {
                      setAddonMatchFilter(option.id)
                      setPage(0)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div
                className="sort-controls"
                role="group"
                aria-label="Filter add-ons by platform"
              >
                <span className="sort-label">Platform</span>
                <button
                  type="button"
                  aria-pressed={addonsPlatformFilter === ALL_PLATFORMS}
                  onClick={() => {
                    setAddonsPlatformFilter(ALL_PLATFORMS)
                    setPage(0)
                  }}
                >
                  All
                </button>
                {platforms.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={addonsPlatformFilter === item.id}
                    onClick={() => {
                      setAddonsPlatformFilter(item.id)
                      setPage(0)
                    }}
                  >
                    {item.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {listBusy ? null : (
          <>
            {!hasSearch && showingCollection && activeCollection.length === 0 ? (
              <p className="empty-state">
                {showingHave
                  ? 'Tap Have on any game to add it here.'
                  : 'Tap Want on any game to add it here.'}
              </p>
            ) : listGames.length === 0 ? (
              <p className="empty-state">
                {hasSearch
                  ? 'No titles match your search.'
                  : showingCollection
                    ? hasCollectionSearch
                      ? 'No titles match your search.'
                      : 'No games for this platform.'
                    : showingAddons
                      ? hasAddonsSearch
                        ? 'No add-ons match your search.'
                        : 'No add-ons in this filter.'
                      : 'No games found.'}
              </p>
            ) : (
              <ul
                className={
                  !hasSearch && !showingCollection && !showingAddons
                    ? 'game-grid'
                    : undefined
                }
              >
                {visibleGames.map((game) => {
                  const key = gameKey(game)
                  const ownership =
                    showingHave && !hasSearch
                      ? 'own'
                      : ownershipFor(game)
                  const collectionGame =
                    showingHave && !hasSearch
                      ? (game as CollectionGame)
                      : null
                  const progress =
                    ownership === 'own'
                      ? (collectionGame?.progress ??
                        getProgress(game.platformId, game.id))
                      : null
                  const format =
                    ownership === 'own'
                      ? (collectionGame?.format ?? null)
                      : null
                  const showAddonMatch = showingAddons && !hasSearch
                  const showCollectionActions = !showingAddons || hasSearch
                  const relatedAddons =
                    showingHave && !hasSearch
                      ? (addonsByParent.get(key) ?? [])
                      : []
                  const expanded = expandedHaveKeys.has(key)
                  const manualMatch = showAddonMatch
                    ? getMatch(game.platformId, game.id)
                    : null
                  const showMatchPicker =
                    showAddonMatch &&
                    canManageAddons &&
                    (game.parent_id == null || Boolean(manualMatch))

                  return (
                    <li key={key} className={expanded ? 'is-expanded' : undefined}>
                      <div
                        className={
                          showAddonMatch ? 'game-row addon-list-row' : 'game-row'
                        }
                      >
                        <div className="game-main">
                          <GameCover title={game.title} cover={game.cover} />
                          <span className="game-copy">
                            {relatedAddons.length > 0 ? (
                              <button
                                type="button"
                                className="game-title-toggle"
                                aria-expanded={expanded}
                                onClick={() => toggleHaveExpanded(key)}
                              >
                                <span className="game-title">{game.title}</span>
                                <span className="addon-count">
                                  {`${relatedAddons.length.toLocaleString()} add-on${
                                    relatedAddons.length === 1 ? '' : 's'
                                  }`}
                                </span>
                                <span className="expand-caret" aria-hidden="true">
                                  {expanded ? '▴' : '▾'}
                                </span>
                              </button>
                            ) : (
                              <span className="game-title">{game.title}</span>
                            )}
                            {showAddonMatch ? (
                              game.parent_title ? (
                                <span className="addon-parent matched">
                                  {game.parent_title}
                                </span>
                              ) : (
                                <span className="addon-parent unmatched">
                                  Unmatched
                                </span>
                              )
                            ) : null}
                            <span className="game-meta">
                              {showPlatformMeta ? (
                                <span>{game.platformLabel}</span>
                              ) : null}
                              {game.release_year ? (
                                <span>{game.release_year}</span>
                              ) : null}
                            </span>
                          </span>
                        </div>
                        {showAddonMatch ? (
                          <div className="addon-row-actions">
                            {showMatchPicker ? (
                              <AddonMatchPicker
                                addonTitle={game.title}
                                candidates={
                                  parentCandidatesByPlatform.get(
                                    game.platformId,
                                  ) ?? []
                                }
                                canClear={Boolean(manualMatch)}
                                onClear={() => {
                                  if (!canManageAddons) return
                                  clearMatch(game.platformId, game.id)
                                }}
                                onMatch={(parent) => {
                                  if (!canManageAddons) return
                                  setMatch(game.platformId, game.id, parent)
                                }}
                              />
                            ) : null}
                            {canManageAddons ? (
                              <button
                                type="button"
                                className="addon-delete"
                                onClick={() => confirmDeleteAddon(game)}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {showCollectionActions
                          ? renderCollectionActions(game, ownership, {
                              showWant: !showingHave || hasSearch,
                            })
                          : null}
                        {showingHave && !hasSearch ? (
                          <>
                            <FormatMenu
                              title={game.title}
                              format={format}
                              onSelect={(value) =>
                                setFormat(game.platformId, game.id, value)
                              }
                            />
                            <ProgressMenu
                              title={game.title}
                              progress={progress}
                              onSelect={(value) =>
                                setProgress(game.platformId, game.id, value)
                              }
                            />
                          </>
                        ) : null}
                      </div>

                      {expanded && relatedAddons.length > 0 ? (
                        <ul className="addon-dropdown">
                          {relatedAddons.map((addon) => {
                            const addonOwnership = getOwnership(
                              addon.platformId,
                              addon.id,
                            )

                            return (
                              <li key={gameKey(addon)}>
                                <div className="game-row addon-row">
                                  <div className="game-main">
                                    <GameCover
                                      title={addon.title}
                                      cover={addon.cover}
                                    />
                                    <span className="game-copy">
                                      <span className="game-title">
                                        {addon.title}
                                      </span>
                                      <span className="game-meta">
                                        <span>Add-on</span>
                                        {addon.release_year ? (
                                          <span>{addon.release_year}</span>
                                        ) : null}
                                      </span>
                                    </span>
                                  </div>
                                  {renderCollectionActions(
                                    addon,
                                    addonOwnership,
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}

            {listGames.length > 0 ? (
              <div className="pager">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </button>
                <span>
                  {pageStart + 1}–
                  {Math.min(pageStart + PAGE_SIZE, listGames.length)} of{' '}
                  {listGames.length.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(pageCount - 1, value + 1))
                  }
                  disabled={currentPage >= pageCount - 1}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}

function App() {
  if (!supabaseConfigured) return <SupabaseSetup />

  return <AuthedApp />
}

function AuthedApp() {
  const { user, ready } = useAuth()
  const { ready: libraryReady } = useLibrary()

  if (!ready) return null
  if (!user) return <LoginScreen />
  if (!libraryReady) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p className="eyebrow">Holmfred Gaming</p>
          <h1>Loading library…</h1>
          <p className="auth-copy">Syncing your Have / Want list.</p>
        </div>
      </div>
    )
  }

  return <Catalog />
}

export default App
