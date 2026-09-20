type IconProps = {
  size?: number
  className?: string
  // Solid glyph, used when the icon sits on the blue active tile
  filled?: boolean
}

// Matches the blue of the active nav tile so the text lines read as cut-outs
const TILE_BLUE = '#2563EB'

export default function ChatIcon({ size = 24, className, filled = false }: IconProps) {
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
      <path
        d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5 8.35 8.35 0 0 1-3.5-.76L4 20.5l1.26-3.46A8.46 8.46 0 0 1 3.5 11.5a8.5 8.5 0 1 1 17 0Z"
        fill={filled ? 'currentColor' : 'none'}
      />
      <path d="M8 10h8M8 14h5" stroke={filled ? TILE_BLUE : 'currentColor'} />
    </svg>
  )
}
