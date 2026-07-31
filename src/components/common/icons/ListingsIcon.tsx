type IconProps = {
  size?: number
  className?: string
}

export default function ListingsIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M0 0h24v24H0z" fill="none" />
<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M4 5h0.01" />
        <path d="M8 5h12" />
        <path d="M4 10h0.01" />
        <path d="M8 10h12" />
        <path d="M4 15h0.01" />
        <path d="M8 15h12" />
        <path d="M4 20h0.01" />
        <path d="M8 20h12" />
 </g>
    </svg>
  )
}
