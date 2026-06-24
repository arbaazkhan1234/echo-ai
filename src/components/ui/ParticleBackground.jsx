/**
 * Animated warm particle background with floating orbs and soft gradient shift.
 * Purely decorative — no interaction, no performance-heavy canvas.
 */

const particles = [
  // [size, top%, left%, animClass, delay, opacity]
  [120, 8,  12, 'animate-float-slow',   '0s',    0.12],
  [80,  15, 75, 'animate-float-medium', '1.5s',  0.10],
  [160, 55, 85, 'animate-float-slow',   '3s',    0.08],
  [60,  70, 20, 'animate-float-fast',   '0.8s',  0.14],
  [200, 80, 60, 'animate-float-slow',   '2.2s',  0.07],
  [90,  30, 45, 'animate-float-medium', '4s',    0.11],
  [50,  45, 5,  'animate-float-fast',   '1s',    0.13],
  [140, 20, 90, 'animate-float-medium', '2.8s',  0.09],
  [70,  90, 40, 'animate-float-slow',   '0.5s',  0.12],
  [110, 60, 3,  'animate-float-medium', '3.5s',  0.08],
  [45,  5,  55, 'animate-float-fast',   '1.8s',  0.15],
  [95,  40, 70, 'animate-float-slow',   '4.5s',  0.10],
]

const colors = [
  'radial-gradient(circle, #d4956a, transparent)',
  'radial-gradient(circle, #c9856e, transparent)',
  'radial-gradient(circle, #d4a5a0, transparent)',
  'radial-gradient(circle, #e8b48a, transparent)',
  'radial-gradient(circle, #ecdbb0, transparent)',
]

export default function ParticleBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Animated gradient base */}
      <div
        className="absolute inset-0 animate-bg-shift"
        style={{
          background: 'linear-gradient(135deg, #fdfaf5, #faf4e8, #f5e9d0, #faf4e8, #fdfaf5)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* Warm vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(176, 106, 85, 0.08) 100%)',
        }}
      />

      {/* Floating orbs */}
      {particles.map(([size, top, left, animClass, delay, opacity], i) => (
        <div
          key={i}
          className={`absolute rounded-full ${animClass}`}
          style={{
            width:      size,
            height:     size,
            top:        `${top}%`,
            left:       `${left}%`,
            background: colors[i % colors.length],
            opacity,
            animationDelay: delay,
            filter:     'blur(2px)',
          }}
        />
      ))}
    </div>
  )
}
