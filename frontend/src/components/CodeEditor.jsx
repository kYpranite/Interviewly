import Editor from "@monaco-editor/react";
import React, { useState, useRef, useEffect } from "react";
import LanguageSelector from "./LanguageSelector";
import OutputBox from "./OutputBox";
import "./CodeEditor.css";

function CodeEditor({question}) {
    const editorRef = useRef();
    const [selectedLanguage, setSelectedLanguage] = useState("python");
    const [value, setValue] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);

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

    return (
        <div className="code-editor-container">
            <div className="editor-header">
                <div className="mode-tabs" role="tablist">
                    <button className="mode-tab active" type="button">Code</button>
                    <button className="mode-tab" type="button" disabled>Notebook</button>
                </div>
                <LanguageSelector 
                    selectedLanguage={selectedLanguage}
                    onLanguageChange={handleLanguageChange}
                />
                <div className="action-buttons">
                    <button 
                        className="action-button reset-button"
                        onClick={handleReset}
                        type="button"
                    >
                        Reset
                    </button>
                    <button 
                        className="action-button run-button"
                        onClick={handleRun}
                        disabled={isRunning}
                        type="button"
                    >
                        {isRunning ? "Running..." : "Run"}
                    </button>
                </div>
            </div>
            
            <div className="divider"></div>
            
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
        </div>
    );
}

export default CodeEditor;
