import Editor from "@monaco-editor/react";
import React, { useState, useRef } from "react";
import LanguageSelector from "./LanguageSelector";
import OutputBox from "./OutputBox";
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
        const defaults = {
            python: "print('Hello World!')",
            javascript: "console.log('Hello World!');",
            typescript: "console.log('Hello World!');",
            java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World!\");\n    }\n}",
            cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello World!\" << endl;\n    return 0;\n}",
            c: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello World!\\n\");\n    return 0;\n}",
        };
        return defaults[language] || "// Hello World!";
    };

    const handleLanguageChange = (language) => {
        setSelectedLanguage(language);
        setValue(getDefaultValue(language));
        setOutput(""); // Clear output when language changes
    };

    const handleReset = () => {
        setValue(getDefaultValue(selectedLanguage));
        setOutput("");
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput("Running...");
        
        // Simulate code execution - in a real app, you'd send this to a backend
        setTimeout(() => {
            try {
                // Mock output based on language
                const mockOutputs = {
                    python: "Hello World!\n",
                    javascript: "Hello World!\n",
                    typescript: "Hello World!\n",
                    java: "Hello World!\n",
                    cpp: "Hello World!\n",
                    c: "Hello World!\n",
                };
                
                setOutput(mockOutputs[selectedLanguage] || "Code executed successfully!");
            } catch (error) {
                setOutput(`Error: ${error.message}`);
            }
            setIsRunning(false);
        }, 1000);
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
