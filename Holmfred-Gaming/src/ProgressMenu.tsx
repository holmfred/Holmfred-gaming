import { useEffect, useId, useRef, useState } from 'react'
import type { Progress } from './collection.ts'

type ProgressMenuProps = {
  title: string
  progress: Progress | null
  onSelect: (progress: Progress) => void
}

const OPTIONS: Array<{ id: Progress; label: string; hint: string }> = [
  { id: 'completed', label: '100%', hint: 'Unlocked all trophies + DLC' },
  { id: 'platinumed', label: 'Platinumed', hint: 'Unlocked the Platinum trophy' },
  {
    id: 'beaten',
    label: 'Completed / No Trophies',
    hint: 'Finished the game, no trophy hunt',
  },
  { id: 'not-finished', label: 'Not finished', hint: 'Still in progress' },
]

function statusLabel(progress: Progress | null) {
  if (progress === 'beaten') return 'Completed / No Trophies'
  if (progress === 'completed') return '100%'
  if (progress === 'platinumed') return 'Platinumed'
  if (progress === 'not-finished') return 'Not finished'
  return 'Progress'
}

export function ProgressMenu({
  title,
  progress,
  onSelect,
}: ProgressMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const label = statusLabel(progress)

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
        className={`status-trigger${progress ? ` is-${progress}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Progress for ${title}: ${label}`}
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
              aria-checked={progress === option.id}
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
