import React from 'react'

const sample = {
  title: 'Two Sum',
  time: '45 min',
  body: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  examples: [
    {
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
      explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
    },
  ],
}

export default function ProblemDescription() {
  return (
    <div className="problem-panel">
      <div className="problem-header">
        <div className="problem-title">{sample.title} <span style={{color:'#8a8a8a', fontWeight:400}}>• {sample.time}</span></div>
      </div>
      <div className="problem-body">
        <section style={{marginBottom:12}}>
          <h3 style={{fontSize:14, margin:'0 0 6px 0'}}>Problem Statement</h3>
          <p style={{whiteSpace:'pre-wrap'}}>{sample.body}</p>
        </section>

        <section>
          <h3 style={{fontSize:14, margin:'0 0 6px 0'}}>Examples</h3>
          {sample.examples.map((ex, idx) => (
            <div key={idx} style={{border:'1px solid #2a2a2a', borderRadius:8, padding:10, marginBottom:8, background:'#121212'}}>
              <div style={{color:'#8ad'}}><strong>Example {idx+1}:</strong></div>
              <div style={{marginTop:6}}>
                <div style={{color:'#9ad'}}>Input:</div>
                <pre style={{margin:0, color:'#ddd'}}>{ex.input}</pre>
              </div>
              <div style={{marginTop:6}}>
                <div style={{color:'#9ad'}}>Output:</div>
                <pre style={{margin:0, color:'#ddd'}}>{ex.output}</pre>
              </div>
              <div style={{marginTop:6}}>
                <div style={{color:'#9ad'}}>Explanation:</div>
                <p style={{margin:0, color:'#cfc'}}>{ex.explanation}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
