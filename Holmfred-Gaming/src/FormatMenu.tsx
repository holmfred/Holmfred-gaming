import { useEffect, useId, useRef, useState } from 'react'
import type { OwnFormat } from './collection.ts'

type FormatMenuProps = {
  title: string
  format: OwnFormat | null
  onSelect: (format: OwnFormat) => void
}

const OPTIONS: Array<{ id: OwnFormat; label: string; hint: string }> = [
  { id: 'physical', label: 'Physical', hint: 'Disc or cartridge' },
  { id: 'digital', label: 'Digital', hint: 'Downloaded / PSN' },
  { id: 'both', label: 'Both', hint: 'Physical and digital' },
]

function statusLabel(format: OwnFormat | null) {
  if (format === 'physical') return 'Physical'
  if (format === 'digital') return 'Digital'
  if (format === 'both') return 'Both'
  return 'Format'
}

export function FormatMenu({ title, format, onSelect }: FormatMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const label = statusLabel(format)

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
        className={`status-trigger${format ? ` is-${format}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Format for ${title}: ${label}`}
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
              aria-checked={format === option.id}
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
