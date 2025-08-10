import Editor from "@monaco-editor/react";
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { analyzeAIContext, updateAIContext } from "../api";
import { getClientId } from "../clientId";
import LanguageSelector from "./LanguageSelector";
import OutputBox from "./OutputBox";
import "./CodeEditor.css";

const CodeEditor = forwardRef(({ question, onLanguageChange }, ref) => {
    const editorRef = useRef();
    const [selectedLanguage, setSelectedLanguage] = useState("python");
    const [value, setValue] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [activeMode, setActiveMode] = useState("code");
    const lastSentRef = useRef("");
    const lastQuestionKeyRef = useRef(null);
    const clientIdRef = useRef(getClientId());

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        getValue: () => editorRef.current?.getValue?.() || value || "",
        getLanguage: () => selectedLanguage,
        setValue: (newValue) => setValue(newValue),
        reset: () => handleReset()
    }));

    // Convert literal escape sequences ("\n", "\r\n", "\t") into actual characters
    const unescapeTemplate = (s) => {
        if (typeof s !== 'string') return s ?? '';
        return s
            .replaceAll('\\r\\n', '\n')
            .replaceAll('\\n', '\n')
            .replaceAll('\\t', '\t');
    };

    const getDefaultValue = (language) => {
        return unescapeTemplate(question.templates[language]);
    };

    const beforeMount = (monaco) => {
        monaco.editor.defineTheme('interviewly-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#0d0f12',
                'editorGutter.background': '#0d0f12',
                'editorLineNumber.foreground': '#6b7385',
                'editorLineNumber.activeForeground': '#a7b1c9',
                'editor.selectionBackground': '#20304a',
                'editor.inactiveSelectionBackground': '#1a263b',
                'editor.lineHighlightBackground': '#11131a',
                'editorCursor.foreground': '#d4d4d4',
            },
        });
    };

    const onMount = (editor, monaco) => {
        editorRef.current = editor;
        monaco.editor.setTheme('interviewly-dark');
        editor.focus();
    };

    const handleLanguageChange = (newLanguage) => {
        setSelectedLanguage(newLanguage);
        setValue(getDefaultValue(newLanguage));
        onLanguageChange?.(newLanguage);
    };

    const handleModeChange = (mode) => {
        setActiveMode(mode);
    };

    const handleReset = () => {
        setValue(getDefaultValue(selectedLanguage));
        setOutput("");
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput("Running...");
        try {
            const code = editorRef.current?.getValue?.() ?? value ?? "";
                    
            const res = await fetch("/api/code/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    language: selectedLanguage,
                    test_cases: question.test_cases,
                    timeout: question.timeout,
                    checker: question.checker,
                    function: question.function
                })
            });
            console.log(res)
            const result = await res.json();
            setOutput(result?.run?.output || JSON.stringify(result));
        } catch (error) {
            setOutput(`Error: ${error.message}`);
        }
        setIsRunning(false);
    };

    // Initialize the editor value when the question is available or language changes
    useEffect(() => {
        setValue(getDefaultValue(selectedLanguage));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question?.id, selectedLanguage]);

    // Periodically sync context and trigger context-only analysis (every 30s)
    useEffect(() => {
    // Ensure a stable per-tab client id (session-based)
    clientIdRef.current = getClientId();
        let intervalId;

        const sendContext = async () => {
            try {
                const code = editorRef.current?.getValue?.() ?? value ?? "";
                const trimmed = (code || "").trim();
                const hasCode = !!trimmed;
                const qKey = question?.id ?? `${question?.title ?? ''}|${question?.function ?? ''}|${Array.isArray(question?.args) ? question.args.join(',') : ''}`;

                // If no code yet, still send question context once per question change
                if (!hasCode) {
                    if (qKey && lastQuestionKeyRef.current === qKey) return;
                    lastQuestionKeyRef.current = qKey;
                    await updateAIContext({ code, language: selectedLanguage, question }, clientIdRef.current);
                    // Also trigger analysis so Gemini can give guidance based on question alone
                    try { await analyzeAIContext(clientIdRef.current); } catch (_) {}
                    return;
                }

                // Avoid resending identical code content
                if (lastSentRef.current === trimmed) return;
                lastSentRef.current = trimmed;

                // Update server-side context store
                await updateAIContext({ code, language: selectedLanguage, question }, clientIdRef.current);
                // Trigger context-only analysis
                await analyzeAIContext(clientIdRef.current);
            } catch (_) {
                // ignore errors; this is background context syncing
            }
        };

        // Send once immediately, then every 30s
        sendContext();
        intervalId = setInterval(sendContext, 30000);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
        // Recreate interval if the question or language changes (but not on every keystroke)
    }, [question?.id, selectedLanguage]);

    return (
        <div className="code-editor-container">
            <div className="editor-header">
                <div className="mode-tabs" role="tablist">
                    <button 
                        className={`btn btn--sm ${activeMode === "code" ? "btn--primary" : "btn--ghost"}`} 
                        type="button"
                        onClick={() => handleModeChange("code")}
                    >
                        Code
                    </button>
                    <button 
                        className={`btn btn--sm ${activeMode === "notebook" ? "btn--primary" : "btn--ghost"}`} 
                        type="button"
                        onClick={() => handleModeChange("notebook")}
                    >
                        Notebook
                    </button>
                </div>
                <LanguageSelector 
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                />
                <div className="action-buttons">
                    <button 
                        className="btn btn--ghost"
                        onClick={handleReset}
                        type="button"
                    >
                        Reset
                    </button>
                    <button 
                        className="btn btn--cta"
                        onClick={handleRun}
                        disabled={isRunning}
                        type="button"
                    >
                        {isRunning ? "Running..." : "Run"}
                    </button>
                </div>
            </div>
            
            <div className="divider"></div>
            
            {activeMode === "code" ? (
                <>
                    <div className="editor-wrapper">
                        <Editor
                            key={`editor-${selectedLanguage}`}
                            height="60vh"
                            defaultLanguage={selectedLanguage}
                            language={selectedLanguage}
                            theme="interviewly-dark"
                            value={value}
                            onChange={(value) => setValue(value ?? "")}
                            beforeMount={beforeMount}
                            onMount={onMount}
                            options={{
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
                                minimap: { enabled: false }
                            }}
                        />
                    </div>
                    
                    <div className="divider"></div>

                    <OutputBox output={output} editorRef={editorRef} language={selectedLanguage} />
                </>
            ) : (
                <div className="notebook-wrapper">
                    <div className="notebook-content">
                        <div className="notebook-placeholder">
                            <h3>Notebook Mode</h3>
                            <p>Notebook interface coming soon...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default CodeEditor;
