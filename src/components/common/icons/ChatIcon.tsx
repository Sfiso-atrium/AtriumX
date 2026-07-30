type IconProps = {
  size?: number
  className?: string
}

export default function ChatIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" className={className}>
      <path d="M0 0h16v16H0z" fill="none" />
      <path
        fill="currentColor"
        d="M8 1a7 7 0 1 1-3.538 13.04l-2.804.935a.5.5 0 0 1-.633-.633l.934-2.806A7 7 0 0 1 8 1M5.5 9a.5.5 0 0 0 0 1h3a.5.5 0 1 0 0-1zm0-3a.5.5 0 0 0 0 1h5a.5.5 0 1 0 0-1z"
      />
    </svg>
  )
}
