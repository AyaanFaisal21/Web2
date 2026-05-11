/**
 * HeroHeader
 *
 * The site-wide fixed navigation bar. Renders as two floating pill-shaped containers at the
 * top-center of the viewport (z-50): a main bar with the logo, section nav links, and a
 * Contact button; and a social-links bar (desktop-only) for GitHub, LinkedIn, X, and Resume.
 * On mobile the nav collapses behind a hamburger into a full dropdown. Scroll position is
 * tracked via a passive scroll listener that maps section element positions to an activeSection
 * string, applying a glow+border highlight to the matching nav button. Navigation uses Lenis
 * smooth-scroll (via useLenis) with manually tuned per-section offsets to land the viewport
 * at the visually intended entry point for each section, falling back to native scrollIntoView
 * when Lenis is unavailable.
 */
'use client'

import { useState, useEffect } from 'react'
import { Menu, X, Github, Linkedin, FileText } from 'lucide-react'
import { useLenis } from 'lenis/react'

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// offset = how many px past the element's top to scroll to
const navLinks = [
  { id: 'about',                label: 'About Me',             offset: () => window.innerHeight * 1.75 },
  { id: 'technical-experience', label: 'Technical Experience', offset: () => window.innerHeight * 0.80 },
]

const socialLinks = [
  { href: 'https://github.com/AyaanFaisal21',           label: 'GitHub',   Icon: Github,   showLabel: false },
  { href: 'https://www.linkedin.com/in/ayaan--faisal/', label: 'LinkedIn', Icon: Linkedin, showLabel: false },
  { href: 'https://x.com/unorth_doX',                   label: 'X',        Icon: XIcon,    showLabel: false },
  { href: 'https://drive.google.com/file/d/1hoVqAheshOm7JHhJLn57rU0mrMlgSXrX/view?usp=sharing', label: 'Resume', Icon: FileText, showLabel: true },
]

const baseGlow   = { color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.85)' }
const activeGlow = { color: '#fff', textShadow: '0 0 14px rgba(255,255,255,1), 0 0 28px rgba(255,255,255,0.45)' }
const barCls     = 'bg-black/70 backdrop-blur-md border border-white/10'
const barGlow    = { boxShadow: '0 0 40px 4px rgba(255,255,255,0.08), 0 0 80px 8px rgba(255,255,255,0.04)' }

export const HeroHeader = () => {
  const [isMenuOpen, setIsMenuOpen]       = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const lenis = useLenis()

  const scrollTo = (id: string) => {
    setIsMenuOpen(false)
    if (id === 'home') {
      if (lenis) lenis.scrollTo(0)
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const allLinks = [...navLinks, { id: 'contact', offset: () => window.innerHeight * 1.16 }]
    const link = allLinks.find(l => l.id === id)
    const el   = document.getElementById(id)
    if (!el) return
    const offset = link?.offset?.() ?? 0
    if (lenis) lenis.scrollTo(el, { offset })
    else       el.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const handleScroll = () => {
      const ids = [...navLinks.map(l => l.id), 'contact']
      let found: string | null = null
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i])
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) {
          found = ids[i]
          break
        }
      }
      setActiveSection(found)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // null = hero/home, treat that as active for the logo
  const linkStyle = (id: string) => {
    const isActive = id === 'home' ? activeSection === null : activeSection === id
    return {
      fontFamily: 'var(--font-name)',
      ...(isActive
        ? { ...activeGlow, background: 'rgba(255,255,255,0.06)', padding: '4px 14px', border: '1px solid rgba(255,255,255,0.20)' }
        : baseGlow
      ),
    }
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-stretch gap-2">

      {/* ── Main nav rectangle ── */}
      <div className={`relative ${barCls}`} style={barGlow}>
        <div className="flex items-center gap-4 px-6 py-1.5 md:gap-6 md:px-12">

          {/* Logo → scrolls to top */}
          <button
            onClick={() => scrollTo('home')}
            className="shrink-0 text-base leading-tight tracking-tight transition-all duration-300"
            style={linkStyle('home')}
          >
            Ayaan Faisal
          </button>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-2 md:flex lg:gap-4">
            {navLinks.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="shrink-0 text-sm whitespace-nowrap transition-all duration-300"
                style={linkStyle(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Contact */}
          <div className="hidden shrink-0 md:block">
            <button
              onClick={() => scrollTo('contact')}
              className="text-sm whitespace-nowrap transition-all duration-300"
              style={linkStyle('contact')}
            >
              Contact
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="transition-colors duration-300 md:hidden ml-2"
            style={{ color: '#fff' }}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <div className={`absolute top-full left-0 right-0 mt-1 ${barCls} px-6 py-8 md:hidden`}>
            <nav className="flex flex-col gap-6">
              {navLinks.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="text-lg transition-all duration-300 text-left"
                  style={{ fontFamily: 'var(--font-name)', ...linkStyle(id) }}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => scrollTo('contact')}
                className="text-lg transition-all duration-300 text-left"
                style={{ fontFamily: 'var(--font-name)', ...linkStyle('contact') }}
              >
                Contact
              </button>
              <div className="border-t border-white/10 pt-5 flex flex-col gap-4">
                {socialLinks.map(({ href, label, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-base transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-name)', ...baseGlow }}>
                    <Icon size={16} />
                    {label}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* ── Social links rectangle (desktop only) ── */}
      <div className={`hidden md:flex items-center gap-4 px-5 py-1.5 ${barCls}`} style={barGlow}>
        {socialLinks.map(({ href, label, Icon, showLabel }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs whitespace-nowrap transition-all duration-300"
            style={{ fontFamily: 'var(--font-name)', ...baseGlow }}
          >
            <Icon size={15} />
            {showLabel && label}
          </a>
        ))}
      </div>

    </div>
  )
}
