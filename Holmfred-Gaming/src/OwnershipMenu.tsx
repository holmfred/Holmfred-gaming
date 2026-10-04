import { useEffect, useId, useRef, useState } from 'react'
import type { Ownership } from './favorites.ts'

type OwnershipMenuProps = {
  title: string
  ownership: Ownership | null
  onSelect: (ownership: Ownership) => void
}

const OPTIONS: Array<{ id: Ownership; label: string; hint: string }> = [
  { id: 'own', label: 'Have it', hint: 'In your collection' },
  { id: 'dont-own', label: 'Want it', hint: 'Still looking for it' },
]

function statusLabel(ownership: Ownership | null) {
  if (ownership === 'own') return 'Have it'
  if (ownership === 'dont-own') return 'Want it'
  return 'Status'
}

export function OwnershipMenu({
  title,
  ownership,
  onSelect,
}: OwnershipMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const label = statusLabel(ownership)

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

  return (
    <div className="status-menu" ref={rootRef}>
      <button
        type="button"
        className={`status-trigger${ownership ? ` is-${ownership}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Collection status for ${title}: ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="status-trigger-label">{label}</span>
        <span className="status-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="status-dropdown" role="menu" id={menuId}>
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={ownership === option.id}
              className={`status-option is-${option.id}`}
              onClick={() => {
                onSelect(option.id)
                setOpen(false)
              }}
            >
              <span className="status-option-label">{option.label}</span>
              <span className="status-option-hint">{option.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
