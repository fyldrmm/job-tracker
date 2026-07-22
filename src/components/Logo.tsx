import type { SVGProps } from 'react'

type LogoProps = SVGProps<SVGSVGElement>

export function LogoMark(props: LogoProps) {
  return (
    <svg viewBox="0 0 240 240" {...props}>
      <circle cx="120" cy="120" r="112" fill="#1c3a27" />
      <rect x="84" y="70" width="72" height="92" rx="10" fill="#fff" />
      <rect x="100" y="86" width="40" height="6" rx="3" fill="#1fa04e" />
      <rect x="100" y="102" width="40" height="6" rx="3" fill="#c9d0ca" />
      <rect x="100" y="118" width="24" height="6" rx="3" fill="#c9d0ca" />
      <circle cx="150" cy="146" r="20" fill="#1fa04e" />
      <path
        d="M141 146l6 6 12-12"
        stroke="#fff"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
