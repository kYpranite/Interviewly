import React, { useEffect, useRef, useState } from 'react'

function useActiveSpeaker() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    // Mock speaking pattern: on 2s, off 2s
    const iv = setInterval(() => setActive(a => !a), 2000)
    return () => clearInterval(iv)
  }, [])
  return active
}

export default function CallTile({ name, title }) {
  const active = useActiveSpeaker()
  const ringRef = useRef(null)

  useEffect(() => {
    const el = ringRef.current
    if (!el) return
    el.animate([
      { boxShadow: '0 0 0 0 rgba(58,160,255,0.6)' },
      { boxShadow: '0 0 0 14px rgba(58,160,255,0)' }
    ], {
      duration: 600,
      iterations: active ? Infinity : 1,
      direction: 'alternate',
      easing: 'ease-out'
    })
  }, [active])

  return (
    <div className="call-tile" aria-live="polite">
      <div className="call-video" style={{outline: active ? '2px solid #3aa0ff' : '2px solid transparent'}}>
        <div ref={ringRef} className="call-ring" style={{boxShadow:'0 0 0 0 rgba(58,160,255,0)'}} />
      </div>
      <div className="call-meta">
        <div className="call-name">
          <strong>{name}</strong>
          <span>{title}</span>
        </div>
        <div className="mic-dot" title={active ? 'Speaking' : 'Muted'} style={{background: active ? '#3aa0ff' : '#555'}} />
      </div>
    </div>
  )
}
