// Illustrative demo of the screenshot-extraction flow: a job-posting
// screenshot on the left, its details landing in form fields on the right.
// Deliberately NOT a screen capture of the real app -- it's a concept
// sketch, so it can't go stale when the real UI changes, and it stays a
// few KB of inline SVG instead of a bitmap.
//
// PLACEHOLDER: currently renders the static end state. The animation is
// added last, on purpose, so the surrounding layout could be reviewed
// first. When animating, keep the reduced-motion branch below rendering
// exactly this frame -- the still has to read as complete on its own.
export function ExtractionDemoAnimation() {
  return (
    <svg
      viewBox="0 0 240 96"
      className="w-full h-auto"
      role="img"
      // Deliberately does NOT name the individual fields it fills. Naming
      // them made this image's accessible label collide with the real
      // form's field labels whenever the form opened over an empty board,
      // so label-based navigation (and getByLabelText) matched two things.
      aria-label="Illustration: a job posting on the left, its details filled into form fields on the right."
    >
      {/* Screenshot: a page of text standing in for a job posting. */}
      <rect x="8" y="14" width="72" height="68" rx="4" className="fill-white stroke-slate-300" strokeWidth="1" />
      <rect x="16" y="24" width="40" height="5" rx="2" className="fill-slate-400" />
      <rect x="16" y="34" width="52" height="3" rx="1.5" className="fill-slate-200" />
      <rect x="16" y="41" width="46" height="3" rx="1.5" className="fill-slate-200" />
      <rect x="16" y="48" width="52" height="3" rx="1.5" className="fill-slate-200" />
      <rect x="16" y="55" width="34" height="3" rx="1.5" className="fill-slate-200" />
      <rect x="16" y="62" width="44" height="3" rx="1.5" className="fill-slate-200" />
      <rect x="16" y="69" width="28" height="3" rx="1.5" className="fill-slate-200" />

      {/* Flow arrow. */}
      <path
        d="M92 48 h32"
        className="stroke-slate-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M119 43 l6 5 -6 5"
        className="stroke-slate-300"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Form fields, filled. Labels are the muted bars; the values are
          the darker fills, matching how the real form reads once
          extraction populates it. */}
      <g>
        <rect x="136" y="16" width="26" height="3" rx="1.5" className="fill-slate-300" />
        <rect x="136" y="23" width="96" height="14" rx="3" className="fill-white stroke-slate-300" strokeWidth="1" />
        <rect x="142" y="28" width="42" height="4" rx="2" className="fill-slate-400" />
      </g>
      <g>
        <rect x="136" y="45" width="20" height="3" rx="1.5" className="fill-slate-300" />
        <rect x="136" y="52" width="96" height="14" rx="3" className="fill-white stroke-slate-300" strokeWidth="1" />
        <rect x="142" y="57" width="56" height="4" rx="2" className="fill-slate-400" />
      </g>
      <g>
        <rect x="136" y="74" width="24" height="3" rx="1.5" className="fill-slate-300" />
        <rect x="136" y="81" width="96" height="11" rx="3" className="fill-white stroke-slate-300" strokeWidth="1" />
        <rect x="142" y="85" width="34" height="4" rx="2" className="fill-slate-400" />
      </g>
    </svg>
  )
}
