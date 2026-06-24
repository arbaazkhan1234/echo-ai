import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'echo_pwa_dismissed'

export function usePWAInstall() {
  const [promptEvt,  setPromptEvt]  = useState(null)
  const [isIOS,      setIsIOS]      = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed,  setDismissed]  = useState(
    () => !!localStorage.getItem(DISMISSED_KEY)
  )

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsStandalone(standalone)
    if (standalone) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    const handler = (e) => { e.preventDefault(); setPromptEvt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsStandalone(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!promptEvt) return false
    promptEvt.prompt()
    const { outcome } = await promptEvt.userChoice
    if (outcome === 'accepted') setIsStandalone(true)
    return outcome === 'accepted'
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  const canInstall = !isStandalone && !dismissed && (!!promptEvt || isIOS)

  return { canInstall, isIOS, isStandalone, install, dismiss, promptEvt }
}
