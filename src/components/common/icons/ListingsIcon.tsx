type IconProps = {
  size?: number
  className?: string
}

export default function ListingsIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M0 0h24v24H0z" fill="none" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path strokeDasharray="4" d="M4 5h0.01">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="4;0" />
        </path>
        <path strokeDasharray="14" strokeDashoffset="14" d="M8 5h12">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.1s" dur="0.2s" to="0" />
        </path>
        <path strokeDasharray="4" strokeDashoffset="4" d="M4 10h0.01">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.3s" dur="0.2s" to="0" />
        </path>
        <path strokeDasharray="14" strokeDashoffset="14" d="M8 10h12">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.2s" to="0" />
        </path>
        <path strokeDasharray="4" strokeDashoffset="4" d="M4 15h0.01">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" to="0" />
        </path>
        <path strokeDasharray="14" strokeDashoffset="14" d="M8 15h12">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" to="0" />
        </path>
        <path strokeDasharray="4" strokeDashoffset="4" d="M4 20h0.01">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.9s" dur="0.2s" to="0" />
        </path>
        <path strokeDasharray="14" strokeDashoffset="14" d="M8 20h12">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="1s" dur="0.2s" to="0" />
        </path>
      </g>
    </svg>
  )
}
