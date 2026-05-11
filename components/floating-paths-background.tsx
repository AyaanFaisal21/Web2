/**
 * FloatingPathsBackground
 *
 * Thin configuration wrapper around the raw FloatingLines WebGL renderer. Sits at the
 * very bottom of the z-stack (z-0, fixed) and spans the entire viewport, providing the
 * animated white-line ambient background visible behind the hero and philosophy sections.
 * By the time the user scrolls into the about/experience section, FloatingLines' internal
 * visibility gate (bgCovered) has already paused the render loop, so this component has
 * zero GPU cost while off-screen. All visual tuning for the site-wide background — line
 * count, speed, gradient — lives here; FloatingLines itself is a reusable primitive.
 */
'use client'

import FloatingLines from '@/components/floating-lines'

export function FloatingPathsBackground() {
  return (
    <div className="absolute inset-0 bg-black">
      <FloatingLines
        linesGradient={['#ffffff']}
        mixBlendMode="normal"
        animationSpeed={0.6}
        lineCount={[8, 6, 6]}
        lineDistance={[4, 7, 5]}
interactive={false}
        parallax={false}
      />
    </div>
  )
}
