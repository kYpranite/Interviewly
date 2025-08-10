import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CodeEditor from "../components/CodeEditor";
import ProblemPanel from "../components/ProblemPanel";
import CallTile from "../components/CallTile";
import VoicePanel from "../components/VoicePanel";
import { useQuestions } from "../hooks/useFirestore";
import "./code.css";

export default function CodePage() {
  const { getRandomQuestion } = useQuestions();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(45 * 60); // 45 minutes
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);

  const handleEndInterview = () => {
    if (window.confirm("Are you sure you want to end the interview?")) {
      // Save the entire transcript to a variable
      const interviewTranscript = transcript;
      
      // Here you can do something with the transcript, such as:
      const jsonTranscript = JSON.stringify(interviewTranscript)
      console.log("Interview transcript:", interviewTranscript);
      
      
      navigate("/");
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const q = await getRandomQuestion();
        if (alive) setQuestion(q);
      } catch (error) {
        console.error("Error fetching random question:", error);
      }
    })();
    return () => { alive = false; };
  }, [getRandomQuestion]);

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      alert("Time's up! The interview has ended.");
      navigate("/");
    }
  }, [secondsLeft, navigate]);

  const timeDisplay = useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s} remaining`;
  }, [secondsLeft]);

  return (
    <div className="code-page">
      <CallTile
        name="LeBron James"
        title="Principal Engineer"
        active={aiSpeaking}
        // Optionally set a default LeBron image URL here
        // avatarUrl="/lebron.jpg"
      />
      <Navbar />

      <main className="content">
        <header className="page-header">
          <h1 className="page-title">Technical Interview</h1>
          <div className="header-controls">
            <span className="timer" aria-live="polite">{timeDisplay}</span>
            <button 
              className="end-interview-btn" 
              onClick={handleEndInterview}
              aria-label="End interview"
            >
              End Interview
            </button>
          </div>
        </header>

        <div className="grid">
          <aside className="left">
            <ProblemPanel question={question} />
          </aside>
          <section className="right">
            <div style={{ marginBottom: "0.75rem" }}>
              <VoicePanel 
                onAiSpeakingChange={setAiSpeaking} 
                onTranscriptChange={setTranscript}
                question={question}
              />
            </div>
            {question ? (
              <CodeEditor question={question} />
            ) : (
              <div aria-busy="true" aria-live="polite">Loading question…</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
