'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

const sideImages = [
  { src: '/images/ayaan/hero-left-inner.jpg',  alt: 'Hero Left',        position: 'left'  as const },
  { src: '/images/ayaan/hero-left-most.jpeg',  alt: 'Hero Left Outer',  position: 'left'  as const },
  { src: '/images/ayaan/hero-right-most.jpeg', alt: 'Hero Right Outer', position: 'right' as const },
  { src: '/images/ayaan/hero-right-heic.jpg',  alt: 'Hero Right',       position: 'right' as const },
]

const heroImageSrc = '/images/ayaan/mainBackground.jpg'

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 })

  // Phase A (0 → 0.2): overlay text fades out
  const textOpacity = useTransform(smooth, [0, 0.2], [1, 0])

  // Phase C (0.2 → 0.9): images expand
  const imageProgress = useTransform(smooth, [0.2, 0.9], [0, 1])

  const centerWidth    = useTransform(imageProgress, v => `${100 - v * 80}%`)
  const sideWidth      = useTransform(imageProgress, v => `${v * 40}%`)
  const sideOpacity    = imageProgress
  const gridGap        = useTransform(imageProgress, v => `${v * 8}px`)
  const sideSlideLeft  = useTransform(imageProgress, v => `${-100 + v * 100}%`)
  const sideSlideRight = useTransform(imageProgress, v => `${100 - v * 100}%`)

  // Vertical stagger for side panels (outer panels shift up more)
  const outerStaggerY  = useTransform(imageProgress, [0, 1], ['0%', '-5%'])
  const innerStaggerY  = useTransform(imageProgress, [0, 1], ['0%', '-2.5%'])

  // Center image slightly zoomed at start → normal as panels expand
  const heroImageScale = useTransform(imageProgress, v => 1 + (1 - v) * 0.12)

  const leftImages  = sideImages.filter(img => img.position === 'left')
  const rightImages = sideImages.filter(img => img.position === 'right')

  return (
    <section ref={containerRef} className="relative h-[300vh] w-full bg-black">
      {/* ── OVERLAY TEXT (fixed, fades on scroll) ── */}
      <motion.div
        style={{ opacity: textOpacity }}
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-60 flex justify-center"
      >
        {/* AYAAN — letters blur-fade in one by one after image appears */}
        <h1
          className="m-0 p-0 uppercase"
          style={{
            fontSize: 'clamp(3.2rem, 29vw, 26rem)',
            lineHeight: 0.78,
            color: '#c78347',
            fontFamily: "var(--font-italiana)",
            whiteSpace: 'nowrap',
          }}
        >
          {'AYAAN'.split('').map((letter, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, filter: 'blur(12px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 1.0 + i * 0.15, ease: 'easeOut' }}
              style={{ display: 'inline-block' }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>
      </motion.div>

      {/* ── STICKY BENTO GRID ── */}
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="relative flex h-full w-full items-stretch justify-center"
          style={{ gap: gridGap }}
        >
          {/* Left column */}
          <motion.div
            className="flex h-full flex-row overflow-hidden will-change-transform"
            style={{
              width: sideWidth,
              opacity: sideOpacity,
              x: sideSlideLeft,
              gap: gridGap,
            }}
          >
            {leftImages.map((img, idx) => (
              <motion.div
                key={img.src}
                className="relative h-full flex-1 overflow-hidden"
                style={{ y: idx === 0 ? outerStaggerY : innerStaggerY }}
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </motion.div>

          {/* Center column */}
          <motion.div
            className="relative overflow-hidden will-change-transform flex-shrink-0"
            style={{ width: centerWidth, height: '100%' }}
          >
            <motion.img
              src={heroImageSrc}
              alt="Ayaan"
              className="absolute inset-0 w-full h-full object-cover will-change-transform"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              style={{
                objectPosition: 'center 42%',
                scale: heroImageScale,
              }}
            />
          </motion.div>

          {/* Right column */}
          <motion.div
            className="flex h-full flex-row overflow-hidden will-change-transform"
            style={{
              width: sideWidth,
              opacity: sideOpacity,
              x: sideSlideRight,
              gap: gridGap,
            }}
          >
            {rightImages.map((img, idx) => (
              <motion.div
                key={img.src}
                className="relative h-full flex-1 overflow-hidden"
                style={{ y: idx === 0 ? innerStaggerY : outerStaggerY }}
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
