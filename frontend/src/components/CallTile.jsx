import React, { useEffect, useRef, useState } from 'react'
import './CallTile.css'

function useActiveSpeaker() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    // Mock speaking pattern: on 2s, off 2s
    const iv = setInterval(() => setActive(a => !a), 2000)
    return () => clearInterval(iv)
  }, [])
  return active
}

export default function CallTile({
  name,
  title,
  initialX = 24,
  initialY = 24
}) {
  const active = useActiveSpeaker()
  const ringRef = useRef(null)
  const wrapRef = useRef(null)
  const [hidden, setHidden] = useState(false)
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const [drag, setDrag] = useState({ grabbing: false, dx: 0, dy: 0 })
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join('') || 'EH'

  useEffect(() => {
    const el = ringRef.current
    if (!el) return
    el.animate([
      { boxShadow: '0 0 0 0 rgba(58,160,255,0.6)' },
      { boxShadow: '0 0 0 14px rgba(58,160,255,0)' }
    ], {
      duration: 700,
      iterations: active ? Infinity : 1,
      direction: 'alternate',
      easing: 'ease-out'
    })
  }, [active])

  useEffect(() => {
    function onMove(e) {
      if (!drag.grabbing) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const x = clientX - drag.dx
      const y = clientY - drag.dy
      // keep in viewport bounds
      const w = wrapRef.current?.offsetWidth || 0
      const h = wrapRef.current?.offsetHeight || 0
      const maxX = window.innerWidth - w - 8
      const maxY = window.innerHeight - h - 8
      setPos({ x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) })
    }
    function onUp() { setDrag(d => ({ ...d, grabbing: false })) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [drag.grabbing, drag.dx, drag.dy])

  function onDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const rect = wrapRef.current?.getBoundingClientRect()
    const dx = clientX - (rect?.left ?? 0)
    const dy = clientY - (rect?.top ?? 0)
    setDrag({ grabbing: true, dx, dy })
  }

  if (hidden) return null

  return (
    <div
      ref={wrapRef}
      className={`call-wrap ${drag.grabbing ? 'grabbing' : ''}`}
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      role="dialog"
      aria-label={`${name} – ${title}`}
    >
      <div className="call-card" onMouseDown={onDown} onTouchStart={onDown}>
        <button className="close-btn" aria-label="Close" onClick={() => setHidden(true)}>×</button>
        <div className="speaking-pill" aria-hidden={!active} style={{ opacity: active ? 1 : 0.6 }}>
          <span className="dot" /> Speaking
        </div>
        <div className={`avatar ${active ? 'active' : ''}`}>
          <div ref={ringRef} className="ring" />
          <div className="avatar-fallback" aria-hidden>
            <div className="initials">{initials}</div>
          </div>
        </div>
        <div className="meta">
          <div className="name">{name}</div>
          <div className="title">{title}</div>
        </div>
      </div>
    </div>
  )
}
