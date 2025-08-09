import React from 'react';
import './OutputBox.css';

function OutputBox({ output, editorRef, language }) {
    const runCode = async () => {
        const code = editorRef.current.getValue();
        if (!code.trim()) return;
    }

    return (
        <div className="output-section">
            <div className="output-header">
                <span className="output-label">Output</span>
            </div>
            <div className="output-box">
                <pre className="output-content">
                    {output || "Run your code to see output here..."}
                </pre>
            </div>
        </div>
    );
}

export default OutputBox;
