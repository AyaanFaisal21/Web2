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
