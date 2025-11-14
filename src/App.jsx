import { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function useBeep() {
  const ctxRef = useRef(null)
  const beep = (duration = 600, frequency = 880) => {
    try {
      const ctx = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)()
      ctxRef.current = ctx
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.setValueAtTime(frequency, ctx.currentTime)
      g.gain.setValueAtTime(0.001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + duration / 1000)
    } catch (e) {
      // ignore audio errors
    }
  }
  return beep
}

function App() {
  const INITIAL = 12 * 60 // 12 minutes in seconds
  const [secondsLeft, setSecondsLeft] = useState(INITIAL)
  const [running, setRunning] = useState(false)
  const [ended, setEnded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const intervalRef = useRef(null)
  const pageTitleRef = useRef(document.title)
  const beep = useBeep()

  // Progress (1 to 0)
  const progress = useMemo(() => Math.max(0, Math.min(1, secondsLeft / INITIAL)), [secondsLeft])

  // Tick
  useEffect(() => {
    if (!running) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [running])

  // When reaches zero
  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} • DDC Timer`
    if (secondsLeft === 0) {
      setRunning(false)
      if (!ended) {
        // three beeps
        beep(250, 880)
        setTimeout(() => beep(250, 660), 300)
        setTimeout(() => beep(600, 1046), 650)
      }
      setEnded(true)
    } else {
      setEnded(false)
    }
    return () => {
      // restore title on unmount
      if (secondsLeft > 0) return
    }
  }, [secondsLeft])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        reset()
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, secondsLeft])

  const toggle = () => setRunning((v) => !v)
  const reset = () => {
    setRunning(false)
    setSecondsLeft(INITIAL)
    setEnded(false)
    document.title = pageTitleRef.current
  }

  const addMinute = () => setSecondsLeft((s) => Math.min(INITIAL, s + 60))
  const minusMinute = () => setSecondsLeft((s) => Math.max(0, s - 60))

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

  const gradient = `conic-gradient(var(--p) 0, #1e293b 0)`

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col">
      {/* Hero with Spline */}
      <section className="relative w-full h-[70vh] md:h-[75vh] overflow-hidden">
        <Spline scene="https://prod.spline.design/4TrRyLcIHhcItjnk/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        {/* Overlay gradients and title */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/30 to-slate-950"></div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end p-6 md:p-10">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-5 py-3 md:px-6 md:py-3.5 shadow-lg">
            <p className="text-xs md:text-sm tracking-widest uppercase text-sky-300">ACM Presents</p>
            <h1 className="text-2xl md:text-4xl font-semibold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300">DDC — Drink, Derive & Code</h1>
          </div>
        </div>
      </section>

      {/* Timer Section */}
      <section className="flex-1 w-full flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center md:items-stretch gap-6">
          {/* Big timer card */}
          <div className="flex-1 relative">
            <div className={`relative rounded-3xl p-6 md:p-10 bg-gradient-to-br from-slate-900/70 to-slate-900/30 border border-white/10 shadow-2xl overflow-hidden ${ended ? 'animate-pulse' : ''}`}>
              {/* Glow */}
              <div className="pointer-events-none absolute -inset-1 opacity-30 blur-3xl bg-[radial-gradient(circle_at_30%_20%,#38bdf8,transparent_35%),radial-gradient(circle_at_70%_80%,#a78bfa,transparent_30%)]"></div>

              <div className="relative z-10 grid place-items-center">
                {/* Circular progress */}
                <div className="relative" style={{ width: 'min(70vw, 520px)', height: 'min(70vw, 520px)' }}>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#22d3ee ${Math.round(progress * 360)}deg, #0b1220 ${Math.round(progress * 360)}deg)`
                    }}
                  />
                  <div className="absolute inset-[12px] rounded-full bg-slate-950/70 backdrop-blur" />

                  {/* Time */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                    <div className="text-[18vw] md:text-[8rem] leading-none font-bold tracking-tight tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300">
                      {formatTime(secondsLeft)}
                    </div>
                    <div className="mt-2 text-slate-400 text-sm md:text-base">Official DDC round timer</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  <button onClick={toggle} className={`px-6 py-2.5 rounded-xl font-semibold shadow transition-all border ${running ? 'bg-rose-500/90 hover:bg-rose-500 border-rose-400/40' : 'bg-emerald-500/90 hover:bg-emerald-500 border-emerald-400/40'} text-white`}>{running ? 'Pause' : 'Start'}</button>
                  <button onClick={reset} className="px-5 py-2.5 rounded-xl font-semibold shadow transition-all bg-slate-800/70 hover:bg-slate-800 border border-white/10">Reset</button>
                  <button onClick={minusMinute} className="px-4 py-2.5 rounded-xl font-semibold shadow transition-all bg-slate-800/70 hover:bg-slate-800 border border-white/10">-1:00</button>
                  <button onClick={addMinute} className="px-4 py-2.5 rounded-xl font-semibold shadow transition-all bg-slate-800/70 hover:bg-slate-800 border border-white/10">+1:00</button>
                  <button onClick={toggleFullscreen} className="px-4 py-2.5 rounded-xl font-semibold shadow transition-all bg-sky-600/90 hover:bg-sky-600 border border-sky-400/40 text-white">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
                </div>

                {/* Shortcuts */}
                <div className="mt-5 text-xs md:text-sm text-slate-400 text-center">Space: Start/Pause • R: Reset • F: Fullscreen</div>
              </div>
            </div>
          </div>

          {/* Event details card */}
          <div className="md:w-[360px] w-full">
            <div className="rounded-3xl h-full p-6 bg-gradient-to-br from-slate-900/70 to-slate-900/30 border border-white/10 shadow-xl flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Event Details</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Countdown for the ACM club event: <span className="font-semibold text-sky-300">DDC — Drink, Derive & Code</span>.
                Share the screen to keep everyone in sync. When time hits zero, the timer will alert with a chime and a subtle flash.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                  <div className="text-slate-400">Duration</div>
                  <div className="font-semibold">12:00</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                  <div className="text-slate-400">Mode</div>
                  <div className="font-semibold">Single Round</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                  <div className="text-slate-400">Controls</div>
                  <div className="font-semibold">Space / R / F</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
                  <div className="text-slate-400">Visual</div>
                  <div className="font-semibold">Arc Progress</div>
                </div>
              </div>

              <div className="mt-6 text-xs text-slate-400">
                Tip: You can adjust minutes with the +1:00 and -1:00 buttons before or during the round.
              </div>

              <a href="/test" className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-white/10 px-4 py-2 text-sm font-semibold">System Check</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full py-6 text-center text-xs text-slate-500">
        Built for ACM: DDC — Drink, Derive & Code
      </footer>
    </div>
  )
}

export default App
