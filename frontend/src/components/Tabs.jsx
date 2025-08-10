import React from 'react'

export default function Tabs({ active, onChange }) {
  const tabs = [
    { id: 'code', label: 'Code' },
    { id: 'notebook', label: 'Notebook' },
    { id: 'whiteboard', label: 'Whiteboard' },
  ]

  return (
    <div className="tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
