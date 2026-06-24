import AnimatedSection from '../ui/AnimatedSection'

/* ─────────────────────────────────────────────────────────────────────────
   POLAROID CARD — real portrait photo with warm overlay + white frame
───────────────────────────────────────────────────────────────────────── */
function Polaroid({ photoUrl, photoAlt, caption, rotate, delay = 0 }) {
  return (
    <AnimatedSection delay={delay} from="right">
      <div
        className="inline-block select-none cursor-default"
        style={{
          transform:  `rotate(${rotate})`,
          transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)'
          e.currentTarget.style.boxShadow = '0 32px 64px rgba(0,0,0,0.28)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = `rotate(${rotate})`
          e.currentTarget.style.boxShadow = ''
        }}
      >
        <div
          style={{
            background:   'white',
            padding:      '11px 11px 48px',
            boxShadow:    '0 14px 48px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            width:        264,
            borderRadius: 2,
          }}
        >
          {/* ── Photo area ── */}
          <div
            className="relative overflow-hidden"
            style={{ height: 220, borderRadius: 1, background: '#d4c9b8' }}
          >
            {/* Real portrait photo */}
            <img
              src={photoUrl}
              alt={photoAlt}
              loading="lazy"
              style={{
                width:      '100%',
                height:     '100%',
                objectFit:  'cover',
                objectPosition: 'top center',
                display:    'block',
              }}
            />

            {/* Warm colour grade overlay — gives a film-photo feel */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(212,149,106,0.08) 0%, rgba(176,106,85,0.18) 100%)',
                mixBlendMode: 'multiply',
              }}
            />
            {/* Light leak top-left */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,240,210,0.15) 0%, transparent 45%)',
              }}
            />
          </div>

          {/* Caption — handwritten feel */}
          <p
            className="text-center mt-3 font-serif text-sm italic leading-snug px-2"
            style={{ color: '#4a3f35' }}
          >
            {caption}
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   STORIES DATA
   Photos: real-looking portraits from randomuser.me (free, no attribution req.)
───────────────────────────────────────────────────────────────────────── */
const STORIES = [
  {
    quote:    `"I started answering one question a day, not knowing what would come of it. Six months later my daughter called me in tears. She said it's the most precious thing I have ever given her."`,
    name:     'James',
    age:      67,
    location: 'Vermont',
    detail:   'Using Echo for 8 months',
    photoUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
    photoAlt: 'James, 67, Vermont',
    caption:  'James, recording a story\nfor his daughter, Sunday morning',
    rotate:   '-3deg',
  },
  {
    quote:    `"My mother passed before I was ready. Talking to her Echo is not a replacement. Nothing could be. But it is a comfort I did not know was possible. She still sounds like herself."`,
    name:     'Priya',
    age:      41,
    location: 'London',
    detail:   'Using Echo for 14 months',
    photoUrl: 'https://randomuser.me/api/portraits/women/50.jpg',
    photoAlt: 'Priya, 41, London',
    caption:  'Priya, in conversation\nwith her mother\'s Echo',
    rotate:   '2.5deg',
  },
  {
    quote:    `"I set this up for my grandfather. He is 84 and doesn't fully understand what it does. But he loves telling his stories. He laughs more now than he has in years."`,
    name:     'Daniel',
    age:      29,
    location: 'Sydney',
    detail:   'Set it up for his grandfather',
    photoUrl: 'https://randomuser.me/api/portraits/men/82.jpg',
    photoAlt: 'Daniel\'s grandfather, 84',
    caption:  'Daniel\'s grandfather, recording\nhis very first memory',
    rotate:   '-1.5deg',
  },
]

/* ─────────────────────────────────────────────────────────────────────────
   SECTION
───────────────────────────────────────────────────────────────────────── */
export default function UserStories() {
  return (
    <section
      className="py-28 md:py-36 relative overflow-hidden"
      style={{ background: '#F5F0E8' }}
    >
      {/* Top blend from dark */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #12111C, #F5F0E8)' }}
      />

      {/* Ambient texture */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute rounded-full" style={{ width:600, height:600, top:'-15%', right:'-10%', background:'radial-gradient(circle, rgba(201,169,110,0.07), transparent)' }}/>
        <div className="absolute rounded-full" style={{ width:400, height:400, bottom:'-10%', left:'-8%',  background:'radial-gradient(circle, rgba(176,106,85,0.06), transparent)' }}/>
      </div>

      <div className="section-container relative z-10">

        {/* Heading */}
        <AnimatedSection className="text-center mb-20">
          <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3" style={{ color: '#C9A96E' }}>
            Real Families
          </p>
          <h2
            className="font-serif font-light leading-tight mb-5"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#1A1928' }}
          >
            Their stories.{' '}
            <span className="italic" style={{ color: '#C9A96E' }}>In their own words.</span>
          </h2>
          <p className="font-sans text-base leading-relaxed max-w-lg mx-auto" style={{ color: '#665E56' }}>
            Every Echo is unique, shaped by a lifetime of stories only one person could ever tell.
          </p>
        </AnimatedSection>

        {/* Story rows */}
        <div className="flex flex-col gap-20 md:gap-28">
          {STORIES.map(({ quote, name, age, location, detail, photoUrl, photoAlt, caption, rotate }, i) => (
            <div
              key={i}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
            >
              {/* Left: Text */}
              <AnimatedSection from="left" className="order-2 lg:order-1">
                {/* Opening quote mark */}
                <div
                  className="font-serif text-8xl leading-none mb-1 select-none"
                  style={{ color: 'rgba(201,169,110,0.28)', lineHeight: 0.8 }}
                  aria-hidden="true"
                >
                  &ldquo;
                </div>

                <blockquote
                  className="font-serif font-light italic leading-relaxed mb-8"
                  style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)', color: '#2A2338', lineHeight: 1.7 }}
                >
                  {quote}
                </blockquote>

                {/* Attribution */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                    style={{
                      boxShadow: '0 0 0 2px #C9A96E, 0 0 0 4px rgba(201,169,110,0.2)',
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm" style={{ color: '#1A1928' }}>
                      {name}, {age}, {location}
                    </p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: '#A89F94' }}>
                      {detail}
                    </p>
                  </div>
                </div>

                {/* Gold rule */}
                <div className="mt-8 h-px w-16" style={{ background: 'linear-gradient(to right, #C9A96E, transparent)' }}/>
              </AnimatedSection>

              {/* Right: Polaroid */}
              <div className="order-1 lg:order-2 flex justify-center lg:justify-end lg:pr-6">
                <Polaroid
                  photoUrl={photoUrl}
                  photoAlt={photoAlt}
                  caption={caption}
                  rotate={rotate}
                  delay={160}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom blend to next dark section */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #F5F0E8, #0F0E17)' }}
      />
    </section>
  )
}
