import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CodeEditor from "../components/CodeEditor";
import ProblemPanel from "../components/ProblemPanel";
import CallTile from "../components/CallTile";
import { useQuestions } from "../hooks/useFirestore";
import { evaluateInterview, runCode } from "../api";
import "./code.css";
import { STTManager } from "../speechSTT";
import { speakText, stopSpeaking } from "../speechTTS";
import { sendToAI } from "../api";
import { getClientId } from "../clientId";

export default function CodePage() {
    const { getRandomQuestion } = useQuestions();
    const navigate = useNavigate();
    const [question, setQuestion] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(45 * 60); // 45 minutes
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const codeEditorRef = useRef(null);
    const [selectedLanguage, setSelectedLanguage] = useState("python");
    const hasFetchedQuestionRef = useRef(false);
    const sttRef = useRef(null);
    const speakGenRef = useRef(0);
    const turnsRef = useRef(transcript);
    useEffect(() => { turnsRef.current = transcript; }, [transcript]);

    // Use useRef to store interview start time (doesn't trigger re-renders)
    const interviewStartTime = useRef(new Date().toISOString());

    const handleEndInterview = async () => {
        setIsEvaluating(true);
        try {
            // Stop any ongoing voice activity immediately
            try { await sttRef.current?.stop?.(); } catch (_) {}
            try { await stopSpeaking(); } catch (_) {}
            // Get the current code from the editor
            const currentCode = codeEditorRef.current?.getValue?.() || "";

            if (!currentCode.trim()) {
                alert(
                    "No code has been written. Please write some code before ending the interview."
                );
                setIsEvaluating(false);
                return;
            }

            // Run the code to get test results
            console.log("Running final code execution...");
            const testResults = await runCode(
                currentCode,
                selectedLanguage,
                question
            );

            // Send evaluation request
            console.log("Sending evaluation request...");
            const evaluationResponse = await evaluateInterview({
                transcript: transcript,
                codeSubmission: currentCode,
                language: selectedLanguage,
                testResults: testResults,
                // Send the question as-is; backend will handle any missing fields with defaults
                question,
                interviewStartTime: interviewStartTime.current,
            });

            console.log("Evaluation completed:", evaluationResponse);

            // Navigate to results page with evaluation data
            // Clear the persisted question so a new interview gets a new one
            try { sessionStorage.removeItem('activeQuestion'); } catch {}
            navigate("/results", {
                state: {
                    evaluation: evaluationResponse.evaluation,
                    interviewStartTime: interviewStartTime.current, // Use the actual start time from ref
                    questionId: question?.id,
                    question_title: question?.title || "Unknown Problem",
                    language: selectedLanguage,
                    testResults: testResults,
                    interviewDuration: (45 * 60 - secondsLeft) / 60, // in minutes
                    code: currentCode,
                    transcript: transcript,
                },
            });
        } catch (error) {
            console.error("Error during interview evaluation:", error);
            alert(`Failed to evaluate interview: ${error.message}`);
            setIsEvaluating(false);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                // First try to restore any active question for this interview
                if (!hasFetchedQuestionRef.current) {
                    const stored = sessionStorage.getItem('activeQuestion');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (alive && parsed) {
                            setQuestion(parsed);
                            hasFetchedQuestionRef.current = true;
                            return;
                        }
                    }
                }

                // If none stored and not yet fetched, fetch once
                if (!hasFetchedQuestionRef.current) {
                    const q = await getRandomQuestion();
                    if (alive) {
                        setQuestion(q);
                        hasFetchedQuestionRef.current = true;
                        // Persist for the duration of the interview
                        try { sessionStorage.setItem('activeQuestion', JSON.stringify(q)); } catch {}
                    }
                }
            } catch (error) {
                console.error("Error fetching random question:", error);
            }
        })();
        return () => {
            alive = false;
        };
    }, [getRandomQuestion]);

    useEffect(() => {
        const id = setInterval(
            () => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)),
            1000
        );
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (secondsLeft === 0) {
            alert("Time's up! The interview has ended.");
            handleEndInterview();
        }
    }, [secondsLeft]);

    const timeDisplay = useMemo(() => {
        const m = Math.floor(secondsLeft / 60)
            .toString()
            .padStart(2, "0");
        const s = (secondsLeft % 60).toString().padStart(2, "0");
        return `${m}:${s} remaining`;
    }, [secondsLeft]);

    // Auto-start STT/TTS once a question is established
    useEffect(() => {
        let mounted = true;
        if (!question || sttRef.current) return;
        const stt = new STTManager();
        sttRef.current = stt;
        stt.onRunningChange = (v) => { if (mounted) setAiSpeaking((prev) => prev && v ? prev : prev && !v ? false : prev); };
        // Avoid echo loop: when partial user speech is detected, stop TTS immediately
        stt.onPartial = async (text) => {
            if (text && text.trim()) {
                speakGenRef.current += 1;
                setAiSpeaking(false);
                try { await stopSpeaking(); } catch (_) {}
            }
        };
        stt.onFinalResult = async (text) => {
            if (!mounted) return;
            setTranscript((t) => [...t, { role: 'user', content: text }]);
            try {
                const hist = turnsRef.current;
                const { text: aiText } = await sendToAI([...hist, { role: 'user', content: text }], getClientId());
                const out = (aiText || '').trim();
                if (!mounted) return;
                setTranscript((t) => [...t, { role: 'ai', content: out }]);
                if (out) {
                    const myGen = ++speakGenRef.current;
                    await new Promise((resolve) => {
                        speakText(out, {
                            onStart: () => { if (speakGenRef.current === myGen) setAiSpeaking(true); },
                            onEnd: () => { if (speakGenRef.current === myGen) setAiSpeaking(false); resolve(); },
                            onError: () => { if (speakGenRef.current === myGen) setAiSpeaking(false); resolve(); },
                        });
                    });
                } else {
                    setAiSpeaking(false);
                }
            } catch (e) {
                console.error('AI or TTS error', e);
                setAiSpeaking(false);
            }
        };
        (async () => {
            try { await stt.start('en-US'); } catch (e) { console.error('Failed to start STT', e); }
        })();
        return () => {
            mounted = false;
            try { sttRef.current?.stop?.(); } catch (_) {}
            sttRef.current = null;
            try { stopSpeaking(); } catch (_) {}
        };
    }, [question]);

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
                        <span className="timer" aria-live="polite">
                            {timeDisplay}
                        </span>
                        <button
                            className={`btn btn--danger ${
                                isEvaluating ? "evaluating" : ""
                            }`}
                            onClick={() => {
                                if (
                                    window.confirm(
                                        "Are you sure you want to end the interview?"
                                    )
                                ) {
                                    handleEndInterview();
                                }
                            }}
                            disabled={isEvaluating}
                            aria-label="End interview"
                        >
                            {isEvaluating ? "Evaluating..." : "End Interview"}
                        </button>
                    </div>
                </header>

                <div className="grid">
                    <aside className="left">
                        <ProblemPanel question={question} />
                    </aside>
                    <section className="right">
                        <div style={{ marginBottom: "0.75rem" }}>
                            {/* VoicePanel removed; STT/TTS now auto-run in background */}
                        </div>
                        {question ? (
                            <CodeEditor
                                question={question}
                                ref={codeEditorRef}
                                onLanguageChange={setSelectedLanguage}
                            />
                        ) : (
                            <div aria-busy="true" aria-live="polite">
                                Loading question…
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
