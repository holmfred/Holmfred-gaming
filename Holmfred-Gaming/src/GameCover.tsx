import { useState } from 'react'

type GameCoverProps = {
  title: string
  cover?: string | null
}

export function GameCover({ title, cover }: GameCoverProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(cover) && !failed

  return (
    <span className="game-cover" aria-hidden="true">
      {showImage ? (
        <img
          src={cover!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="game-cover-fallback">{title.slice(0, 1)}</span>
      )}
    </span>
  )
}
