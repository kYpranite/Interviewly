import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CodeEditor from "../components/CodeEditor";
import ProblemPanel from "../components/ProblemPanel";
import CallTile from "../components/CallTile";
import VoicePanel from "../components/VoicePanel";
import { useQuestions } from "../hooks/useFirestore";
import { evaluateInterview, runCode } from "../api";
import "./code.css";

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

    // Use useRef to store interview start time (doesn't trigger re-renders)
    const interviewStartTime = useRef(new Date().toISOString());

    const handleEndInterview = async () => {
        setIsEvaluating(true);
        try {
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
                const q = await getRandomQuestion();
                if (alive) setQuestion(q);
            } catch (error) {
                console.error("Error fetching random question:", error);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

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
                            <VoicePanel
                                onAiSpeakingChange={setAiSpeaking}
                                onTranscriptChange={setTranscript}
                                question={question}
                            />
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
