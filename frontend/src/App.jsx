import { useEffect, useMemo, useState } from 'react'
import './App.css'
import CodeEditor from './components/CodeEditor'
import { useQuestions } from './hooks/useFirestore'
import ProblemPanel from './components/ProblemPanel'
import CallTile from './components/CallTile'

function App() {
  const { getRandomQuestion } = useQuestions();
  const [question, setQuestion] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(45 * 60); // 45 minutes

  useEffect(() => {
    const fetchRandomQuestion = async () => {
      try {
        const q = await getRandomQuestion();
        setQuestion(q);
      } catch (error) {
        console.error('Error fetching random question:', error);
      }
    };

    fetchRandomQuestion();
  }, []);

  // simple countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const timeDisplay = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, '0');
    const s = (secondsLeft % 60).toString().padStart(2, '0');
    return `${m}:${s} remaining`;
  }, [secondsLeft]);

  return (
    <div className="app">
  <CallTile name="Ethan Huang" title="Senior Engineer" />
      <header className="app-header">
        <h1 className="app-title">Technical Interview</h1>
        <span className="timer-badge" aria-live="polite">{timeDisplay}</span>
      </header>

      <main className="content-grid">
        <aside className="left-panel">
          <ProblemPanel question={question} />
        </aside>
        <section className="right-panel">
          {question ? (
            <CodeEditor question={question} />
          ) : (
            <div aria-busy="true" aria-live="polite">Loading question…</div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
