"use client"

import { ReactLenis, useLenis } from "lenis/react"
import type { ReactNode } from "react"
import { useEffect } from "react"

// Hero is h-[300vh]; only apply smooth lerp after the hero scroll finishes
const HERO_HEIGHT_VH = 300

function LenisController() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    const heroHeightPx = (HERO_HEIGHT_VH / 100) * window.innerHeight

    const onScroll = () => {
      if (window.scrollY < heroHeightPx * 0.95) {
        // During hero: pass-through (no smoothing lag)
        lenis.options.lerp = 0.99
      } else {
        // After hero: smooth scroll
        lenis.options.lerp = 0.1
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [lenis])

  return null
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.99, duration: 1.2, smoothWheel: true }}>
      <LenisController />
      {children}
    </ReactLenis>
  )
}
