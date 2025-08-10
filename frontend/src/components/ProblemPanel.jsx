import React from 'react';
import './ProblemPanel.css';

function Examples({ examples }) {
  if (!examples || examples.length === 0) {
    return (
      <div className="examples">
        <div className="example-card">
          <div className="example-title">No examples available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="examples">
      {examples.map((ex, idx) => (
        <div className="example-card" key={idx}>
          <div className="example-title">Example {idx + 1}:</div>
          <div className="kv"><span className="k">Input:</span> <span className="v">{ex.input}</span></div>
          <div className="kv"><span className="k">Output:</span> <span className="v">{ex.output}</span></div>
          {ex.explanation && (
            <div className="kv"><span className="k">Explanation:</span> <span className="v">{ex.explanation}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProblemPanel({ question }) {
  const title = question?.title || 'Two Sum';
  const difficulty = (question?.difficulty || 'Easy').toString();
  const statement = question?.prompt || 'Two Sum';
  return (
    <div className="problem-panel">
      <div className="problem-header">
        <div className="problem-title">{title}</div>
        <div className={`difficulty-badge ${difficulty.toLowerCase()}`}>{difficulty}</div>
      </div>

      <div className="section">
        <div className="section-title">Problem Statement</div>
        <div className="statement" dangerouslySetInnerHTML={{ __html: statement }} />
      </div>

      <div className="section">
        <div className="section-title">Examples</div>
        <Examples examples={question?.examples} />
      </div>

    </div>
  );
}
