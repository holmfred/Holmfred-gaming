type HeartIconProps = {
  filled?: boolean
}

export function HeartIcon({ filled = false }: HeartIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 21s-6.7-4.35-9.33-8.1C.8 10.2 1.1 6.9 3.5 5.1c2-1.5 4.7-1.1 6.2.7L12 8.2l2.3-2.4c1.5-1.8 4.2-2.2 6.2-.7 2.4 1.8 2.7 5.1.83 7.8C18.7 16.65 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}
