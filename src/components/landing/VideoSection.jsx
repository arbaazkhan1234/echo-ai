import AnimatedSection from '../ui/AnimatedSection'

const VIDEOS = [
  {
    gradient: 'linear-gradient(135deg, #d4956a 0%, #b06a55 50%, #8f5040 100%)',
    caption:  '"Sarah asks her late father for advice on her wedding day"',
    label:    'A daughter finds comfort',
    duration: '3:24',
  },
  {
    gradient: 'linear-gradient(135deg, #c9856e 0%, #d4a5a0 50%, #e8c4c0 100%)',
    caption:  '"A grandmother shares recipes she never wrote down"',
    label:    'Food, memory, and love',
    duration: '5:11',
  },
  {
    gradient: 'linear-gradient(135deg, #ecdbb0 0%, #d4956a 50%, #b06a55 100%)',
    caption:  '"A son hears his father\'s voice answer questions he never got to ask"',
    label:    'The words left unspoken',
    duration: '4:47',
  },
]

/** Play button SVG icon */
function PlayIcon() {
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
      style={{
        background:   'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)',
        border:       '2px solid rgba(255,255,255,0.35)',
        boxShadow:    '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <svg
        width="20" height="20" viewBox="0 0 24 24"
        fill="white"
        style={{ marginLeft: 3 }}
      >
        <path d="M5 3l14 9-14 9V3z"/>
      </svg>
    </div>
  )
}

/**
 * Section 3 — Emotional Video Section
 */
export default function VideoSection() {
  return (
    <section
      id="stories"
      className="py-20 md:py-28"
      style={{ background: 'linear-gradient(180deg, #faf4e8 0%, #f5e9d0 100%)' }}
    >
      <div className="section-container">

        {/* Heading */}
        <AnimatedSection className="text-center mb-14">
          <p className="font-sans text-xs font-medium text-terra tracking-widest uppercase mb-3">
            Real Stories
          </p>
          <h2 className="section-heading mb-4">
            Real conversations. Real memories.{' '}
            <span className="italic text-terra">Real comfort.</span>
          </h2>
          <p className="font-sans text-warmgray-600 max-w-xl mx-auto leading-relaxed">
            These are the conversations families wish they had while they still could,
            and the ones they now treasure because they did.
          </p>
        </AnimatedSection>

        {/* Video cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VIDEOS.map(({ gradient, caption, label, duration }, i) => (
            <AnimatedSection key={i} delay={i * 120} from="bottom">
              <div
                className="group rounded-2xl overflow-hidden card-lift cursor-pointer"
                style={{
                  boxShadow: '0 4px 24px rgba(176,106,85,0.10)',
                  border:    '1px solid rgba(236,219,176,0.6)',
                }}
              >
                {/* Thumbnail */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    background: gradient,
                    height:     200,
                  }}
                >
                  {/* Subtle grain overlay */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                    }}
                  />
                  {/* Duration badge */}
                  <span
                    className="absolute top-3 right-3 font-sans text-xs text-white px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
                  >
                    {duration}
                  </span>
                  <PlayIcon />
                </div>

                {/* Card body */}
                <div
                  className="px-5 py-4"
                  style={{ background: 'rgba(253,250,245,0.95)' }}
                >
                  <p className="font-sans text-xs font-medium text-terra tracking-wider uppercase mb-1.5">
                    {label}
                  </p>
                  <p className="font-serif text-warmgray-800 text-base leading-snug italic">
                    {caption}
                  </p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
