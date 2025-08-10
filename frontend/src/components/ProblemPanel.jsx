import React from 'react';
import './ProblemPanel.css';

function Examples() {
  const examples = [
    {
      title: 'Example 1:',
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation:
        'Because nums[0] + nums[1] == 9, we return [0, 1].',
    },
    {
      title: 'Example 2:',
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
      explanation:
        'Because nums[1] + nums[2] == 6, we return [1, 2].',
    },
    {
      title: 'Example 3:',
      input: 'nums = [3,3], target = 6',
      output: '[0,1]',
      explanation: undefined,
    },
  ];
  return (
    <div className="examples">
      {examples.map((ex, idx) => (
        <div className="example-card" key={idx}>
          <div className="example-title">{ex.title}</div>
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
  const statement =
    question?.description ||
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.';

  return (
    <div className="problem-panel">
      <div className="problem-header">
        <div className="problem-title">{title}</div>
        <div className={`difficulty-badge ${difficulty.toLowerCase()}`}>{difficulty}</div>
      </div>

      <div className="section">
        <div className="section-title">Problem Statement</div>
        <p className="statement">{statement}</p>
      </div>

      <div className="section">
        <div className="section-title">Examples</div>
        <Examples />
      </div>
    </div>
  );
}
