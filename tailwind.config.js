/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Deep midnight dark base ──────────────────────────
        midnight: {
          DEFAULT: '#0F0E17',
          light:   '#1A1928',
          lighter: '#242338',
          dark:    '#080710',
        },
        // ── Warm gold accent — the ONE accent colour ─────────
        gold: {
          light:   '#DFC090',
          DEFAULT: '#C9A96E',
          dark:    '#A8854E',
        },
        // ── Fog / neutral text tones ─────────────────────────
        fog: {
          100: '#F5F0E8',
          200: '#D4CFC6',
          400: '#A89F94',
          600: '#665E56',
          800: '#3A3530',
        },
        // ── Keep warm tones for auth pages ───────────────────
        cream:    { 50:'#fdfaf5', 100:'#faf4e8', 200:'#f5e9d0', 300:'#ecdbb0' },
        terra:    { light:'#c9856e', DEFAULT:'#b06a55', deep:'#8f5040' },
        rose:     { dust:'#d4a5a0', soft:'#e8c4c0', pale:'#f2dedd' },
        warmgray: { 50:'#faf8f5', 100:'#f0ede8', 200:'#e0dbd4', 400:'#b8b0a8', 600:'#8a8278', 800:'#4a453f', 900:'#2e2a25' },
        amber:    { warm:'#d4956a', light:'#e8b48a', deep:'#b8724a' },
      },

      fontFamily: {
        // Display / headings — Bodoni Moda (design system recommendation: luxury, sophisticated)
        serif:    ['"Bodoni Moda"', '"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        // Body — Jost (design system recommendation: clean, modern, readable)
        sans:     ['Jost', 'Inter', 'system-ui', 'sans-serif'],
      },

      animation: {
        // ── Existing ──────────────────────────
        'float-slow':   'floatSlow 9s ease-in-out infinite',
        'float-medium': 'floatMedium 7s ease-in-out infinite',
        'float-fast':   'floatFast 5s ease-in-out infinite',
        'fade-in-up':   'fadeInUp 0.9s ease-out forwards',
        'fade-in':      'fadeIn 1.2s ease-out forwards',
        'pulse-soft':   'pulseSoft 5s ease-in-out infinite',
        'bg-shift':     'bgShift 14s ease-in-out infinite',
        'bob':          'bob 5s ease-in-out infinite',
        'typing-dot':   'typingDot 1.4s ease-in-out infinite',
        'scroll-hint':  'scrollHint 2.5s ease-in-out infinite',

        // ── New ───────────────────────────────
        'word-reveal':  'wordReveal 0.7s ease-out forwards',
        'glow-pulse':   'glowPulse 2.5s ease-in-out infinite',
        'wave-bar':     'waveBar 0.8s ease-in-out infinite alternate',
        'record-ring':  'recordRing 1.8s ease-out infinite',
        'thinking-dot': 'thinkingDot 1.2s ease-in-out infinite',
        'shimmer-gold': 'shimmerGold 3s ease-in-out infinite',
      },

      keyframes: {
        floatSlow:    { '0%,100%':{ transform:'translateY(0) translateX(0)' }, '33%':{ transform:'translateY(-22px) translateX(12px)' }, '66%':{ transform:'translateY(-10px) translateX(-9px)' } },
        floatMedium:  { '0%,100%':{ transform:'translateY(0) translateX(0)' }, '50%': { transform:'translateY(-18px) translateX(6px)' } },
        floatFast:    { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-12px)' } },
        fadeInUp:     { '0%':{ opacity:'0', transform:'translateY(28px)' }, '100%':{ opacity:'1', transform:'translateY(0)' } },
        fadeIn:       { '0%':{ opacity:'0' }, '100%':{ opacity:'1' } },
        pulseSoft:    { '0%,100%':{ opacity:'0.35', transform:'scale(1)' }, '50%':{ opacity:'0.65', transform:'scale(1.06)' } },
        bgShift:      { '0%,100%':{ backgroundPosition:'0% 50%' }, '50%':{ backgroundPosition:'100% 50%' } },
        bob:          { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-14px)' } },
        typingDot:    { '0%,60%,100%':{ transform:'translateY(0)', opacity:'0.4' }, '30%':{ transform:'translateY(-4px)', opacity:'1' } },
        scrollHint:   { '0%,100%':{ transform:'translateY(0)', opacity:'0.5' }, '50%':{ transform:'translateY(8px)', opacity:'1' } },

        wordReveal: {
          '0%':   { opacity:'0', transform:'translateY(20px)', filter:'blur(6px)' },
          '100%': { opacity:'1', transform:'translateY(0)',    filter:'blur(0)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow:'0 0 12px rgba(201,169,110,0.35), 0 0 24px rgba(201,169,110,0.15)' },
          '50%':     { boxShadow:'0 0 24px rgba(201,169,110,0.65), 0 0 48px rgba(201,169,110,0.30)' },
        },
        waveBar: {
          '0%':   { transform:'scaleY(0.25)' },
          '100%': { transform:'scaleY(1)' },
        },
        recordRing: {
          '0%':   { transform:'scale(1)',   opacity:'0.7' },
          '100%': { transform:'scale(1.65)', opacity:'0' },
        },
        thinkingDot: {
          '0%,60%,100%': { transform:'translateY(0)',   opacity:'0.35' },
          '30%':         { transform:'translateY(-5px)', opacity:'1'   },
        },
        shimmerGold: {
          '0%,100%': { opacity:'0.6' },
          '50%':     { opacity:'1'   },
        },
      },
    },
  },
  plugins: [],
}
