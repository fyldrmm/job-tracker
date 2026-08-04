import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function BoardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 4v16" />
    </svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 13h4" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
    </svg>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 16l4-4-4-4M20 12H9" />
    </svg>
  )
}

export function LoginIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M8 16l-4-4 4-4M4 12h11" />
    </svg>
  )
}

export function UserPlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M18 8v6M15 11h6" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M4.5 20c0-3.7 3.4-6.5 7.5-6.5s7.5 2.8 7.5 6.5" />
    </svg>
  )
}

export function NoteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z" strokeLinejoin="round" />
    </svg>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}

export function CoffeeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z" />
      <path d="M16 10.5h1.5a2.25 2.25 0 0 1 0 4.5H16" />
      <path d="M8 5.5c0-.7.5-1 .8-1.5M12 5.5c0-.7.5-1 .8-1.5" />
    </svg>
  )
}

export function FeedbackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16v11H9l-4 3.5V16H4Z" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 8.5 12 15.5 19 8.5" />
    </svg>
  )
}

export function ExtensionIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* The raw path's own geometry sits in the upper-left of the 24x24
          box (bbox center (12.5, 9.5), not (12, 12)) -- this transform
          re-centers it so it lines up with adjacent text on the same
          baseline instead of looking like it floats high. */}
      <path
        transform="translate(-0.5 2.5)"
        d="M9 4h4v2.5a1.5 1.5 0 0 0 3 0V4h4v4h-2.5a1.5 1.5 0 0 0 0 3H20v4h-4v-2.5a1.5 1.5 0 0 0-3 0V15H9v-4H6.5a1.5 1.5 0 0 1 0-3H9V4Z"
      />
    </svg>
  )
}

// Google's brand guidelines keep the four-color "G" mark as-is rather than
// recoloring it to match a host app's palette -- unlike every other icon
// here, this one doesn't use `base`/currentColor.
export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.15 7.15 0 0 1-10.66-3.76H1.42v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.41 14.33a7.2 7.2 0 0 1 0-4.66V6.58H1.42a12 12 0 0 0 0 10.84l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.42 6.58l3.99 3.09A7.15 7.15 0 0 1 12 4.77Z"
      />
    </svg>
  )
}
