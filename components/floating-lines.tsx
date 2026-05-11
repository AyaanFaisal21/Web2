/**
 * FloatingLines
 *
 * A raw Three.js WebGL renderer that draws animated sine-wave line clusters across a fullscreen
 * orthographic quad. The visual is entirely GLSL-driven: three independently configurable wave
 * clusters (top/middle/bottom) each loop over N line strips, applying per-line color from a
 * gradient palette and a traveling dark-void pulse effect. Optional features — mouse bend
 * interaction, parallax offset, and multi-stop color gradients — are toggled via props and
 * passed as GLSL uniforms without any JS-side per-frame math beyond lerp damping.
 *
 * Performance design: the RAF loop checks a `bgCovered` boolean before calling
 * renderer.render(). This flag is set by a passive scroll listener that computes scroll
 * progress through the #technical-experience section; when the expanding black panel covers
 * ~70% of the viewport, rendering is fully skipped (GPU cost drops to zero) while the RAF
 * itself stays alive to avoid start/stop race conditions. Page Visibility API also suppresses
 * rendering on tab-switch. Canvas dimensions are kept current by a ResizeObserver that calls
 * renderer.setSize() and updates the iResolution uniform, making it fully responsive.
 *
 * This component is a reusable primitive; site-specific configuration is applied in
 * FloatingPathsBackground.
 */
'use client'

import { useEffect, useRef } from 'react'
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock,
} from 'three'

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool  enableTop;
uniform bool  enableMiddle;
uniform bool  enableBottom;

uniform int   topLineCount;
uniform int   middleLineCount;
uniform int   bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3  topWavePosition;
uniform vec3  middleWavePosition;
uniform vec3  bottomWavePosition;

uniform vec2  iMouse;
uniform bool  interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool  parallax;
uniform float parallaxStrength;
uniform vec2  parallaxOffset;

uniform vec3  lineGradient[8];
uniform int   lineGradientCount;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 getLineColor(float t) {
  if (lineGradientCount <= 0) return vec3(0.5);
  if (lineGradientCount == 1) return lineGradient[0] * 0.5;
  float s   = clamp(t, 0.0, 0.9999) * float(lineGradientCount - 1);
  int   idx = int(floor(s));
  int   idx2 = min(idx + 1, lineGradientCount - 1);
  return mix(lineGradient[idx], lineGradient[idx2], fract(s)) * 0.5;
}

// Traveling dark void along each line's local x-axis.
// Applied to lineCol before wave() multiplication so the background stays untouched.
// clusterOffset staggers the three clusters so they fire at different times.
vec3 applyPulse(vec3 baseCol, vec2 ruv, float clusterOffset) {
  float cycleLength = 25.0;
  float localTime   = mod(iTime + clusterOffset, cycleLength);
  float pulsePos    = -6.0 + localTime * 2.5;
  float dist        = abs(ruv.x - pulsePos);

  // Wide soft halo fades lines toward black; tight core kills them almost entirely
  float intensity = smoothstep(1.2, 0.0, dist);
  float core      = smoothstep(0.3, 0.0, dist);

  vec3 col = baseCol * (1.0 - intensity * 0.9);
  col     *= (1.0 - core * 0.5);
  return col;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;
  float amp  = sin(offset + time * 0.2) * 0.3;
  float y    = sin(uv.x + offset + time * 0.1) * amp;

  if (shouldBend) {
    vec2  d   = screenUv - mouseUv;
    float inf = exp(-dot(d, d) * bendRadius);
    y += (mouseUv.y - screenUv.y) * inf * bendStrength * bendInfluence;
  }
  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  if (parallax) baseUv += parallaxOffset;

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  vec3 col = vec3(0.0);

  if (enableBottom) {
    float total = float(bottomLineCount);
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi    = float(i);
      float t     = fi / max(total - 1.0, 1.0);
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2  ruv   = baseUv * rotate(angle);
      vec3  lineCol = applyPulse(getLineColor(t), ruv, 10.0);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi, baseUv, mouseUv, interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    float total = float(middleLineCount);
    for (int i = 0; i < middleLineCount; ++i) {
      float fi    = float(i);
      float t     = fi / max(total - 1.0, 1.0);
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2  ruv   = baseUv * rotate(angle);
      vec3  lineCol = applyPulse(getLineColor(t), ruv, 20.0);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi, baseUv, mouseUv, interactive
      ) * 0.65;
    }
  }

  if (enableTop) {
    float total = float(topLineCount);
    for (int i = 0; i < topLineCount; ++i) {
      float fi    = float(i);
      float t     = fi / max(total - 1.0, 1.0);
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2  ruv   = baseUv * rotate(angle);
      ruv.x *= -1.0;
      vec3  lineCol = applyPulse(getLineColor(t), ruv, 30.0);
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi, baseUv, mouseUv, interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`

const MAX_GRADIENT_STOPS = 8

type WavePosition = { x: number; y: number; rotate: number }

type FloatingLinesProps = {
  linesGradient?: string[]
  enabledWaves?: Array<'top' | 'middle' | 'bottom'>
  lineCount?: number | number[]
  lineDistance?: number | number[]
  topWavePosition?: WavePosition
  middleWavePosition?: WavePosition
  bottomWavePosition?: WavePosition
  animationSpeed?: number
  interactive?: boolean
  bendRadius?: number
  bendStrength?: number
  mouseDamping?: number
  parallax?: boolean
  parallaxStrength?: number
  mixBlendMode?: React.CSSProperties['mixBlendMode']
}

function hexToVec3(hex: string): Vector3 {
  let v = hex.trim().replace(/^#/, '')
  if (v.length === 3) v = v[0]+v[0]+v[1]+v[1]+v[2]+v[2]
  return new Vector3(
    parseInt(v.slice(0, 2), 16) / 255,
    parseInt(v.slice(2, 4), 16) / 255,
    parseInt(v.slice(4, 6), 16) / 255,
  )
}

export default function FloatingLines({
  linesGradient,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = [6],
  lineDistance = [5],
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen',
}: FloatingLinesProps) {
  const containerRef        = useRef<HTMLDivElement | null>(null)
  const targetMouseRef      = useRef(new Vector2(-1000, -1000))
  const currentMouseRef     = useRef(new Vector2(-1000, -1000))
  const targetInfluenceRef  = useRef(0)
  const currentInfluenceRef = useRef(0)
  const targetParallaxRef   = useRef(new Vector2(0, 0))
  const currentParallaxRef  = useRef(new Vector2(0, 0))

  const getCount = (wave: 'top' | 'middle' | 'bottom') => {
    if (typeof lineCount === 'number') return lineCount
    const i = enabledWaves.indexOf(wave)
    return i >= 0 ? (lineCount[i] ?? 6) : 0
  }
  const getDist = (wave: 'top' | 'middle' | 'bottom') => {
    if (typeof lineDistance === 'number') return lineDistance
    const i = enabledWaves.indexOf(wave)
    return i >= 0 ? (lineDistance[i] ?? 5) : 5
  }

  useEffect(() => {
    if (!containerRef.current) return

    const scene  = new Scene()
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 1

    const renderer = new WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.width  = '100%'
    renderer.domElement.style.height = '100%'
    containerRef.current.appendChild(renderer.domElement)

    const uniforms = {
      iTime:          { value: 0 },
      iResolution:    { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },

      enableTop:    { value: enabledWaves.includes('top') },
      enableMiddle: { value: enabledWaves.includes('middle') },
      enableBottom: { value: enabledWaves.includes('bottom') },

      topLineCount:    { value: enabledWaves.includes('top')    ? getCount('top')    : 0 },
      middleLineCount: { value: enabledWaves.includes('middle') ? getCount('middle') : 0 },
      bottomLineCount: { value: enabledWaves.includes('bottom') ? getCount('bottom') : 0 },

      topLineDistance:    { value: enabledWaves.includes('top')    ? getDist('top')    * 0.01 : 0.01 },
      middleLineDistance: { value: enabledWaves.includes('middle') ? getDist('middle') * 0.01 : 0.01 },
      bottomLineDistance: { value: enabledWaves.includes('bottom') ? getDist('bottom') * 0.01 : 0.01 },

      topWavePosition:    { value: new Vector3(topWavePosition?.x    ?? 10.0, topWavePosition?.y    ?? 0.5,  topWavePosition?.rotate    ?? -0.4) },
      middleWavePosition: { value: new Vector3(middleWavePosition?.x ?? 5.0,  middleWavePosition?.y ?? 0.0,  middleWavePosition?.rotate ?? 0.2) },
      bottomWavePosition: { value: new Vector3(bottomWavePosition.x, bottomWavePosition.y, bottomWavePosition.rotate) },

      iMouse:        { value: new Vector2(-1000, -1000) },
      interactive:   { value: interactive },
      bendRadius:    { value: bendRadius },
      bendStrength:  { value: bendStrength },
      bendInfluence: { value: 0 },

      parallax:         { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset:   { value: new Vector2(0, 0) },

      lineGradient:      { value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1)) },
      lineGradientCount: { value: 0 },
    }

    if (linesGradient?.length) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS)
      uniforms.lineGradientCount.value = stops.length
      stops.forEach((hex, i) => {
        const c = hexToVec3(hex)
        uniforms.lineGradient.value[i].set(c.x, c.y, c.z)
      })
    }

    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader })
    const geometry = new PlaneGeometry(2, 2)
    scene.add(new Mesh(geometry, material))

    const clock = new Clock()

    const setSize = () => {
      const el = containerRef.current
      if (!el) return
      renderer.setSize(el.clientWidth || 1, el.clientHeight || 1, false)
      uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1)
    }
    setSize()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setSize) : null
    if (ro && containerRef.current) ro.observe(containerRef.current)

    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const dpr  = renderer.getPixelRatio()
      targetMouseRef.current.set((e.clientX - rect.left) * dpr, (rect.height - (e.clientY - rect.top)) * dpr)
      targetInfluenceRef.current = 1
      if (parallax) {
        targetParallaxRef.current.set(
          ((e.clientX - rect.left) / rect.width  - 0.5) *  parallaxStrength,
          ((e.clientY - rect.top)  / rect.height - 0.5) * -parallaxStrength,
        )
      }
    }
    const onLeave = () => { targetInfluenceRef.current = 0 }

    if (interactive) {
      renderer.domElement.addEventListener('pointermove', onMove)
      renderer.domElement.addEventListener('pointerleave', onLeave)
    }

    let raf = 0
    let bgCovered = false

    const tick = () => {
      if (!bgCovered && !document.hidden) {
        uniforms.iTime.value = clock.getElapsedTime()
        if (interactive) {
          currentMouseRef.current.lerp(targetMouseRef.current, mouseDamping)
          uniforms.iMouse.value.copy(currentMouseRef.current)
          currentInfluenceRef.current += (targetInfluenceRef.current - currentInfluenceRef.current) * mouseDamping
          uniforms.bendInfluence.value = currentInfluenceRef.current
        }
        if (parallax) {
          currentParallaxRef.current.lerp(targetParallaxRef.current, mouseDamping)
          uniforms.parallaxOffset.value.copy(currentParallaxRef.current)
        }
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // The expanding black box inside #technical-experience covers the background gradually
    // over a 180vh scroll container. DOM position fires too early for IntersectionObserver,
    // so we compute progress through the section and pause at 70% (box ~fullscreen).
    const updateVisibility = () => {
      const techEl = document.getElementById('technical-experience')
      if (!techEl) { bgCovered = false; return }
      const rect     = techEl.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const progress   = scrollable > 0 ? -rect.top / scrollable : 0
      bgCovered = progress > 0.7 || rect.bottom <= window.innerHeight
    }

    window.addEventListener('scroll', updateVisibility, { passive: true })
    document.addEventListener('visibilitychange', () => { bgCovered = document.hidden })
    updateVisibility()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', updateVisibility)
      ro?.disconnect()
      if (interactive) {
        renderer.domElement.removeEventListener('pointermove', onMove)
        renderer.domElement.removeEventListener('pointerleave', onLeave)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.parentElement?.removeChild(renderer.domElement)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ mixBlendMode }}
    />
  )
}
