import { useEffect, useRef, useState } from 'react'
import { platforms, type Game } from './platforms.ts'
import './App.css'

const PAGE_SIZE = 40

function App() {
  const [platformId, setPlatformId] = useState(platforms[0].id)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const platform = platforms.find((item) => item.id === platformId) ?? platforms[0]
  const listTopRef = useRef<HTMLDivElement>(null)
  const pageCount = Math.max(1, Math.ceil(games.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * PAGE_SIZE
  const visibleGames = games.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
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
  }, [platform])

  useEffect(() => {
    listTopRef.current?.scrollIntoView({ block: 'start' })
  }, [platformId, currentPage])

  function selectPlatform(id: string) {
    if (id === platformId) return
    setPlatformId(id)
    setLoading(true)
    setPage(0)
  }

  return (
    <div className="catalog">
      <header className="catalog-header">
        <p className="eyebrow">Holmfred Gaming</p>
        <h1>Game library</h1>
        <nav className="platform-nav" aria-label="Consoles">
          {platforms.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === platform.id}
              onClick={() => selectPlatform(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="game-list">
        <div className="list-heading" ref={listTopRef}>
          <h2>{platform.label}</h2>
          <p>
            {loading
              ? 'Loading games…'
              : `${games.length.toLocaleString()} games`}
          </p>
        </div>

        {loading ? null : (
          <>
            <ul>
              {visibleGames.map((game) => {
                const genres = game.genres.filter((genre): genre is string => Boolean(genre))

                return (
                  <li key={game.id}>
                    <a href={game.url} target="_blank" rel="noreferrer">
                      <span className="game-title">{game.title}</span>
                      <span className="game-meta">
                        {game.release_year ? <span>{game.release_year}</span> : null}
                        {genres.length > 0 ? <span>{genres.join(' · ')}</span> : null}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>

            <div className="pager">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <span>
                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, games.length)} of{' '}
                {games.length.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
