/* ── Film grain overlay — fixed, full screen, SVG noise at 4% opacity ── */
export default function FilmGrain() {
  return (
    <div
      aria-hidden="true"
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        9000,
        pointerEvents: 'none',
        opacity:       0.04,
        animation:     'grainMove 0.5s steps(1) infinite',
        willChange:    'transform',
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  )
}
