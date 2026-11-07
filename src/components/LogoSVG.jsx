/**
 * LogoSVG — Betta fish logo matching the uploaded brand image.
 * Glowing purple-to-cyan Betta inside a circular arc with 3 bubbles.
 * Renders inline as an SVG so it inherits currentColor / size from parent.
 */
export default function LogoSVG({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VP Aquarium logo"
      role="img"
    >
      <defs>
        {/* Main purple-to-blue gradient for the fish body */}
        <linearGradient id="logoGradBody" x1="10" y1="30" x2="110" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9b4dff" />
          <stop offset="55%" stopColor="#6F3FF5" />
          <stop offset="100%" stopColor="#3a9bff" />
        </linearGradient>

        {/* Fin gradient — lighter, more cyan */}
        <linearGradient id="logoGradFin" x1="20" y1="60" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* Circle arc gradient */}
        <linearGradient id="logoGradArc" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9b4dff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Subtle inner glow for the fish */}
        <filter id="fishGlow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── Circular arc (open top-right, clockwise) ── */}
      <circle
        cx="58" cy="66"
        r="48"
        stroke="url(#logoGradArc)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="240 62"
        strokeDashoffset="0"
        fill="none"
        filter="url(#logoGlow)"
        transform="rotate(-40 58 66)"
      />

      {/* ── Tail / caudal fin (flowing wave behind body) ── */}
      <path
        d="M28 72 C18 55, 14 85, 26 92 C34 100, 24 110, 36 108 C46 106, 38 88, 44 80"
        fill="url(#logoGradFin)"
        filter="url(#fishGlow)"
        opacity="0.92"
      />

      {/* ── Ventral / lower flowing fin ── */}
      <path
        d="M50 82 C44 95, 36 105, 48 110 C56 113, 58 100, 60 90"
        fill="url(#logoGradFin)"
        opacity="0.80"
      />

      {/* ── Dorsal / top flowing fin ── */}
      <path
        d="M55 50 C50 36, 42 28, 52 24 C60 20, 64 36, 64 48"
        fill="url(#logoGradFin)"
        opacity="0.85"
      />

      {/* ── Main body (oval) ── */}
      <ellipse
        cx="62" cy="68"
        rx="22" ry="14"
        fill="url(#logoGradBody)"
        filter="url(#fishGlow)"
      />

      {/* ── Head bump ── */}
      <ellipse
        cx="80" cy="66"
        rx="10" ry="10"
        fill="url(#logoGradBody)"
      />

      {/* ── Eye ── */}
      <circle cx="84" cy="63" r="4.5" fill="#0d0d2b" />
      <circle cx="84" cy="63" r="2.5" fill="#1a1a4e" />
      <circle cx="85.5" cy="61.5" r="1.2" fill="white" opacity="0.9" />

      {/* ── Mouth ── */}
      <path
        d="M91 68 Q95 70 91 72"
        stroke="#c084fc"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Pectoral fin ── */}
      <path
        d="M72 72 C76 80, 68 88, 64 82"
        fill="url(#logoGradFin)"
        opacity="0.75"
      />

      {/* ── Bubbles (top-right of circle) ── */}
      {/* Large bubble */}
      <circle cx="98" cy="22" r="6.5" fill="none" stroke="url(#logoGradArc)" strokeWidth="2" opacity="0.90" filter="url(#logoGlow)" />
      <circle cx="96" cy="20" r="2" fill="white" opacity="0.4" />

      {/* Medium bubble */}
      <circle cx="108" cy="36" r="4.5" fill="none" stroke="url(#logoGradArc)" strokeWidth="1.8" opacity="0.80" filter="url(#logoGlow)" />
      <circle cx="107" cy="34.5" r="1.4" fill="white" opacity="0.4" />

      {/* Small bubble */}
      <circle cx="103" cy="50" r="3" fill="none" stroke="url(#logoGradArc)" strokeWidth="1.5" opacity="0.70" filter="url(#logoGlow)" />
      <circle cx="102.5" cy="49" r="1" fill="white" opacity="0.35" />
    </svg>
  )
}
