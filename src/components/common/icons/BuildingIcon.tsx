type IconProps = {
  size?: number
  className?: string
  // Solid glyph, used when the icon sits on the blue active tile
  filled?: boolean
}

// Matches the blue of the active nav tile so the windows and door read as cut-outs
const TILE_BLUE = '#2563EB'

export default function BuildingIcon({ size = 24, className, filled = false }: IconProps) {
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
      {/* Rounded, hollow building block */}
      <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21" fill={filled ? 'currentColor' : 'none'} />
      <path d="M3 21h18" />

      {/* Windows */}
      <path d="M9 7.5h1.5M13.5 7.5H15M9 11.5h1.5M13.5 11.5H15" stroke={filled ? TILE_BLUE : 'currentColor'} />

      {/* Door */}
      <path
        d="M10 21v-3.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75V21"
        fill={filled ? TILE_BLUE : 'none'}
        stroke={filled ? TILE_BLUE : 'currentColor'}
      />
    </svg>
  )
}
