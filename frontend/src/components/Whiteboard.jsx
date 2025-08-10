import React, { useEffect, useRef, useState } from 'react'

export default function Whiteboard() {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#fff')
  const [size, setSize] = useState(3)
  const isDrawing = useRef(false)
  const prev = useRef({x:0,y:0})

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * ratio
      canvas.height = canvas.clientHeight * ratio
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  const drawTo = (x, y) => {
    const ctx = canvasRef.current.getContext('2d')
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(prev.current.x, prev.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    prev.current = {x,y}
  }

  const onDown = (e) => {
    isDrawing.current = true
    const rect = canvasRef.current.getBoundingClientRect()
    prev.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const onMove = (e) => {
    if (!isDrawing.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    drawTo(e.clientX - rect.left, e.clientY - rect.top)
  }
  const onUp = () => { isDrawing.current = false }

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0,0,canvasRef.current.width, canvasRef.current.height)
  }

  return (
    <div className="whiteboard-wrap">
      <div className="whiteboard-toolbar">
        <button className="btn btn--sm btn--ghost" onClick={() => setTool('pen')} style={{background: tool==='pen'?'#0e639c':'transparent'}}>Pen</button>
        <button className="btn btn--sm btn--ghost" onClick={() => setTool('eraser')} style={{background: tool==='eraser'?'#0e639c':'transparent'}}>Eraser</button>
        <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} style={{marginLeft:8, background:'transparent', border:'none'}} />
        <input type="range" min={1} max={16} value={size} onChange={(e)=>setSize(Number(e.target.value))} />
        <button className="btn btn--sm btn--outline" onClick={clear}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      />
    </div>
  )
}
