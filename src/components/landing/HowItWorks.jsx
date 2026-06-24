const PHOTO = '/girl.png'

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        background: '#ffffff',
        padding:    'clamp(12px, 2vw, 32px)',
      }}
    >
      {/* Large rounded card */}
      <div className="hiw-card" style={{
        position:     'relative',
        borderRadius: '24px 24px 0 24px',
        overflow:     'hidden',
        height:       'clamp(480px, 88vh, 860px)',
        maxWidth:     '1280px',
        margin:       '0 auto',
      }}>

        {/* Background photo */}
        <img
          src={PHOTO}
          alt="Girl holding phone"
          className="hiw-img"
          style={{
            position:        'absolute',
            inset:           0,
            width:           '100%',
            height:          '100%',
            objectFit:       'cover',
            objectPosition:  'center center',
          }}
        />

        {/* Top gradient — for mobile text legibility */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(to bottom, rgba(8,6,4,0.62) 0%, rgba(8,6,4,0.18) 45%, transparent 70%)',
        }} />

        {/* Left gradient — desktop text legibility */}
        <div className="hiw-left-grad" style={{
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(to right, rgba(8,6,4,0.52) 0%, rgba(8,6,4,0.2) 38%, transparent 65%)',
        }} />

        {/* Bottom gradient */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: 'linear-gradient(to top, rgba(8,6,4,0.28) 0%, transparent 38%)',
        }} />

        {/* Text — top-left on mobile, bottom-left on desktop */}
        <div className="hiw-text">

          {/* Label */}
          <p className="hiw-label">
            ▪ INTRODUCING ECHO
          </p>

          {/* Headline */}
          <h2 className="hiw-headline">
            Your family can<br />talk to your Echo.
          </h2>

          {/* Body */}
          <p className="hiw-body">
            Trained on your real memories and voice.
          </p>

        </div>

      </div>

      <style>{`
        /* ── Desktop ── */
        .hiw-text {
          position:   absolute;
          bottom:     clamp(40px, 7vh, 80px);
          left:       clamp(32px, 5vw, 72px);
          max-width:  clamp(280px, 44%, 520px);
          z-index:    2;
        }
        .hiw-label {
          font-family:    "DM Sans", Arial, sans-serif;
          font-size:      11px;
          font-weight:    600;
          letter-spacing: 0.14em;
          color:          rgba(240,237,230,0.6);
          margin:         0 0 14px;
          text-transform: uppercase;
        }
        .hiw-headline {
          font-family:    "DM Sans", Arial, sans-serif;
          font-size:      clamp(32px, 4.5vw, 64px);
          font-weight:    300;
          line-height:    1.1;
          color:          #F0EDE6;
          margin:         0 0 18px;
          letter-spacing: -0.02em;
        }
        .hiw-body {
          font-family: "DM Sans", Arial, sans-serif;
          font-size:   clamp(14px, 1.3vw, 17px);
          font-weight: 300;
          line-height: 1.6;
          color:       rgba(240,237,230,0.68);
          margin:      0;
        }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .hiw-card {
            border-radius: 20px !important;
            height: 62vw !important;
            min-height: 260px !important;
            max-height: 400px !important;
          }
          .hiw-left-grad {
            display: none;
          }
          .hiw-text {
            top:        auto;
            bottom:     clamp(28px, 6vw, 48px);
            left:       clamp(20px, 5vw, 32px);
            right:      clamp(20px, 5vw, 32px);
            max-width:  100%;
          }
          .hiw-headline {
            font-size: clamp(26px, 7vw, 38px) !important;
          }
          .hiw-body {
            font-size: 14px !important;
          }
          .hiw-img {
            object-position: center 25% !important;
          }
        }
      `}</style>
    </section>
  )
}
