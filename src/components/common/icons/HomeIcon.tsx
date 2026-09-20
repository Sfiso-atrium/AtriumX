type IconProps = {
  size?: number
  className?: string
  // Solid glyph, used when the icon sits on the blue active tile
  filled?: boolean
}

// Matches the blue of the active nav tile so the door reads as a cut-out
const TILE_BLUE = '#2563EB'

export default function HomeIcon({ size = 26, className, filled = false }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Rounded, hollow house shape */}
      <path d="M3.5 10.75 12 3.5l8.5 7.25V20a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-9.25Z" fill={filled ? 'currentColor' : 'none'} />

      {/* Hollow door with a visible bottom edge */}
      <path
        d="M9 21v-5.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75V21"
        fill={filled ? TILE_BLUE : 'none'}
        stroke={filled ? TILE_BLUE : 'currentColor'}
      />
      <path d="M9 21h6" stroke={filled ? TILE_BLUE : 'currentColor'} />
    </svg>
  )
}
