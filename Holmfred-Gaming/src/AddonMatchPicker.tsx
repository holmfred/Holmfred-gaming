import { useEffect, useId, useRef, useState } from 'react'
import type { Game } from './platforms.ts'

type ParentCandidate = Game & {
  platformId: string
  platformLabel: string
}

type AddonMatchPickerProps = {
  addonTitle: string
  candidates: ParentCandidate[]
  onMatch: (parent: { parent_id: number; parent_title: string }) => void
  onClear?: () => void
  canClear?: boolean
}

export function AddonMatchPicker({
  addonTitle,
  candidates,
  onMatch,
  onClear,
  canClear = false,
}: AddonMatchPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const normalized = query.trim().toLowerCase()
  const visible = candidates
    .filter((game) =>
      normalized ? game.title.toLowerCase().includes(normalized) : true,
    )
    .slice(0, 40)

  return (
    <div className="addon-match-picker" ref={rootRef}>
      <div className="addon-match-actions">
        <button
          type="button"
          className="addon-match-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          Match
        </button>
        {canClear && onClear ? (
          <button
            type="button"
            className="addon-match-clear"
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="addon-match-panel" id={panelId} role="dialog">
          <p className="addon-match-heading">Match “{addonTitle}”</p>
          <input
            type="search"
            value={query}
            placeholder="Search base games…"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
          {visible.length === 0 ? (
            <p className="addon-match-empty">No games found.</p>
          ) : (
            <ul>
              {visible.map((game) => (
                <li key={`${game.platformId}:${game.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onMatch({
                        parent_id: game.id,
                        parent_title: game.title,
                      })
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    {game.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
