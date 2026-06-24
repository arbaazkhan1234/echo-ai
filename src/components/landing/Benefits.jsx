import AnimatedSection from '../ui/AnimatedSection'

const mkIcon = (d, viewBox = '0 0 24 24') => (
  <svg width="22" height="22" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
)

const BENEFITS = [
  {
    icon:        mkIcon('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'),
    title:       'Never lose a memory',
    description: 'Your stories, wisdom and experiences are preserved forever. No matter what happens, they will always be there.',
  },
  {
    icon:        mkIcon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
    title:       'Speak naturally',
    description: 'No complicated forms. Just honest conversations, one meaningful question at a time, in your own words.',
  },
  {
    icon:        mkIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
    title:       'Private and secure',
    description: 'Bank-level encryption. Your memories belong only to you. You choose exactly who sees what and when.',
  },
  {
    icon:        (
      // Voice / microphone icon — the voice benefit
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
      </svg>
    ),
    title:       'Hear their actual voice',
    description: 'Echo responds using voice cloning so it truly sounds like them. Warm, familiar, and unmistakably theirs.',
    isVoice:     true,
  },
  {
    icon:        mkIcon(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
    title:       'Grows deeper over time',
    description: 'Questions evolve as your archive grows. The longer you use Echo, the richer and more meaningful it becomes.',
  },
  {
    icon:        mkIcon(<><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>),
    title:       'A gift that lasts generations',
    description: 'Your grandchildren will know who you were, in your words. A gift no heirloom can match.',
  },
]

export default function Benefits() {
  return (
    <section
      id="benefits"
      className="py-28 md:py-36 relative overflow-hidden"
      style={{ background: '#EDE8DF' }}
    >
      {/* Ambient blobs */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full animate-float-slow"
          style={{ width:500, height:500, top:'-20%', right:'-12%', background:'radial-gradient(circle, rgba(201,169,110,0.05), transparent)', filter:'blur(2px)' }} />
        <div className="absolute rounded-full animate-float-medium"
          style={{ width:400, height:400, bottom:'-15%', left:'-10%', background:'radial-gradient(circle, rgba(201,169,110,0.04), transparent)', animationDelay:'3s' }} />
      </div>

      <div className="section-container relative z-10">

        <AnimatedSection className="text-center mb-16">
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#C9A96E' }}>
            Why Echo AI
          </p>
          <h2 className="font-serif font-light leading-tight mb-5" style={{ fontSize:'clamp(2rem,4vw,3rem)', color:'#1A1928' }}>
            Why families choose <span className="italic" style={{ color: '#C9A96E' }}>Echo AI</span>
          </h2>
          <p className="font-sans text-base leading-relaxed max-w-lg mx-auto" style={{ color: '#665E56' }}>
            Built around one belief: every person&apos;s life story deserves to be told, heard and remembered.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(({ icon, title, description, isVoice }, i) => (
            <AnimatedSection key={i} delay={i * 80} from="bottom">
              <div
                className="card-lift group h-full p-6 rounded-2xl"
              style={isVoice ? {
                  background:  'rgba(201,169,110,0.10)',
                  border:      '1px solid rgba(201,169,110,0.35)',
                  boxShadow:   '0 4px 20px rgba(201,169,110,0.08)',
                } : {
                  background:  'white',
                  border:      '1px solid rgba(0,0,0,0.06)',
                  boxShadow:   '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: isVoice ? 'rgba(201,169,110,0.15)' : 'rgba(201,169,110,0.08)',
                    color:      '#C9A96E',
                  }}
                >
                  {icon}
                </div>
                <h3 className="font-serif text-lg font-normal mb-2 leading-snug" style={{ color: '#1A1928' }}>
                  {title}
                  {isVoice && (
                    <span
                      className="inline-block ml-2 text-xs font-sans font-medium px-2 py-0.5 rounded-full align-middle"
                      style={{ background:'rgba(201,169,110,0.15)', color:'#C9A96E', verticalAlign:'middle' }}
                    >
                      NEW
                    </span>
                  )}
                </h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#665E56' }}>
                  {description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
