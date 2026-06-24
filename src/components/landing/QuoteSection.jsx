export default function QuoteSection() {
  return (
    <section
      style={{
        position:       'relative',
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        overflow:       'hidden',
        background:     '#ffffff',
      }}
    >
      {/* Quote */}
      <div
        className="echo-container"
        style={{
          position:  'relative',
          zIndex:    2,
          textAlign: 'center',
          maxWidth:  '860px',
          margin:    '0 auto',
          padding:   'clamp(80px, 12vh, 160px) clamp(24px, 8vw, 120px)',
        }}
      >
        <blockquote style={{
          fontFamily:    '"DM Sans", Arial, sans-serif',
          fontStyle:     'normal',
          fontWeight:    200,
          fontSize:      'clamp(26px, 4vw, 56px)',
          lineHeight:    1.35,
          color:         '#1C1A17',
          letterSpacing: '0em',
          margin:        0,
        }}>
          What if the people you loved<br />
          never truly disappeared?
        </blockquote>

        <p style={{
          fontFamily:    '"DM Sans", sans-serif',
          fontWeight:    400,
          fontSize:      '14px',
          color:         'rgba(28,26,23,0.55)',
          letterSpacing: '0.04em',
          margin:        '40px 0 0',
        }}>
          The idea behind Echo
        </p>
      </div>
    </section>
  )
}
