/**
 * PhilosophySection
 *
 * The bridge section between HeroSection and AboutExperienceSection. Renders two sequential
 * scroll-driven effects inside a single bg-black block: (1) a 200vh sticky panel where three
 * rotating headline phrases flip in one by one via 3D rotateX transforms, driven by raw scroll
 * progress calculated via getBoundingClientRect(); and (2) a word-by-word blur-reveal paragraph
 * that animates as the description scrolls into view. Both effects use a manual RAF-gated scroll
 * listener rather than Framer Motion MotionValues, which avoids re-render cost — opacity and
 * transform are applied inline from setState only on visible animation frames. Font sizes are
 * all viewport-relative (vw units with responsive breakpoints), so the layout scales cleanly
 * across resolutions. PHILOSOPHY_DESCRIPTION is exported so other components (e.g., meta tags
 * or an About modal) can reference the canonical text without duplication.
 */
"use client"

import { useRef, useCallback, useEffect, useState } from "react"

const titles = [
  "People-First Development.",
  "Impact-Oriented Innovation.",
  "Building Towards a Better Tomorrow.",
]

export const PHILOSOPHY_DESCRIPTION = "Transforming complex technical abstractions into seamless, people-first solutions. I leverage modern machine learning and robust full-stack architectures to engineer intuitive experiences, ensuring that every intelligent system I build is defined by how well it serves the user."

export function PhilosophySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const [titleOpacity, setTitleOpacity] = useState(0)
  const [descriptionProgress, setDescriptionProgress] = useState(0)
  const rafRef = useRef<number | null>(null)

  const updateTransforms = useCallback(() => {
    if (!sectionRef.current) return

    const rect = sectionRef.current.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const sectionHeight = sectionRef.current.offsetHeight

    const scrollableRange = sectionHeight - windowHeight
    const scrolled = -rect.top
    const progress = Math.max(0, Math.min(1, scrolled / scrollableRange))

    setTitleOpacity(progress)

    // Description word animation
    if (descriptionRef.current) {
      const descRect = descriptionRef.current.getBoundingClientRect()
      const descTop = descRect.top
      const startTrigger = windowHeight * 0.8
      const endTrigger = windowHeight * 0.2

      if (descTop < startTrigger && descTop > endTrigger - descRect.height) {
        const descProgress = Math.max(0, Math.min(1, (startTrigger - descTop) / (startTrigger - endTrigger)))
        setDescriptionProgress(descProgress)
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateTransforms)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    updateTransforms()

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [updateTransforms])

  const words = PHILOSOPHY_DESCRIPTION.split(" ")

  return (
    <section className="relative z-10 bg-black">
      {/* Rotating phrases */}
      <div ref={sectionRef} className="relative" style={{ height: "200vh" }}>
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          <div className="relative z-10 w-full max-w-7xl px-4">
            <div
              className="flex items-center justify-center pointer-events-none"
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative w-full"
                style={{ transformStyle: "preserve-3d", minHeight: "150px" }}
              >
                {titles.map((title, index) => {
                  const isLastText = index === titles.length - 1
                  const segmentSize = 1 / titles.length
                  const startProgress = index * segmentSize
                  const endProgress = (index + 1) * segmentSize

                  let rotateX = 0
                  let opacity = 0

                  if (titleOpacity >= startProgress && titleOpacity < endProgress) {
                    const localProgress = (titleOpacity - startProgress) / segmentSize
                    rotateX = (1 - localProgress) * 90
                    opacity = localProgress
                  } else if (titleOpacity >= endProgress) {
                    if (isLastText) {
                      rotateX = 0
                      opacity = 1
                    } else {
                      rotateX = -90
                      opacity = 0
                    }
                  } else {
                    rotateX = 90
                    opacity = 0
                  }

                  return (
                    <h2
                      key={index}
                      className="absolute inset-0 flex items-center justify-center text-[8vw] sm:text-[7vw] font-medium leading-tight tracking-tighter text-white md:text-[6vw] lg:text-[5vw] text-center px-4"
                      style={{
                        fontFamily: "var(--font-name)",
                        transform: `rotateX(${rotateX}deg) translateZ(0)`,
                        opacity,
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        willChange: "transform, opacity",
                        WebkitFontSmoothing: "antialiased",
                      }}
                    >
                      {title}
                    </h2>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Word-by-word blur-reveal description */}
      {/* Trim trailing padding so the user is immediately handed off into AboutExperienceSection's arrival phase. */}
      <div ref={descriptionRef} className="px-6 pt-8 pb-8 md:px-12 md:pt-12 md:pb-12 lg:px-20 lg:pt-16 lg:pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <p className="leading-relaxed text-white/60 text-2xl md:text-3xl text-center" style={{ fontFamily: "var(--font-name)", textAlign: "center" }}>
            {words.map((word, index) => {
              const wordProgress = Math.max(0, Math.min(1, (descriptionProgress * words.length) - index))
              const opacity = wordProgress
              const blur = (1 - wordProgress) * 40

              return (
                <span
                  key={index}
                  style={{
                    display: "inline",
                    opacity,
                    filter: `blur(${blur}px)`,
                    transition: "opacity 0.3s ease, filter 0.3s ease",
                  }}
                >
                  {word}{index < words.length - 1 ? " " : ""}
                </span>
              )
            })}
          </p>
        </div>
      </div>
    </section>
  )
}
