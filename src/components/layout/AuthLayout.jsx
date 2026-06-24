import ParticleBackground from '../ui/ParticleBackground'

/**
 * Shared layout wrapper for Login and Signup pages.
 * Renders the animated background + centered card.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <ParticleBackground />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md"
        style={{ zIndex: 1 }}
      >
        <div
          className="rounded-3xl px-8 py-10 sm:px-10"
          style={{
            background: 'rgba(253, 250, 245, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 48px rgba(176, 106, 85, 0.12), 0 2px 12px rgba(176, 106, 85, 0.08)',
            border: '1px solid rgba(236, 219, 176, 0.5)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
