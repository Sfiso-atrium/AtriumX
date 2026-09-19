type IconProps = {
  size?: number
  className?: string
}

export default function HomeIcon({ size = 26, className }: IconProps) {
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
      <path d="M3.5 10.75 12 3.5l8.5 7.25V20a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-9.25Z" />

      {/* Hollow door with a visible bottom edge */}
      <path d="M9 21v-5.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75V21" />
      <path d="M9 21h6" />
    </svg>
  )
}
