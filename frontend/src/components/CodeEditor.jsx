import Editor from "@monaco-editor/react";
import React, { useState, useRef } from "react";
import LanguageSelector from "./LanguageSelector";
import OutputBox from "./OutputBox";
import DEFAULT_CODE_TEMPLATES from "./defaultCodeTemplates";
import "./CodeEditor.css";

function CodeEditor() {
    const editorRef = useRef();
    const [selectedLanguage, setSelectedLanguage] = useState("python");
    const [value, setValue] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    
    const onMount = (editor) => {
        editorRef.current = editor;
        editor.focus();
    };
    
    const getDefaultValue = (language) => {
        return DEFAULT_CODE_TEMPLATES[language] || "// Write your code here";
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
            const code = editorRef.current.getValue();
            const res = await fetch("/api/code/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code,
                    language: selectedLanguage
                })
            });
            const result = await res.json();
            setOutput(result?.run?.output || JSON.stringify(result));
        } catch (error) {
            setOutput(`Error: ${error.message}`);
        }
        setIsRunning(false);
    };

    return (
        <div className="code-editor-container">
            <div className="editor-header">
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
                    height="60vh"
                    defaultLanguage={selectedLanguage}
                    language={selectedLanguage}
                    theme="vs-dark"
                    value={value || getDefaultValue(selectedLanguage)}
                    onChange={(value) => setValue(value)}
                    onMount={onMount}
                    options={{
                        fontSize: 18,
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
