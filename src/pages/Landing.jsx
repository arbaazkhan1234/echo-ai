import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* ── New design system components ── */
import Navbar        from '../components/landing/Navbar'
import HeroSection   from '../components/landing/HeroSection'

import IdeaSection   from '../components/landing/IdeaSection'
import QuoteSection  from '../components/landing/QuoteSection'
import HowItWorks    from '../components/landing/HowItWorks'
import BentoGrid     from '../components/landing/BentoGrid'
import Testimonials  from '../components/landing/Testimonials'
import Pricing       from '../components/landing/Pricing'
import FinalCTA      from '../components/landing/FinalCTA'
import Footer        from '../components/landing/Footer'

gsap.registerPlugin(ScrollTrigger)

export default function Landing() {
  useEffect(() => {
    /* ── Lenis smooth scroll ── */
    let lenis = null

    // Store raf fn reference so we can properly remove it later
    let rafFn = null

    const initLenis = async () => {
      // Skip Lenis on mobile for better native scroll performance
      if (window.innerWidth < 768) return

      try {
        const { default: Lenis } = await import('@studio-freight/lenis')
        lenis = new Lenis({
          duration:  0.7,
          easing:    (t) => 1 - Math.pow(1 - t, 3),
          direction: 'vertical',
          smooth:    true,
        })

        // Connect Lenis to GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update)

        rafFn = (time) => lenis.raf(time * 1000)
        gsap.ticker.add(rafFn)
        gsap.ticker.lagSmoothing(0)
      } catch (err) {
        console.warn('Lenis not loaded, using native scroll:', err)
      }
    }

    initLenis()

    /* ── Refresh ScrollTrigger after mount ── */
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 300)

    return () => {
      clearTimeout(refreshTimer)
      if (lenis) {
        lenis.destroy()
        // Remove the exact same fn reference we added
        if (rafFn) gsap.ticker.remove(rafFn)
      }
      // Restore scroll in case Lenis left overflow:hidden on <html>
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  return (
    <>
      {/* Navigation */}
      <Navbar />

      {/* Page sections */}
      <main>
        <HeroSection />
        <IdeaSection />
        <QuoteSection />
        <HowItWorks />
        <BentoGrid />
        <Testimonials />
        <Pricing />
        <FinalCTA />
      </main>

      <Footer />
    </>
  )
}
