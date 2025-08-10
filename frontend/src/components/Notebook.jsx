import React, { useState } from 'react'

export default function Notebook() {
  const [cells, setCells] = useState([
    { type: 'markdown', content: '# Notes\nSummarize your approach here.' },
  ])

  const addCell = (type) => {
    setCells(prev => [...prev, { type, content: type === 'markdown' ? 'New note' : '' }])
  }

  const update = (i, value) => {
    setCells(prev => prev.map((c, idx) => idx === i ? { ...c, content: value } : c))
  }

  return (
    <div className="notebook">
      <div className="nb-toolbar">
        <button className="btn btn--sm btn--outline" onClick={() => addCell('markdown')} type="button">+ Text</button>
        <button className="btn btn--sm btn--outline" onClick={() => addCell('code')} type="button">+ Code (pseudo)</button>
      </div>
      <div className="nb-content">
        {cells.map((cell, i) => (
          <div key={i} className="nb-cell" style={{marginBottom:10}}>
            {cell.type === 'markdown' ? (
              <textarea
                value={cell.content}
                onChange={(e) => update(i, e.target.value)}
                style={{width:'100%', minHeight:100, background:'#111', color:'#ddd', border:'1px solid #2a2a2a', borderRadius:6, padding:8}}
              />
            ) : (
              <textarea
                placeholder={'Write pseudo code...'}
                value={cell.content}
                onChange={(e) => update(i, e.target.value)}
                style={{width:'100%', minHeight:100, background:'#0e0e0e', color:'#d4d4d4', border:'1px solid #333', borderRadius:6, padding:8, fontFamily:'"Fira Code", monospace'}}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
