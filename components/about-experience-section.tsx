/**
 * AboutExperienceSection
 *
 * The primary content section of the portfolio, spanning roughly 1800vh of scroll space and
 * organized into five sequential scroll-driven phases, all choreographed through a single
 * Framer Motion useScroll pipeline against the outer section container:
 *
 *   1. About Me  — three portrait boxes cross-fade and slide into view with a word-wheel
 *      rotating through personal descriptors, driven by `aboutProgress` (0–1).
 *   2. Experience — the expanded experience panel (Panel 0, 6 entries) fades in over a
 *      background that cross-fades to the compressed panel (Panel 1, 4 EXPERIENCES), driven by
 *      `expandedMV` and `techHeaderOpacity`.
 *   3. Projects  — a two-column masonry layout (CSS `columns: 2`) of six project cards with
 *      live previews, fading in below the experience list.
 *   4. Skills box — a centered resting box fades in showing skills/stack badges before the
 *      final expansion begins. The contact background image starts fading in here at partial
 *      opacity (0.65) while the box is still at its resting dimensions.
 *   5. Contact   — `finalBoxClipPath` animates from the resting-box inset to `inset(0 0 0 0)`
 *      (fullscreen) using a compositor-only clip-path, avoiding any layout recalculation (CLS 0).
 *      The background image opacity ramps to 1.0 simultaneously, revealing the full contact form.
 *
 * Key rendering decisions:
 * - `clip-path: inset(...)` replaces all layout-property animations (top/left/width/height)
 *   so the browser never triggers a layout pass during scroll — CLS measured at 0.00 site-wide.
 * - `renderBullet()` parses `**text**` markers in experience entry strings into <strong> tags.
 * - `EXPANDED_ONLY_EXPERIENCES` are appended only in Panel 0 (the expanded view) so weaker
 *   entries don't appear in the default compressed experience list.
 * - Fixed px values (`176px`, `82px`) in the skills-box clip math and inner content positioning
 *   are the one area that doesn't scale proportionally at very different absolute resolutions
 *   (e.g., 4K vs. 1080p at the same aspect ratio).
 */
"use client"

import { useRef, useState, useEffect } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react"
import { Github, Linkedin, FileText } from "lucide-react"

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const NOUNS = [
  "Collaborator",
  "Empath",
  "Idealist",
  "Builder",
  "Tenacity",
  "Visionary",
  "Developer",
  "Designer"
]

const WORD_FONTS: Record<string, string> = {
  "Collaborator": "'Space Grotesk', sans-serif",
  "Empath": "'Caveat', cursive",
  "Idealist": "'Cinzel', serif",
  "Builder": "'Anton', sans-serif",
  "Tenacity": "'Oswald', sans-serif",
  "Visionary": "'Space Grotesk', sans-serif",
  "Developer": "'Fira Code', monospace",
  "Designer": "'Playfair Display', serif",
  "About me": "var(--font-name)",
}

const SLOT_W = 800

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function WordItem({ word, index, activeProgress }: { word: string, index: number, activeProgress: MotionValue<number> }) {
  const opacity = useTransform(activeProgress, (v) => {
    const dist = Math.abs(v - index)
    if (dist > 2.5) return 0
    if (dist < 0.3) return 1
    return Math.max(0, 1 - (dist - 0.3) / 2.2)
  })

  const scale = useTransform(activeProgress, (v) => {
    const dist = Math.abs(v - index)
    return Math.max(0.5, 1 - Math.max(0, dist - 0.3) * 0.2)
  })

  return (
    <motion.div
      className="flex-shrink-0 relative flex items-center justify-center"
      style={{ width: SLOT_W, opacity, scale }}
    >
      <span
        className="relative metallic-header font-normal select-none"
        style={{
          fontFamily: WORD_FONTS[word] || "var(--font-name)",
          fontSize: "clamp(2.5rem, 5vw, 5rem)",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </span>
    </motion.div>
  )
}


const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"

// Scroll-tied settle with continuous live scramble of unrevealed characters.
// Scroll progress determines how many characters lock to their correct value;
// the rest randomly cycle at ~80ms per frame so the header always looks alive.
function DecryptingHeader({ text, progress, active = false }: { text: string; progress: MotionValue<number>; active?: boolean }) {
  const [randomIndices] = useState(() => {
    const indices = Array.from({ length: text.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  })

  const settledRef  = useRef(0)
  const rafRef      = useRef(0)
  const lastTickRef = useRef(0)

  const [displayText, setDisplayText] = useState(() =>
    text.split('').map(c => c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  )

  useMotionValueEvent(progress, 'change', (v) => {
    settledRef.current = Math.floor(Math.min(v, 1) * text.length)
  })

  useEffect(() => {
    const tick = (time: number) => {
      rafRef.current = requestAnimationFrame(tick)
      if (time - lastTickRef.current < 80) return  // ~12 scrambles per second
      lastTickRef.current = time

      const decrypted = new Set(randomIndices.slice(0, settledRef.current))
      let out = ''
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') { out += ' '; continue }
        out += decrypted.has(i) ? text[i] : CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setDisplayText(out)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [text, randomIndices])

  return (
    <h2
      className="metallic-header font-normal select-none text-white/90 text-center whitespace-nowrap transition-all duration-500"
      style={{
        fontFamily: 'var(--font-name)', fontSize: 'clamp(2.5rem, 5vw, 5rem)', letterSpacing: '-0.02em',
        textShadow: active ? '0 0 16px rgba(255,255,255,1), 0 0 40px rgba(255,255,255,0.7), 0 0 80px rgba(255,255,255,0.3)' : undefined,
      }}
    >
      {displayText}
    </h2>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
const EXPERIENCES = [
  {
    role: 'Lead Software Engineer',
    company: 'Privet',
    dates: 'Mar 2026 – Present',
    previewImage: '',
    previewUrl: 'https://get-privet.com',
    description: "Privet is a local privacy layer for people using AI with sensitive data — accountants, lawyers, financial advisors, pharmacists, and founders who need LLMs but can't risk sending client information to 3rd parties. It runs as a proxy on your machine, intercepting outbound prompts to make sure nothing sensitive ever leaves the device. See [get-privet.com](https://get-privet.com).",
    bullets: [
      'Routed **100%** of outbound LLM traffic through a full-stack detection pipeline by building a Rust/Tokio HTTPS proxy with custom TLS termination, preserving provider authentication and streaming SSE support.',
      'Achieved **under 150ms** sanitization latency on CPU-only hardware by engineering a two-layer detection system combining regex and NER pattern matching with a quantized Phi-3-mini model using less than **500MB** RAM.',
      'Prevented client data from crossing the network boundary by building an SQLCipher-encrypted vault with OS keychain key derivation and a tamper-evident audit log storing **zero** sensitive data.',
    ],
  },
  {
    role: 'Learning Assistant — Calculus II',
    company: 'Rutgers University New Brunswick',
    dates: 'Apr 2026 – Apr 2027',
    bullets: [
      'Support student understanding of multivariable calculus, sequences and series, and integral techniques by leading collaborative problem-solving sessions and translating abstract mathematical concepts into accessible, intuitive frameworks.',
      'Bridge the gap between lecture and comprehension by identifying recurring points of confusion across students and developing targeted explanations that address conceptual gaps rather than surface-level procedure.',
      'Collaborate with course instructors to align supplementary support with curriculum pacing, ensuring students build foundational fluency before advancing to more complex applications.',
    ],
  },
  {
    role: 'Executive Board Member',
    company: 'Muslim Tech Collaborative, Rutgers',
    dates: 'Dec 2025 – Present',
    previewImage: '',
    previewUrl: 'https://mtc.so/',
    description: 'Muslim Tech Collaborative is a Rutgers student organization that builds bridges between the campus tech community and outside industry. Joined the founding team in its first year to help run hackathons, develop recruiting events, and architect a startup-immersion program (Forge) that places students into real workplaces. As an executive board member, I help shape program direction and run logistics for events that bring industry recruiters and engineers onto campus. See [mtc.so](https://mtc.so/).',
    bullets: [
      'Co-coordinated a hackathon featuring **$4,000+** in prizes and meaningful industry participation, managing logistics, partner communication, and attendee experience.',
      'Organized a career networking event connecting **70** students with **10** professionals, navigating outreach and positioning in a campus environment dense with competing events.',
      'Partnered with student leaders and external professionals to expand access to mentorship and career opportunities in tech.',
    ],
  },
  {
    role: 'Frontend Software Engineer',
    company: 'Freelance',
    dates: 'Jul 2025 – Feb 2026',
    bullets: [
      'Built premium web experiences using advanced frontend engineering tools, achieving Lighthouse scores over **90** across audited categories.',
      'Reduced CPU rendering workload by **65%** by identifying a costly 3D animation loop and applying scroll-progress-based render gating.',
      'Achieved **99%** CLS reduction site-wide with **0** INP regression by replacing layout-property animations with compositor-only transforms.',
    ],
  },
]

const EXPANDED_ONLY_EXPERIENCES = [
  {
    role: 'Officer & Fundraiser Lead',
    company: 'Muslim Student Association, WWP-HSN',
    dates: 'Sept 2023 – June 2024',
    bullets: [
      'Transformed a fundraiser rejection into approval by mapping admin concerns into constraints, reframing the pitch, and securing sign-off — ultimately engaging 100+ donors and raising $1,000 for humanitarian aid.',
      'Aligned stakeholders across the board and school administration by translating feedback into a compliance-ready plan and updating materials to meet policy requirements.',
      'Developed an execution playbook covering roles, cash-handling, and communications, enabling smooth event delivery with zero incidents.',
    ],
  },
  {
    role: 'Varsity Team Captain',
    company: 'Esports Club (League of Legends), WWP-HSN',
    dates: 'Oct 2022 – June 2024',
    bullets: [
      'Led a cross-skill-gap roster as the team\'s primary shot-caller, coordinating structured home practice sessions to develop team cohesion, communication, and strategic execution across players ranging from Bronze to Diamond-level competition.',
      'Translated high-level game sense into digestible, actionable callouts for teammates several skill tiers below, building a shared strategic vocabulary that elevated collective performance beyond individual rank.',
      'Guided the team to a 3rd place finish in the Garden State Esports League of Legends Championship (Fall 2022), competing at the varsity level against schools across New Jersey.',
    ],
  },
]

const TECH_PROJECTS = [
  {
    id: 'public-wire',
    title: 'Public Wire — Autonomous Civic Newsroom',
    tags: ['Python', 'TypeScript', 'Multi-Agent', 'LLM', 'ClickHouse', 'Next.js'],
    description: 'Local government shapes daily life — bus routes, street closures, permits — but the information lives buried in PDFs, council agendas, and city portals no one has time to read. Public Wire is an autonomous civic newsroom that monitors a city\'s official web presence and publishes short, source-cited briefs of what actually matters to residents.\n\n A six-agent pipeline handles the work end-to-end: Scout discovers sources, Analyst extracts events, Editor classifies for relevance, Writer drafts under no-invention rules, and Mentor verifies against the original evidence — with loop-backs whenever a claim is thin or a draft drifts. A Reflector meta-agent reads rejection logs from ClickHouse, detects recurring failure patterns, and rewrites the Editor\'s prompt to prevent them, every revision versioned and auditable. Every decision, source check, and prompt change is logged to an immutable ClickHouse ledger, so any published brief can be traced back to exactly how and why it was written. See [public-wire.vercel.app](https://public-wire.vercel.app).',
    image: '/publicwireOG2.jpg',
    colorImage: true,
    projectUrl: 'https://public-wire.vercel.app',
    githubUrl: 'https://github.com/AyaanFaisal21/Public-Wire',
    imagePosition: 'left 42%',
    imageZoom: 1.25,
  },
  {
    id: 'fantasy-stocks',
    title: 'Fantasy Stocks',
    tags: ['React', 'FastAPI', 'PostgreSQL', 'WebSockets', 'AsyncIO', 'Pandas', 'Supabase'],
    description: 'The stock market is a lot less intimidating when it\'s a game. Fantasy Stocks lets you draft real companies like sports picks, join private leagues, and compete on actual market performance — built for the curious, not-yet-committed investor who wants a reason to care about tickers. Real-time drafts, weekly head-to-head matchups, and a live leaderboard make the learning feel like winning. See [fantok.vercel.app](https://fantok.vercel.app).',
    image: '/FantasyStocksColor.jpg',
    colorImage: true,
    projectUrl: 'https://fantok.vercel.app',
    imagePosition: 'center 30%',

    githubUrl: 'https://github.com/AaravL/FantasyStocks',
  },
  {
    id: 'pokermind',
    title: 'PokerMind AI — Multi-Agent Decision System (In Development)',
    tags: ['Python', 'LangGraph', 'Claude API', 'CrewAI', 'Playwright', 'PostgreSQL', 'Redis', 'Docker', 'AWS ECS', 'Grafana', 'scikit-learn'],
    description: 'A behavioral AI research system built around a genuinely hard problem: what does it take for an autonomous agent to play poker indistinguishably from a human? The nuanced challenge here is defeating bot-detection heuristics that fingerprint agents on action-timing regularity, bet-sizing quantization, and decision-tree periodicity. PokerMind uses a council-of-agents architecture: four LLM microservices (Strategist, Historian, Humanizer, Orchestrator) debate each action before it\'s committed. A behavioral evasion subsystem samples timing jitter, deliberate errors, and fatigue patterns from learned human priors. Deployed on AWS ECS with Redis message brokering and a Grafana observability layer.',
    image: '/AgentSwarm.png',
    githubUrl: 'https://github.com/AyaanFaisal21/PokerMindAI',
  },
  {
    id: 'sage',
    title: 'Sage — AI Group Chat Agent',
    tags: ['TypeScript', 'Node.js', 'Gemini API', 'Voyage AI', 'Chroma', 'Photon SDK'],
    description: 'Most group-chat bots are noise. Sage is an AI that lives inside your iMessage group and speaks fewer than 1 in 10 messages — only when it has something real to say. It answers @mentions like a friend who was there, surfaces unresolved tension when the group goes quiet, and intervenes when someone contradicts or forgets a detail established earlier in the conversation. That last behavior hints at something bigger: in large organizations where teams move fast and context gets lost, an agent with real memory could quietly prevent the kind of drift that causes costly misalignment. Built for HackPrinceton\'s Agents in iMessage track.',
    image: '/sageNEW.jpg',
    githubUrl: 'https://github.com/AyaanFaisal21/HackPrincetonS25',
  },
  {
    id: 'skindex',
    title: 'Skindex — Skin Lesion Classifier',
    tags: ['PyTorch', 'ONNX', 'Flask', 'React', 'Vite', 'SQLite', 'JWT'],
    description: 'Googling your symptoms is stressful. A clinic visit for a minor skin concern feels like too much. Skindex sits in between — snap a photo, and it classifies the condition across 10 categories with urgency levels that tell you whether to monitor it, treat it at home, or actually see a doctor. An onboard assistant handles follow-up questions. Informational support, not a diagnosis.',
    image: '/Skinndex.jpg',
    githubUrl: 'https://github.com/KrishLenka/Skindex-HackRUF25',
  },
  {
    id: 'poli',
    title: 'Poli — Bias Analysis Platform',
    tags: ['FastAPI', 'Pydantic', 'GPT-3.5', 'BeautifulSoup', 'React'],
    description: 'A conversational platform for analyzing bias in any casual written work — news articles, blogs, opinion pieces, social media posts, political speeches. Built on the principle that truly neutral text requires no adjectives, since descriptive language is the primary vehicle through which bias enters writing. Fixates on adjective usage alongside broader linguistic patterns to score content across three dimensions: extremity, subjectivity, and factual accuracy, each rated out of 10. Motivated by a personal experiment confirming how algorithm-driven feeds create ideological echo chambers. FastAPI backend with Pydantic validation and GPT-3.5 for structured JSON analysis, a BeautifulSoup scraping layer for direct URL ingestion, and a React frontend with a chat-based interface and SVG rating visualizations.',
    image: '/Poli.jpg',
    githubUrl: 'https://github.com/KrishLenka/hackru25spring',
  },
  {
    id: 'car-deal-predictor',
    title: 'Car Deal Predictor — Used Car Classification Model',
    tags: ['R', 'XGBoost', 'Random Forest', 'Ensemble Learning'],
    description: 'Built a classification model in R to rate used-car deals across 10,000 listings from Dubai, achieving 92% cross-validation accuracy with XGBoost. Engineered features capturing hidden relationships between price, mileage, and benchmark value, reducing multicollinearity and improving validation accuracy by 4%. Closed a 4–5% overfitting gap through 5-fold cross-validation, model stacking, and probability-based ensembling to ensure performance held on unseen data.',
    image: '/CarDeal.jpeg',
    githubUrl: 'https://github.com/AyaanFaisal21/Car-Deal-Predictor',
  },
  {
    id: 'tcp-game-server',
    title: 'TCP Multiplayer Game Server',
    tags: ['C', 'POSIX Sockets', 'Pthreads', 'select()', 'Bash'],
    description: 'A multiplayer game server written in C that handles two concurrent TCP clients playing against each other in real time. The server manages player registration, matchmaking, turn coordination, and graceful handling of mid-game disconnects — all while treating the TCP socket as the raw byte stream it actually is, rather than assuming messages arrive in clean chunks. Under the hood, the server uses exact-length recv() framing to reconstruct messages from partial reads, a mutex-protected FIFO queue to make player registration race-safe under concurrent connections, and select() inside the game loop to monitor both players simultaneously so early moves and disconnects are caught without blocking on turn order. Pthreads handle per-game concurrency.',
    image: '',
  },
]
const N_DISPLAY = 4

const SKILLS = [
  { category: 'Languages',                items: ['Python', 'Rust', 'C', 'C++', 'Java', 'TypeScript', 'JavaScript', 'SQL', 'R', 'Swift'] },
  { category: 'Systems & Infrastructure', items: ['Tokio', 'Hyper', 'Docker', 'Git', 'GitHub Actions', 'AWS EC2', 'Caddy', 'Linux/Unix', 'POSIX Sockets', 'Pthreads'] },
  { category: 'Backend & Data',           items: ['FastAPI', 'Node.js', 'PostgreSQL', 'SQLite', 'Supabase', 'WebSockets', 'AsyncIO', 'SQLCipher', 'Aho-Corasick', 'RegexSet'] },
  { category: 'ML & AI',                  items: ['PyTorch', 'scikit-learn', 'ONNX', 'Chroma', 'Vector Search', 'Embeddings', 'Pandas', 'NumPy', 'XGBoost'] },
  { category: 'Frontend',                 items: ['React', 'Vite', 'Tailwind', 'WebGL', 'Next.js', 'Three.js'] },
]

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// Splits on **bold** markers and renders matches as white semibold spans
const BOLD_RE = /(\*\*[^*]+\*\*)/g
function renderBullet(text: string) {
  return text.split(BOLD_RE).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      : part
  )
}

// Splits on [text](url) markdown links and renders matches as glowing white inline anchors
const LINK_RE = /(\[[^\]]+\]\([^)]+\))/g
function renderDescription(text: string) {
  return text.split(LINK_RE).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (!m) return part
    const [, label, href] = m
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-white font-medium transition-all duration-200 hover:brightness-125"
        style={{ textShadow: '0 0 10px rgba(255,255,255,0.85), 0 0 22px rgba(255,255,255,0.45)' }}
      >
        {label}
      </a>
    )
  })
}

const WHITE_GLOW = '0 0 40px 4px rgba(255,255,255,0.08), 0 0 80px 8px rgba(255,255,255,0.04)'
const cardGlow = { boxShadow: WHITE_GLOW }

function ExperienceCard({ role, company, dates, bullets, description, previewImage, previewUrl }: typeof EXPERIENCES[0]) {
  const imageBlock = previewImage ? (
    <div className="relative h-36 border-t border-zinc-700 flex-shrink-0 overflow-hidden">
      {previewUrl ? (
        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          <Image src={previewImage} alt={company} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        </a>
      ) : (
        <Image src={previewImage} alt={company} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      )}
    </div>
  ) : null

  return (
    <div className="border border-zinc-700 bg-black flex flex-col overflow-hidden" style={cardGlow}>
      <div className="p-7 flex flex-col gap-4">
        <div>
          <h3 className="text-white font-light leading-snug" style={{ fontFamily: 'var(--font-name)', fontSize: '1.5rem' }}>
            {role}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-zinc-200 text-base">{company}</span>
            <span className="text-zinc-500 text-sm">·</span>
            <span className="text-zinc-400 text-base">{dates}</span>
          </div>
        </div>
        {description && (
          <p className="text-zinc-400 font-light leading-relaxed font-shippori italic" style={{ fontSize: '0.92rem' }}>
            {renderDescription(description)}
          </p>
        )}
        <ul className="flex flex-col gap-2.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-zinc-300 font-light leading-relaxed font-shippori flex gap-3" style={{ fontSize: '1.05rem' }}>
              <span className="text-zinc-500 flex-shrink-0 mt-0.5">—</span>
              <span>{renderBullet(b)}</span>
            </li>
          ))}
        </ul>
      </div>
      {imageBlock}
    </div>
  )
}

function ProjectCard({ title, tags, description, image, githubUrl, projectUrl, colorImage, imagePosition, imageZoom }: typeof TECH_PROJECTS[0]) {
  const imageStyle: React.CSSProperties = {}
  if (imagePosition) imageStyle.objectPosition = imagePosition
  if (imageZoom && imageZoom !== 1) {
    imageStyle.transform = `scale(${imageZoom})`
    imageStyle.transformOrigin = 'left center'
  }
  return (
    <div className="border border-zinc-700 bg-black overflow-hidden flex flex-col" style={cardGlow}>
      <div className="p-7 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="text-zinc-400 border border-zinc-600 rounded-full font-shippori"
              style={{ fontSize: 11, padding: '3px 12px', letterSpacing: '0.07em' }}>
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-white font-light leading-snug" style={{ fontFamily: 'var(--font-name)', fontSize: '1.25rem' }}>
          {title}
        </h3>
        {description.split('\n\n').map((para, i) => (
          <p
            key={i}
            className="text-zinc-300 font-light leading-relaxed font-shippori"
            style={{ fontSize: '0.95rem' }}
          >
            {renderDescription(para)}
          </p>
        ))}
      </div>
      <div className="relative h-36 border-t border-zinc-700 flex-shrink-0">
        {image && (
          projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <Image src={image} alt={title} fill className={`object-cover ${colorImage ? 'opacity-90' : 'grayscale opacity-50'}`} style={imageStyle} sizes="(max-width: 768px) 100vw, 50vw" />
            </a>
          ) : (
            <Image src={image} alt={title} fill className={`object-cover ${colorImage ? 'opacity-90' : 'grayscale opacity-50'}`} style={imageStyle} sizes="(max-width: 768px) 100vw, 50vw" />
          )
        )}
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-8 h-8 rounded border border-white/20 bg-black/55 transition-colors duration-200 hover:bg-black/75 hover:border-white/40"
            style={{ backdropFilter: 'blur(4px)' }}
            aria-label="View on GitHub"
          >
            <Github size={14} className="text-white" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.7))' }} />
          </a>
        )}
      </div>
    </div>
  )
}

function ExpandButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-center gap-2 border border-zinc-700 py-3 text-zinc-500 hover:text-zinc-200 hover:border-zinc-400 transition-colors duration-200 text-xs tracking-widest uppercase font-shippori flex-shrink-0">
      Expand {label}
      <span className="text-zinc-500">›</span>
    </button>
  )
}

export function AboutExperienceSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  const [words, setWords] = useState<string[]>(NOUNS)
  useEffect(() => {
    setWords([...shuffle(NOUNS), "About me"])
  }, [])

  // ── Platform vertical centering ──────────────────────────────────────────────
  // Equal gap above (header bottom → platform top) and below (platform bottom → viewport bottom).
  // header bottom = top-16 (64px) + strip height (100px) = 164px.
  // top = (100vh + 164px - 74vh) / 2 = 13vh + 82px  (CSS: calc(13vh + 82px))
  // For Framer Motion animations we need a pure-vh value; compute it from window.innerHeight.
  const platformTopRef = useRef(20) // vh, updated on mount
  const platformTopMV  = useMotionValue(20)
  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight
      const val = ((164 + (h - 164 - h * 0.74) / 2) / h) * 100
      platformTopRef.current = val
      platformTopMV.set(val)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [platformTopMV])

  const [expandedView, setExpandedView] = useState<'none' | 'experiences' | 'projects'>('none')

  const experiencePanelRef = useRef<HTMLDivElement>(null)
  const projectsPanelRef   = useRef<HTMLDivElement>(null)

  const handleExpand = (view: 'experiences' | 'projects') => {
    if (techContainerRef.current) {
      const rect = techContainerRef.current.getBoundingClientRect()
      const absoluteTop = rect.top + window.scrollY
      const target = absoluteTop + techContainerRef.current.offsetHeight - window.innerHeight
      // scroll to position-1 first to guarantee scrollTo fires even if already at target
      window.scrollTo({ top: target - 1 })
      window.scrollTo({ top: target })
    }
    // reset the panel's own scroll so it always opens at the top
    const panelRef = view === 'experiences' ? experiencePanelRef : projectsPanelRef
    if (panelRef.current) panelRef.current.scrollTop = 0
    setExpandedView(view)
  }

  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormState('sending')
    const form = e.currentTarget
    try {
      const res = await fetch('https://formspree.io/f/xrekjgzr', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) { setFormState('sent'); form.reset() }
      else setFormState('error')
    } catch { setFormState('error') }
  }

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // ── Phase 0: ARRIVAL (First 100vh of this section) ──
  // The arrival morph should happen over a defined scroll distance.
  // We'll use a local scroll target or just calibrate against the whole container.
  // Assuming the container will now be around 400vh-500vh total.
  const arrivalProgress = useTransform(scrollYProgress, [0, 0.25], [0, 1])
  const smoothArrival = useSpring(arrivalProgress, { stiffness: 70, damping: 22 })

  // Phase 1: (horizontal scroll removed — now vertical)

  // Word Wheel — completes at 0.75 so the spring settles on "About me" before content reveals
  const wordWheelProgress = useTransform(smoothArrival, [0.2, 0.75], [0, words.length - 1])
  const smoothWordProgress = useSpring(wordWheelProgress, { stiffness: 55, damping: 22 })
  const stripX = useTransform(smoothWordProgress, (v) => -v * SLOT_W)

  // ── Tech Transition: center platform expands from platform dims → fullscreen, then projects appear ──
  const techContainerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: techScrollProgress } = useScroll({
    target: techContainerRef,
    offset: ["start start", "end end"],
  })
  // Expansion + decrypt are calibrated to finish exactly at techScrollProgress=1
  // so the sticky ends the moment animations complete — free-scroll columns follow immediately.
  const techMorphRaw = useTransform(techScrollProgress, [0, 0.42], [0, 1])
  const techMorph = useSpring(techMorphRaw, { stiffness: 65, damping: 22 })

  // ── Arrival Morph: page shrinks to centered platform, content fades in within it ──
  const morphTop    = useTransform(smoothArrival, v => `${clamp(v / 0.45, 0, 1) * platformTopRef.current}vh`)
  const morphLeft   = useTransform(smoothArrival, [0, 0.7],  ["0vw",   "6vw"])
  const morphWidth  = useTransform(smoothArrival, [0, 0.7],  ["100vw", "88vw"])
  const morphHeight = useTransform(smoothArrival, [0, 0.45], ["100vh", "74vh"])
  const morphBg     = useTransform(smoothArrival, [0, 1], [0, 0])                 // always black

  // Work preview images fade out as platform darkens
  const workImagesOpacity = useTransform(smoothArrival, [0, 0.35], [1, 0])

  // Content must be fully opaque before word wheel visually settles on "About me" (~0.80)
  const contentRevealOpacity = useTransform(smoothArrival, [0.58, 0.76], [0, 1])
  const mediaArrivalOpacity  = useTransform(smoothArrival, [0.63, 0.80], [0, 1])

  // Screen 3 content fades out during the expansion so the black frame fills the screen clean
  const screen3ContentOpacity = useTransform(techMorph, [0, 0.50], [1, 0])

  // Two-column headers: scroll-tied decryption spread across a wide scroll window
  // so it feels deliberate. Raw techScrollProgress used (not sprung techMorph) so
  // the reveal doesn't compress into the first 30% where techMorph saturates.
  const headerDecryptProgress = useTransform(techScrollProgress, [0.40, 0.82], [0, 1])
  const techHeaderFadeIn  = useTransform(techMorph, [0.35, 0.90], [0, 1])


  // Final box section: its own sticky scroll context
  const finalBoxContainerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: finalBoxProgress } = useScroll({
    target: finalBoxContainerRef,
    offset: ['start start', 'end end'],
  })
  const techHeaderFadeOut        = useTransform(finalBoxProgress, [0.48, 0.62], [1, 0])
  // Skills content: fades out before background image appears
  const finalBoxContentOpacity   = useTransform(finalBoxProgress, [0.10, 0.18, 0.30, 0.40], [0, 1, 1, 0])
  // Skills box shell: gone just as bg image becomes visible
  const skillsBoxOpacity         = useTransform(finalBoxProgress, [0.30, 0.42], [1, 0])
  // Background image: fades into the box at partial opacity first (still clipped to box dims),
  // then ramps to full as expansion begins at 0.48
  const bgImageOpacity           = useTransform(finalBoxProgress, [0.33, 0.48, 0.70], [0, 0.65, 1])
  // Contact content: fades in once expansion is well underway
  const contactContentOpacity    = useTransform(finalBoxProgress, [0.72, 0.87], [0, 1])
  const techHeaderOpacity = useTransform(
    [techHeaderFadeIn, techHeaderFadeOut] as MotionValue<number>[],
    ([a, b]: number[]) => Math.min(a, b)
  )

  const expandedMV = useMotionValue(0)
  useEffect(() => { expandedMV.set(expandedView !== 'none' ? 1 : 0) }, [expandedView, expandedMV])
  const backButtonFadeOut = useTransform(finalBoxProgress, [0.28, 0.38], [1, 0])
  const footerOpacity = useTransform(
    [expandedMV, techHeaderOpacity, backButtonFadeOut] as MotionValue<number>[],
    ([exp, tech, back]: number[]) => exp * Math.min(tech, back)
  )

  // Slide free-scroll cards up from below viewport as decryption runs (techScrollProgress 0→1).
  // When a panel is expanded, freeze at -100vh so scroll events stop triggering GPU texture uploads.
  const freeScrollSlideY = useTransform(
    [techScrollProgress, expandedMV] as MotionValue<number>[],
    ([progress, exp]: number[]) => {
      const h = typeof window !== 'undefined' ? window.innerHeight : 800
      if (exp > 0.5) return -h
      const t = clamp(progress, 0, 1)
      if (t < 0.40) return -(t / 0.40) * 0.48 * h
      return -(0.48 + ((t - 0.40) / 0.60) * 0.52) * h
    }
  )

  // Resting box: top=176px, left=14vw, width=72vw, bottom-gap=16px.
  // Slide-up: translateY 100%→0 over finalBoxProgress [0, 0.20].
  // Clip-path expansion: inset shrinks from resting dims → 0 over [0.48, 0.88].
  // Both are compositor-only — no top/left/width/height mutations, zero CLS.
  const finalBoxSlideY = useTransform(finalBoxProgress, (v) =>
    v >= 0.20 ? '0%' : `${(1 - clamp(v / 0.20, 0, 1)) * 100}%`
  )
  const finalBoxClipPath = useTransform(finalBoxProgress, (v) => {
    if (v < 0.48) return 'inset(176px 14vw 16px 14vw)'
    const fill  = clamp((v - 0.48) / (0.88 - 0.48), 0, 1)
    const tFast = clamp(fill / 0.45, 0, 1)
    const tSlow = clamp(fill / 0.70, 0, 1)
    const top    = Math.round(176 * (1 - tFast))
    const bottom = Math.round(16  * (1 - tFast))
    const horiz  = 14 * (1 - tSlow)
    return `inset(${top}px ${horiz}vw ${bottom}px ${horiz}vw)`
  })


  // clip-path expand: outer wrapper is always inset-0 bg-black; clip-path opens from
  // platform dims → fullscreen. Inner box stays at static platform dimensions so content
  // lays out correctly (matches box 2 exactly) with zero CLS.
  const expandClipPath = useTransform(
    [techMorph, platformTopMV] as MotionValue<number>[],
    ([morph, platTop]: number[]) => {
      const tFast = clamp(morph / 0.45, 0, 1) // top + height timing
      const tSlow = clamp(morph / 0.70, 0, 1) // left + width timing
      const top    = platTop * (1 - tFast)
      const bottom = (26 - platTop) * (1 - tFast) // 100 - 74 - platTop
      const horiz  = 6 * (1 - tSlow)             // 6vw inset each side
      return `inset(${top}vh ${horiz}vw ${bottom}vh ${horiz}vw)`
    }
  )

  // About Me fixed header: fades in on arrival, fades out only when the expansion begins
  const aboutHeaderFadeIn  = useTransform(scrollYProgress, [0.04, 0.08], [0, 1])
  const aboutHeaderFadeOut = useTransform(techScrollProgress, [0.0, 0.08], [1, 0])
  const aboutHeaderOpacity = useTransform(
    [aboutHeaderFadeIn, aboutHeaderFadeOut] as MotionValue<number>[],
    ([a, b]: number[]) => Math.min(a, b)
  )

  return (
    <div ref={containerRef} id="about" className="relative">
      {/* ── SCREEN 1: ARRIVAL & BIO (Sticky Morph + Content) ── */}
      <div className="relative h-[280vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Platform — starts full-screen white, shrinks to centered elevated canvas, stays visible */}
        <motion.div
          className="absolute z-40 overflow-hidden border border-zinc-700"
          style={{
            boxShadow: WHITE_GLOW,
            top: morphTop,
            left: morphLeft,
            width: morphWidth,
            height: morphHeight,
            backgroundColor: useTransform(morphBg, v => `rgb(${v},${v},${v})`),
          }}
        >
          {/* Work preview — visible on white page, fades as platform darkens */}
          <motion.div
            className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-8 p-14 z-0"
            style={{ opacity: workImagesOpacity }}
          >
            {[
              { src: "/NeuralDark.png",      label: "Neural Network",  caption: "Forward-pass activations propagating through a custom deep network architecture" },
              { src: "/EmbeddedDark.png",    label: "Embeddings",      caption: "Semantic similarity mapped as geometry in high-dimensional vector space"          },
              { src: "/SysDesignDark.png",   label: "System Design",   caption: "Distributed system blueprint — rate limiters, hashing rings, and leader election"  },
              { src: "/FiniteStateDark.png", label: "Finite State",    caption: "DFA/NFA playground for stepping through automata and regular expressions"          },
            ].map(({ src, label, caption }) => (
              <div key={src} className="group relative overflow-hidden border border-zinc-800 flex items-center justify-center bg-black">
                <Image src={src} alt={label} fill className="object-contain grayscale opacity-80" sizes="(max-width: 768px) 100vw, 44vw" />
                <div className="absolute inset-x-0 bottom-0 bg-black/80 px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <p className="text-white/70 text-xs font-light text-center font-shippori leading-snug">{caption}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* absolute inset-0 + padding constrains children to the actual inner area, avoiding overflow-hidden clipping */}
          <div className="absolute inset-0 p-4 flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
              {/* Media column */}
              <motion.div
                style={{ opacity: mediaArrivalOpacity }}
                className="relative h-full min-h-0"
              >
                <div className="absolute inset-2 overflow-hidden border border-zinc-800">
                  <Image src="/NYCayaan.jpg" fill className="object-cover opacity-90" alt="NYC" sizes="(max-width: 1024px) 88vw, 34vw" />
                </div>
              </motion.div>

              {/* Bio column — fades in within the platform */}
              <motion.div
                style={{ opacity: contentRevealOpacity }}
                className="black-metal-panel p-8 rounded-none relative overflow-hidden flex flex-col justify-center min-h-0"
              >
                <p className="text-lg md:text-xl text-zinc-300 font-light leading-relaxed font-shippori whitespace-pre-wrap">
{`I started with Legos. I liked how scattered, incomplete pieces could become something whole; software gave me that same feeling, just without a messy floor to clean up.

I'm a CS, Data Science, and Math student at the Rutgers University Honors College focused on exploring how intelligent systems should be designed and used: how they manage memory, make decisions under uncertainty, stay accurate at scale, and interact with modern tools in ways they could not in the past.

I've worked across the stack, training and deploying ML models in PyTorch and ONNX, building concurrent real-time backends with WebSockets and AsyncIO, and shipping responsive frontends like this one. Along the way, I'm drawn to the abstractions that make hard things elegant: vector databases that turn meaning into math, embedding spaces where similarity is geometry, and memory architectures that let a system remember selectively.`}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        </div>
      </div>

      {/* About Me Header Strip — fixed, persists through Screen 1 + 1.5, fades out on tech entry */}
      <motion.div
        className="fixed inset-x-0 top-16 z-60 flex items-center justify-center pointer-events-none"
        style={{ height: 100, opacity: aboutHeaderOpacity }}
      >
        <div className="absolute inset-x-0 h-full bg-black black-metal-panel shadow-xl" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        >
          <motion.div
            className="absolute top-0 bottom-0 flex items-center"
            style={{ x: stripX, left: `calc(50% - ${SLOT_W / 2}px)` }}
          >
            {words.map((word, i) => (
              <WordItem key={`${word}-${i}`} word={word} index={i} activeProgress={smoothWordProgress} />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ── SCREEN 1.5: BIO CONTINUED (freely scrollable, fades in at 50% visibility) ── */}
      <div className="relative h-screen flex items-center justify-center">
        <div
          className="absolute overflow-hidden border border-zinc-700 bg-black"
          style={{ top: "calc(13vh + 82px)", left: "6vw", width: "88vw", height: "74vh", boxShadow: WHITE_GLOW }}
        >
          <motion.div
            className="absolute inset-0 p-4 flex flex-col"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ amount: 0.5 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
              {/* Bio column */}
              <div className="black-metal-panel p-8 rounded-none relative overflow-hidden flex flex-col justify-center min-h-0">
                <p className="text-lg md:text-xl text-zinc-300 font-light leading-relaxed font-shippori whitespace-pre-wrap">
{`But no amount of focus on the system will matter if the person using it doesn't benefit from it. I track how it feels to use something, and the extent to which I can really help the people I'm building for, because that doesn't just drive my work, it defines it.

I'm also drawn to problems where the right answer isn't obvious—where prudent judgment, good architecture, and a genuine understanding of human decisions all have to show up at once. Those are the problems worth building for.`}
                </p>
              </div>
              {/* Image column */}
              <div className="relative h-full min-h-0">
                <div className="absolute inset-2 overflow-hidden border border-zinc-800">
                  <Image src="/IMG_7856.jpeg" fill className="object-cover object-[center_80%] opacity-90" alt="Friends" sizes="(max-width: 1024px) 88vw, 34vw" />
                  <div className="absolute bottom-0.5 left-0.5 right-0.5 bg-black px-3 py-2 text-center">
                    <p className="text-base text-white/80 font-light font-shippori">Presenting my product at the Datadog HQ in the NYT building!</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── EXPANSION — sticky throughout: expansion, decrypt, card reveal, card scroll ── */}
      <div ref={techContainerRef} id="technical-experience" className="relative h-[180vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Platform: clip-path expands from platform dims → fullscreen on bg-black wrapper.
               Inner box is static at exact platform dimensions so content matches boxes 1 & 2. */}
          <motion.div
            className="absolute inset-0 z-30 bg-black"
            style={{ clipPath: expandClipPath }}
          >
            <div
              className="absolute overflow-hidden"
              style={{ top: 'calc(13vh + 82px)', left: '6vw', width: '88vw', height: '74vh' }}
            >
            <motion.div className="absolute inset-0" style={{ opacity: screen3ContentOpacity }}>
              <div className="absolute inset-0 p-4 flex flex-col">
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
                  <div className="relative h-full min-h-0">
                    <div className="absolute inset-2 overflow-hidden border border-zinc-800">
                      <Image src="/MastesrPromotion.jpg" fill className="object-cover opacity-90" alt="Master's Promotion" sizes="(max-width: 1024px) 88vw, 34vw" />
                      <div className="absolute bottom-0.5 left-0.5 right-0.5 bg-black px-3 py-2 text-center">
                        <p className="text-base text-white/80 font-light font-shippori">Statistically, I'm apart of the 99th percentile of LoL players!</p>
                      </div>
                    </div>
                  </div>
                  <div className="black-metal-panel p-8 rounded-none relative overflow-hidden flex flex-col justify-center min-h-0">
                    <p className="text-lg md:text-xl text-zinc-300 font-light leading-relaxed font-shippori whitespace-pre-wrap">
{`"Somewhere out there, someone is better than me — that means I can definitely still improve."

Growing up playing League of Legends taught me so much, but this is my favorite thing it taught me. The knowledge that someone starting where I started has already done it is why I began learning Arabic despite how daunting it looked; it's why I started working out despite how impossibly far away being in shape felt; it's why I strive for excellence even when the goal looks far away. The uncertainty and behavioral reasoning that defined the game I loved is probably also why I ended up as someone always down for a game of poker.

We're all more than our work, but through my work and beyond it, you'll learn that I'm a highly adaptable, pragmatic idealist — ambitious, realistic, and relentless — and I think those traits go well together.`}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── FREE-SCROLL CARDS — slides up from below as tech header decrypts ── */}
      <motion.div style={{ y: freeScrollSlideY, contain: 'layout paint' }} className="relative z-40 overflow-hidden">
        {/* Panel order: [experiences | main | projects]
            none      → x = -100vw  (centre panel visible)
            experiences → x = 0       (slide right → left panel)
            projects  → x = -200vw  (slide left  → right panel) */}
        <motion.div
          className="flex will-change-transform"
          initial={{ x: '-100vw' }}
          animate={{ x: expandedView === 'none' ? '-100vw' : expandedView === 'experiences' ? 0 : '-200vw' }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        >

          {/* ── Panel 0 (left): All Experiences ── */}
          <div ref={experiencePanelRef} className="w-screen flex-shrink-0 bg-black px-16 pb-20" style={{ paddingTop: 'calc(64px + 100px + 24px)' }}>
            <div className="flex flex-col gap-6">
              {[...EXPERIENCES, ...EXPANDED_ONLY_EXPERIENCES].map((exp, i) => (
                <motion.div key={exp.role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={expandedView === 'experiences' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' }}
                >
                  <ExperienceCard {...exp} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Panel 1 (centre): Main two-column view ── */}
          <div className="w-screen flex-shrink-0 bg-black px-16 pb-20" style={{ paddingTop: 'calc(64px + 100px + 24px)' }}>
            <div className="flex gap-10">
              <div className="flex-1 flex flex-col gap-6">
                {EXPERIENCES.map((exp, i) => (
                  <motion.div key={exp.role} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}>
                    <ExperienceCard {...exp} />
                  </motion.div>
                ))}
                <ExpandButton label="Experiences" onClick={() => handleExpand('experiences')} />
              </div>
              <div className="w-px bg-zinc-800 shrink-0" />
              <div className="flex-1 flex flex-col gap-6">
                {TECH_PROJECTS.slice(0, N_DISPLAY).map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}>
                    <ProjectCard {...p} />
                  </motion.div>
                ))}
                <ExpandButton label="Projects" onClick={() => handleExpand('projects')} />
              </div>
            </div>
          </div>

          {/* ── Panel 2 (right): All Projects ── */}
          <div ref={projectsPanelRef} className="w-screen flex-shrink-0 bg-black px-16 pb-20" style={{ paddingTop: 'calc(64px + 100px + 24px)' }}>
            <div style={{ columns: 2, gap: '1.5rem' }}>
              {TECH_PROJECTS.map((p, i) => (
                <motion.div key={p.id}
                  style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={expandedView === 'projects' ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' }}
                >
                  <ProjectCard {...p} />
                </motion.div>
              ))}
            </div>
          </div>

        </motion.div>
      </motion.div>

      {/* ── EXPAND BACK FOOTER — visible only when expanded AND inside tech section ── */}
      <motion.div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ opacity: footerOpacity }}
      >
        <div
          className="bg-black/70 backdrop-blur-md border border-white/10 px-14 py-3 pointer-events-auto"
          style={{ boxShadow: '0 0 40px 4px rgba(255,255,255,0.08), 0 0 80px 8px rgba(255,255,255,0.04)' }}
        >
          <button
            onClick={() => setExpandedView('none')}
            className="text-xl whitespace-nowrap transition-all duration-300"
            style={{ fontFamily: 'var(--font-name)', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.85)' }}
          >
            {expandedView === 'experiences' ? 'Back →' : '← Back'}
          </button>
        </div>
      </motion.div>

      {/* ── TECH EXPERIENCE HEADER STRIP — fixed, same rectangle as About Me header ── */}
      <motion.div
        className="fixed inset-x-0 top-16 z-60 flex items-center pointer-events-none"
        style={{ height: 100, opacity: techHeaderOpacity }}
      >
        <div className="absolute inset-0 bg-black black-metal-panel shadow-xl" />
        <div className="relative z-10 w-full flex items-center" style={{ padding: '0 6vw' }}>
          <motion.div
            className="flex-1 flex items-center justify-center"
            animate={{ opacity: expandedView === 'projects' ? 0.12 : 1 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <DecryptingHeader text="Experience" progress={headerDecryptProgress} />
          </motion.div>
          <div className="w-px bg-zinc-700 self-stretch flex-shrink-0" style={{ margin: '20px 0' }} />
          <motion.div
            className="flex-1 flex items-center justify-center"
            animate={{ opacity: expandedView === 'experiences' ? 0.12 : 1 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <DecryptingHeader text="Featured Projects" progress={headerDecryptProgress} />
          </motion.div>
        </div>
      </motion.div>


      {/* ── FINAL BOX — sticky section; box slides up then fills screen ── */}
      {/* marginTop: -100vh closes the layout gap left by the freeScrollSlideY transform */}
      <div ref={finalBoxContainerRef} id="contact" className="relative h-[220vh] bg-black" style={{ marginTop: '-100vh' }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <motion.div
            className="absolute inset-0 z-30 bg-black"
            style={{ y: finalBoxSlideY, clipPath: finalBoxClipPath }}
          >
            <motion.div className="absolute" style={{ top: '176px', left: '14vw', width: '72vw', height: 'calc(100vh - 192px)', opacity: skillsBoxOpacity }}>
            <div
              className="absolute inset-0 overflow-hidden border border-zinc-700"
              style={{ boxShadow: '0 0 40px 4px rgba(255,255,255,0.08), 0 0 80px 8px rgba(255,255,255,0.04)' }}
            >
            {/* ── Layer 1: Technical Skills (fades to black) ── */}
            <motion.div
              className="absolute inset-0 overflow-auto px-16 py-10"
              style={{ opacity: finalBoxContentOpacity }}
            >
              <h2
                className="metallic-header font-normal text-center mb-8"
                style={{ fontFamily: 'var(--font-name)', fontSize: 'clamp(1.6rem, 2.8vw, 2.8rem)', letterSpacing: '-0.02em' }}
              >
                Technical Skills
              </h2>
              <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
                {SKILLS.map(({ category, items }, idx) => (
                  <div
                    key={category}
                    className="bg-black p-7 flex flex-col gap-4"
                    style={idx === SKILLS.length - 1 ? { gridColumn: '1 / -1' } : undefined}
                  >
                    <p className="text-zinc-400 uppercase tracking-widest font-shippori" style={{ fontSize: '0.7rem' }}>
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => (
                        <span key={item} className="text-zinc-200 border border-zinc-700 rounded-full font-shippori"
                          style={{ fontSize: '0.8rem', padding: '4px 14px', letterSpacing: '0.04em', boxShadow: '0 0 8px 0px rgba(255,255,255,0.04)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            </div>
            </motion.div>{/* end skills box */}

            {/* ── Layer 2: Contact background image — snaps on at expansion start, IS the expansion ── */}
            <motion.div className="absolute inset-0" style={{ opacity: bgImageOpacity }}>
              <Image src="/ContactMeBackground.webp" alt="" fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-black/35" />
            </motion.div>

            {/* ── Layer 3: Contact — title + form directly on background image ── */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center overflow-y-auto"
              style={{ opacity: contactContentOpacity }}
            >
              {/* Title — Italiana / same palette as AYAAN on hero */}
              <h1
                className="shrink-0 text-center pointer-events-none select-none"
                style={{
                  fontFamily: 'var(--font-italiana)',
                  color: '#d6bb6a',
                  fontSize: 'clamp(3rem, 10vw, 10rem)',
                  lineHeight: 0.95,
                  paddingTop: '4.5rem',
                  paddingBottom: '1.5rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Don't be a Stranger
              </h1>

              {/* Form — subtitle + inputs wrapped in a semi-transparent panel */}
              <div className="w-full max-w-7xl px-8 flex flex-col gap-4 pb-8">
                <div className="flex flex-col gap-4 bg-black/50 border border-zinc-700 px-8 py-7" style={{ backdropFilter: 'blur(6px)', boxShadow: WHITE_GLOW }}>
                  <p className="text-white/90 text-base leading-relaxed text-center font-light font-shippori" style={{ textShadow: '0 0 10px rgba(255,255,255,0.85)' }}>
                    Whether it's a role, a project, or just a conversation — reach out, I'm always down to talk
                  </p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex gap-4">
                      <input
                        type="text" name="name" placeholder="Name" required
                        className="flex-1 bg-black/40 border border-zinc-700 px-4 py-3 text-zinc-200 font-shippori text-sm focus:outline-none focus:border-white/60 focus:shadow-[0_0_10px_2px_rgba(255,255,255,0.18),0_0_24px_rgba(255,255,255,0.08)] transition-all placeholder:text-zinc-600"
                      />
                      <input
                        type="email" name="email" placeholder="Email" required
                        className="flex-1 bg-black/40 border border-zinc-700 px-4 py-3 text-zinc-200 font-shippori text-sm focus:outline-none focus:border-white/60 focus:shadow-[0_0_10px_2px_rgba(255,255,255,0.18),0_0_24px_rgba(255,255,255,0.08)] transition-all placeholder:text-zinc-600"
                      />
                    </div>
                    <textarea
                      name="message" placeholder="Your message" required rows={8}
                      className="bg-black/40 border border-zinc-700 px-4 py-3 text-zinc-200 font-shippori text-sm focus:outline-none focus:border-white/60 focus:shadow-[0_0_10px_2px_rgba(255,255,255,0.18),0_0_24px_rgba(255,255,255,0.08)] transition-all resize-none placeholder:text-zinc-600"
                    />
                    <div className="flex items-center justify-center gap-4">
                      {formState === 'sent' && (
                        <span className="text-zinc-400 font-shippori text-xs tracking-wide">Message sent — I'll be in touch.</span>
                      )}
                      {formState === 'error' && (
                        <span className="text-zinc-500 font-shippori text-xs tracking-wide">Something went wrong — try again.</span>
                      )}
                      <button
                        type="submit"
                        disabled={formState === 'sending' || formState === 'sent'}
                        className="border border-zinc-500 px-10 py-3 text-zinc-200 hover:text-white hover:border-white transition-colors font-shippori text-xs tracking-widest uppercase disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {formState === 'sending' ? 'Sending…' : formState === 'sent' ? 'Sent' : 'Send Message'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Footer */}
                <div className="mt-2 pt-5 border-t border-zinc-700/60 flex flex-col items-center gap-3">
                  <span
                    className="metallic-header font-normal text-sm tracking-widest uppercase"
                    style={{ fontFamily: 'var(--font-name)', letterSpacing: '0.12em' }}
                  >
                    Ayaan Faisal
                  </span>
                  <div className="flex items-center gap-6">
                    <a href="https://github.com/AyaanFaisal21" target="_blank" rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-shippori text-xs tracking-wide">
                      <Github size={14} /> GitHub
                    </a>
                    <a href="https://www.linkedin.com/in/ayaanfaisal21/" target="_blank" rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-shippori text-xs tracking-wide">
                      <Linkedin size={14} /> LinkedIn
                    </a>
                    <a href="https://x.com/unorth_doX" target="_blank" rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-shippori text-xs tracking-wide">
                      <XIcon size={14} /> X
                    </a>
                    <a href="https://drive.google.com/file/d/139lJn3_8caRHtZbu62m21gOkHSnOi0kh/view?usp=sharing" target="_blank" rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-shippori text-xs tracking-wide">
                      <FileText size={14} /> Resume
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

    </div>
  )
}
