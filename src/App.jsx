import { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function useChime(enabled = true) {
  const ctxRef = useRef(null)
  const play = (dur = 500, freq = 880, type = 'sine') => {
    if (!enabled) return
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = ctxRef.current || new Ctx()
      ctxRef.current = ctx
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, ctx.currentTime)
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur / 1000)
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + dur / 1000)
    } catch (e) {
      // ignore
    }
  }
  return play
}

function Robot({ side = 'left', mood = 'idle' }) {
  // simple SVG robot mascot with blinking eyes and bob animation
  const isLeft = side === 'left'
  return (
    <div className={`pointer-events-none absolute ${isLeft ? 'left-4 sm:left-8' : 'right-4 sm:right-8'} bottom-24 sm:bottom-12 select-none`}
         style={{ filter: 'drop-shadow(0 6px 30px rgba(56,189,248,0.25))' }}>
      <div className={`relative ${mood === 'cheer' ? 'animate-bob-fast' : mood === 'talk' ? 'animate-bob' : 'animate-bob-slow'}`}>
        <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
          <defs>
            <linearGradient id="botBody" x1="0" y1="0" x2="140" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" stopOpacity="0.85" />
              <stop offset="1" stopColor="#a78bfa" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          {/* antenna */}
          <circle cx="70" cy="8" r="6" fill="#22d3ee" opacity="0.7" className="animate-pulse" />
          <rect x="68" y="14" width="4" height="10" rx="2" fill="#7dd3fc" />
          {/* head */}
          <rect x="35" y="26" width="70" height="44" rx="12" fill="url(#botBody)" opacity="0.9" />
          <rect x="40" y="34" width="60" height="28" rx="8" fill="#0ea5e9" opacity="0.3" />
          {/* eyes */}
          <g className="animate-blink">
            <rect x="52" y="40" width="12" height="8" rx="3" fill="#e2e8f0" />
            <rect x="76" y="40" width="12" height="8" rx="3" fill="#e2e8f0" />
          </g>
          {/* mouth */}
          <rect x="60" y="54" width="20" height="4" rx="2" fill="#e0e7ff" opacity="0.8" />
          {/* body */}
          <rect x="30" y="72" width="80" height="36" rx="14" fill="url(#botBody)" opacity="0.65" />
          <rect x="36" y="78" width="68" height="8" rx="4" fill="#67e8f9" opacity="0.35" />
          {/* arms */}
          <rect x="16" y="80" width="16" height="8" rx="4" fill="#38bdf8" opacity="0.6" />
          <rect x="108" y="80" width="16" height="8" rx="4" fill="#a78bfa" opacity="0.6" />
        </svg>
        <div className={`absolute ${isLeft ? 'right-[-6px]' : 'left-[-6px]'} -top-2 px-2 py-1 rounded-md text-[10px] tracking-widest uppercase bg-slate-900/80 border border-white/10 text-cyan-200`}>DDC Bot</div>
      </div>
    </div>
  )
}

function App() {
  const DEFAULT_SECONDS = 12 * 60
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS)
  const [running, setRunning] = useState(false)
  const [ended, setEnded] = useState(false)
  const [flash, setFlash] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [label, setLabel] = useState('Round 1')

  const intervalRef = useRef(null)
  const initialTitle = useRef(document.title)
  const chime = useChime(soundOn)

  const progress = useMemo(() => Math.max(0, Math.min(1, secondsLeft / DEFAULT_SECONDS)), [secondsLeft])

  // background particles (generated once)
  const particles = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => {
      const size = Math.random() * 3 + 1
      const top = Math.random() * 100
      const left = Math.random() * 100
      const dur = 8 + Math.random() * 18
      const delay = -Math.random() * 10
      return { id: i, size, top, left, dur, delay }
    })
  }, [])

  // ticker
  useEffect(() => {
    if (!running) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [running])

  // effects
  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} • DDC Timer`
    if (secondsLeft === 0 && running) setRunning(false)
    if (secondsLeft === 0 && !ended) {
      setEnded(true)
      setFlash(true)
      // celebratory chime
      chime(220, 660, 'triangle')
      setTimeout(() => chime(220, 880, 'triangle'), 260)
      setTimeout(() => chime(520, 1046, 'triangle'), 560)
      setTimeout(() => setFlash(false), 600)
    }
    if (secondsLeft > 0 && ended) setEnded(false)
  }, [secondsLeft])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); reset() }
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen() }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); setSoundOn((s) => !s) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running])

  // fullscreen
  const requestFullscreen = async () => {
    const el = document.documentElement
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    setIsFullscreen(true)
  }
  const exitFullscreen = async () => {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
    setIsFullscreen(false)
  }
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) requestFullscreen()
    else exitFullscreen()
  }

  const toggle = () => setRunning((v) => !v)
  const reset = () => {
    setRunning(false)
    setSecondsLeft(DEFAULT_SECONDS)
    setEnded(false)
    setFlash(false)
    document.title = initialTitle.current
  }

  const setPreset = (m) => {
    setRunning(false)
    setSecondsLeft(m * 60)
    setEnded(false)
  }

  // decorative tick marks
  const ticks = Array.from({ length: 60 })

  // dynamic orbit angle based on progress
  const orbitAngle = useMemo(() => 360 * (1 - progress), [progress])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white selection:bg-cyan-400/30">
      {/* Ambient background */}
      <div className="absolute inset-0 -z-10">
        {/* gradient blobs */}
        <div className="absolute -top-24 -left-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30 bg-cyan-500/30" />
        <div className="absolute -bottom-32 -right-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-20 bg-fuchsia-500/20" />
        {/* animated grid */}
        <div className="absolute inset-0 opacity-[0.08]" style={{backgroundImage:'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize:'32px 32px', animation:'gridShift 22s linear infinite'}}/>
        {/* particle field */}
        {particles.map(p => (
          <div key={p.id} className="absolute rounded-full bg-cyan-300/40"
               style={{
                 width: p.size,
                 height: p.size,
                 top: `${p.top}%`,
                 left: `${p.left}%`,
                 boxShadow: '0 0 10px rgba(34,211,238,0.45)',
                 animation: `floatY ${p.dur}s ease-in-out infinite ${p.delay}s, floatX ${p.dur*1.3}s ease-in-out infinite ${p.delay}s`
               }} />
        ))}
      </div>

      {/* Top bar with marquee */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/40 bg-slate-900/60 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 grid place-items-center shadow-lg shadow-cyan-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M6 3h12v5a6 6 0 1 1-12 0V3Z" stroke="white" strokeWidth="1.5"/><path d="M6 21h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-cyan-300">ACM</div>
              <div className="font-semibold -mt-1">DDC — Drink, Derive & Code</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSoundOn((s)=>!s)} className={`group hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${soundOn ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-500/30 bg-slate-800/60 text-slate-300'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 15v-6h3l5-4v14l-5-4H4Z" stroke="currentColor" strokeWidth="1.5"/><path d="M16 9a3 3 0 0 1 0 6" stroke="currentColor" strokeWidth="1.5"/></svg>
              {soundOn ? 'Sound on' : 'Sound off'}
            </button>
            <button onClick={toggleFullscreen} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-sm hover:bg-cyan-500/20 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
        <div className="h-6 border-t border-white/10 overflow-hidden text-[11px] tracking-[0.2em] uppercase text-cyan-200/80">
          <div className="whitespace-nowrap animate-marquee py-1">
            <span className="mx-6">ACM presents DDC — Drink, Derive & Code</span>
            <span className="mx-6">Robotics • Math • Code • Energy • Teamwork</span>
            <span className="mx-6">Use Space to start/pause • R reset • F fullscreen • M sound</span>
            <span className="mx-6">Good luck, coders!</span>
          </div>
        </div>
      </header>

      {/* Hero with Spline */}
      <section className="relative h-[58vh] md:h-[64vh]">
        <Spline scene="https://prod.spline.design/4TrRyLcIHhcItjnk/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/30 to-slate-950" />
        <div className="absolute inset-0 flex items-end justify-center pb-6 md:pb-10">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-5 py-3 md:px-6 md:py-3.5 shadow-2xl">
            <p className="text-xs md:text-sm tracking-widest uppercase text-cyan-300 text-center">Official Countdown</p>
            <h1 className="text-2xl md:text-4xl font-semibold mt-1 text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300">DDC — Drink, Derive & Code</h1>
          </div>
        </div>
      </section>

      {/* Main timer panel */}
      <main className="mx-auto max-w-7xl px-4 md:px-8 -mt-10 md:-mt-14 relative z-10">
        <div className="grid md:grid-cols-[1fr_360px] gap-6 md:gap-8 items-stretch">
          {/* Timer Card */}
          <div className="relative rounded-3xl p-6 md:p-10 bg-gradient-to-br from-slate-900/70 to-slate-900/30 border border-white/10 shadow-[0_10px_60px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* sheen */}
            <div className="pointer-events-none absolute -inset-1 opacity-25 blur-3xl bg-[radial-gradient(circle_at_20%_20%,#38bdf8,transparent_35%),radial-gradient(circle_at_70%_80%,#a78bfa,transparent_30%)]" />

            {/* scanning beam */}
            <div className="pointer-events-none absolute -inset-x-8 -top-24 h-24 bg-gradient-to-b from-transparent via-cyan-300/10 to-transparent animate-scan" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Circular visual */}
              <div className="relative" style={{ width: 'min(80vw, 540px)', height: 'min(80vw, 540px)' }}>
                {/* background ring */}
                <div className="absolute inset-0 rounded-full bg-slate-800/60" />
                {/* progress arc */}
                <div className="absolute inset-0 rounded-full" style={{background:`conic-gradient(#22d3ee ${Math.round(progress*360)}deg, #0f172a ${Math.round(progress*360)}deg)`}}/>
                {/* inner mask */}
                <div className="absolute inset-[14px] rounded-full bg-slate-950/75 backdrop-blur" />

                {/* orbiting ACM badge */}
                <div className="absolute inset-0">
                  <div className="absolute left-1/2 top-1/2" style={{transform:`rotate(${orbitAngle}deg)`}}>
                    <div className="-translate-x-1/2 -translate-y-1/2" style={{ transform: `translateX(${(Math.min(window.innerWidth, 540) / 2 || 220) - 30}px)` }}>
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 grid place-items-center text-[10px] tracking-wider text-cyan-200 backdrop-blur-sm">
                        ACM
                      </div>
                    </div>
                  </div>
                </div>
                {/* orbiting DDC badge (opposite) */}
                <div className="absolute inset-0">
                  <div className="absolute left-1/2 top-1/2" style={{transform:`rotate(${orbitAngle+180}deg)`}}>
                    <div className="-translate-x-1/2 -translate-y-1/2" style={{ transform: `translateX(${(Math.min(window.innerWidth, 540) / 2 || 220) - 30}px)` }}>
                      <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 grid place-items-center text-[10px] tracking-wider text-fuchsia-200 backdrop-blur-sm">
                        DDC
                      </div>
                    </div>
                  </div>
                </div>

                {/* tick marks */}
                <div className="absolute inset-[6px] rounded-full">
                  {ticks.map((_, i) => (
                    <div key={i} className="absolute left-1/2 top-1/2 origin-[0_center]" style={{transform:`rotate(${i*6}deg) translateX(240px)`}}>
                      <div className={`h-[10px] w-[2px] ${i%5===0?'bg-cyan-300/70 h-[14px]':'bg-white/15'}`}/>
                    </div>
                  ))}
                </div>

                {/* time */}
                <div className="absolute inset-0 grid place-items-center select-none">
                  <div className="text-[18vw] md:text-[8rem] leading-none font-extrabold tracking-tight tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300 drop-shadow-[0_2px_20px_rgba(34,211,238,0.15)]">
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="mt-2 text-slate-400 text-sm md:text-base">{label}</div>
                </div>
              </div>

              {/* linear progress + sound visualizer */}
              <div className="w-full mt-8">
                <div className="h-2 rounded-full bg-slate-800/70 overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-[width] duration-500" style={{ width: `${progress*100}%` }} />
                </div>
                {soundOn && (
                  <div className="mt-3 flex items-end justify-center gap-1 h-5">
                    {Array.from({length: 24}).map((_,i)=> (
                      <div key={i} className="w-1 rounded-full bg-cyan-400/70 animate-bars" style={{animationDelay:`${i*0.04}s`}} />
                    ))}
                  </div>
                )}
              </div>

              {/* Controls Row */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4">
                <button onClick={toggle} className={`px-6 py-2.5 rounded-xl font-semibold shadow transition-all border ${running ? 'bg-rose-500/90 hover:bg-rose-500 border-rose-400/40' : 'bg-emerald-500/90 hover:bg-emerald-500 border-emerald-400/40'} text-white`}>{running ? 'Pause' : 'Start'}</button>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl font-semibold shadow transition-all bg-slate-800/70 hover:bg-slate-800 border border-white/10">Reset</button>
                <button onClick={() => setSecondsLeft((s)=>Math.max(0,s-60))} className="px-4 py-2.5 rounded-xl font-semibold shadow transition-all bg-slate-800/70 hover:bg-slate-800 border border-white/10">-1:00</button>
                <button onClick={() => setSecondsLeft((s)=>Math.min(60*99,s+60))} className="px-4 py-2.5 rounded-xl font-semibold shadow transition-all bg-slate-800/70 hover:bg-slate-800 border border-white/10">+1:00</button>
                <button onClick={() => setSoundOn(s=>!s)} className={`px-4 py-2.5 rounded-xl font-semibold shadow transition-all border ${soundOn?'border-emerald-400/40 bg-emerald-500/10 text-emerald-200':'border-slate-500/30 bg-slate-800/60 text-slate-300'}`}>{soundOn?'Sound On':'Sound Off'}</button>
              </div>

              {/* Presets */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {[12,10,8,5,3].map((m)=> (
                  <button key={m} onClick={() => setPreset(m)} className="px-3 py-1.5 rounded-lg text-sm border border-white/10 bg-slate-800/60 hover:bg-slate-800/80 transition">{m}:00</button>
                ))}
                <input value={label} onChange={(e)=>setLabel(e.target.value)} className="ml-2 px-3 py-1.5 rounded-lg text-sm bg-slate-800/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/40" placeholder="Label (e.g., Round 1)" />
              </div>

              <div className="mt-4 text-xs md:text-sm text-slate-400 text-center">Shortcuts: Space = Start/Pause • R = Reset • F = Fullscreen • M = Toggle Sound</div>
            </div>

            {/* flash on finish */}
            {flash && <div className="pointer-events-none absolute inset-0 bg-white/70 animate-[fade_600ms_ease]" />}
          </div>

          {/* Sidebar / Event Info */}
          <aside className="rounded-3xl p-6 bg-gradient-to-br from-slate-900/70 to-slate-900/30 border border-white/10 shadow-[0_10px_60px_rgba(0,0,0,0.45)] flex flex-col">
            <h3 className="text-xl font-semibold">Event Control</h3>
            <p className="text-slate-300 text-sm leading-relaxed mt-2">Professional countdown for the ACM event: <span className="font-semibold text-cyan-300">DDC — Drink, Derive & Code</span>. Present in fullscreen for the audience. Adjust time with presets or minute steppers.</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                <div className="text-slate-400">Duration</div>
                <div className="font-semibold">{formatTime(secondsLeft)}</div>
              </div>
              <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                <div className="text-slate-400">Mode</div>
                <div className="font-semibold">Single Round</div>
              </div>
              <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                <div className="text-slate-400">Sound</div>
                <div className="font-semibold">{soundOn ? 'Enabled' : 'Muted'}</div>
              </div>
              <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                <div className="text-slate-400">Status</div>
                <div className="font-semibold">{running ? 'Running' : 'Paused'}</div>
              </div>
            </div>

            <a href="/test" className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 px-4 py-2 text-sm font-semibold">System Check</a>
            <div className="mt-3 text-[11px] text-slate-500">Tip: If projecting, enable fullscreen and increase browser zoom for even larger digits.</div>
          </aside>
        </div>
      </main>

      {/* robots */}
      <Robot side="left" mood={ended ? 'cheer' : running ? 'talk' : 'idle'} />
      <Robot side="right" mood={ended ? 'cheer' : running ? 'talk' : 'idle'} />

      <footer className="mx-auto max-w-7xl px-4 md:px-8 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ACM • DDC — Drink, Derive & Code
      </footer>

      <style>{`
        @keyframes fade{0%{opacity:0}10%{opacity:1}100%{opacity:0}}
        @keyframes floatY{0%,100%{transform:translateY(-10px)}50%{transform:translateY(10px)}}
        @keyframes floatX{0%,100%{transform:translateX(-6px)}50%{transform:translateX(6px)}}
        @keyframes gridShift {0%{background-position:0 0,0 0}100%{background-position:0 32px,32px 0}}
        @keyframes scan {0%{transform:translateY(-120%)}100%{transform:translateY(220%)} }
        @keyframes bob-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes bob-fast{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(0.15)}}
        .animate-scan{animation:scan 6s linear infinite}
        .animate-bob-slow{animation:bob-slow 4.5s ease-in-out infinite}
        .animate-bob{animation:bob 3.5s ease-in-out infinite}
        .animate-bob-fast{animation:bob-fast 2.6s ease-in-out infinite}
        .animate-blink{transform-origin:50% 50%; animation:blink 4.2s linear infinite}
        @keyframes bars{0%{height:4px}50%{height:100%}100%{height:4px}}
        .animate-bars{animation:bars 1.3s ease-in-out infinite}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        .animate-marquee{display:inline-block; min-width:200%; animation:marquee 24s linear infinite}
      `}</style>
    </div>
  )
}

export default App
