import Editor from "@monaco-editor/react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, RotateCcw, Code2, Notebook, Play, Terminal, Sparkles } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import OutputBox from "./OutputBox";
import "./CodeEditor.css";

function CodeEditor({ question }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const [selectedLanguage, setSelectedLanguage] = useState("python"); // keep your existing default
  const [value, setValue] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab] = useState("code"); // “notebook” reserved

  // unescape string templates from backend
  const unescapeTemplate = (s) => {
    if (typeof s !== "string") return s ?? "";
    return s.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n").replaceAll("\\t", "\t");
  };

  const getDefaultValue = (lang) => {
    const t = question?.templates?.[lang];
    return unescapeTemplate(typeof t === "string" ? t : "");
  };

  const beforeMount = (monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("interviewly-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d0f12",
        "editorGutter.background": "#0d0f12",
        "editorLineNumber.foreground": "#6b7385",
        "editorLineNumber.activeForeground": "#a7b1c9",
        "editor.selectionBackground": "#20304a",
        "editor.inactiveSelectionBackground": "#1a263b",
        "editor.lineHighlightBackground": "#11131a",
        "editorCursor.foreground": "#d4d4d4",
        "scrollbarSlider.background": "#2a3345",
        "scrollbarSlider.hoverBackground": "#334057",
        "editorWidget.background": "#0f1217",
        "editorSuggestWidget.background": "#0f1217",
        "editorSuggestWidget.selectedBackground": "#1b2230",
      },
    });
  };

  const onMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme("interviewly-dark");
    editor.focus();
    // Cmd/Ctrl + Enter to Run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => handleRun());
  };

  const handleLanguageChange = (newLang) => {
    setSelectedLanguage(newLang);
    setValue(getDefaultValue(newLang));
  };

  const handleReset = () => {
    setValue(getDefaultValue(selectedLanguage));
    setOutput("");
  };

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput("Running…");
    try {
      const code = editorRef.current?.getValue?.() ?? value ?? "";
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
          test_cases: question?.test_cases,
          timeout: question?.timeout,
          checker: question?.checker,
          function: question?.function,
        }),
      });

      let text = "";
      try {
        const result = await res.json();
        text = result?.run?.output || JSON.stringify(result, null, 2);
      } catch {
        text = await res.text();
      }
      setOutput(text);
    } catch (err) {
      setOutput(`Error: ${err?.message ?? String(err)}`);
    } finally {
      setIsRunning(false);
    }
  }, [question, selectedLanguage, value]);

  // init editor value when question or language changes
  useEffect(() => {
    setValue(getDefaultValue(selectedLanguage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, selectedLanguage]);

  return (
    <div className="ce-card">
      {/* Toolbar */}
      <div className="ce-toolbar">
        {/* Segmented tabs */}
        <div role="tablist" aria-label="Mode" className="segmented">
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === "code"}
            className={`seg-btn ${activeTab === "code" ? "is-active" : ""}`}
          >
            <Code2 className="i" /> <span>Code</span>
          </button>
          <button role="tab" type="button" disabled aria-disabled="true" className="seg-btn is-disabled" title="Coming soon">
            <Notebook className="i" /> <span>Notebook</span>
          </button>
        </div>

        {/* Right side: status, language, actions */}
        <div className="ce-right">
          {isRunning ? (
            <span className="badge badge--indigo">
              <Loader2 className="i spin" /> Running…
            </span>
          ) : (
            <span className="badge badge--green">
              <CheckCircle2 className="i" /> Ready
            </span>
          )}

          <div className="lang-wrap">
            <label className="sr-only" htmlFor="language">Language</label>
            <LanguageSelector
              id="language"
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </div>

          <div className="actions">
            <button className="btn btn--ghost" type="button" onClick={handleReset} title="Reset to starter code">
              <RotateCcw className="i" /> Reset
            </button>
            <button className="btn btn--primary" type="button" onClick={handleRun} disabled={isRunning} title="Run (⌘/Ctrl + Enter)">
              {isRunning ? (
                <>
                  <Loader2 className="i spin" /> Running…
                </>
              ) : (
                <>
                  <Play className="i" /> Run
                  <span className="kbd-chip">
                    <span className="kbd">⌘/Ctrl</span><span className="plus">+</span><span className="kbd">⏎</span>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="ce-sep" />

      {/* Editor */}
      {!question ? (
        <div className="ce-skeleton" aria-busy="true" aria-live="polite">Loading question…</div>
      ) : (
        <div className="editor-shell">
          <Editor
            key={`editor-${selectedLanguage}-${question?.id ?? "q"}`}
            height="60vh"
            defaultLanguage={selectedLanguage}
            language={selectedLanguage}
            theme="interviewly-dark"
            value={value}
            onChange={(v) => setValue(v ?? "")}
            beforeMount={beforeMount}
            onMount={onMount}
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
              minimap: { enabled: false },
              automaticLayout: true,
              smoothScrolling: true,
              scrollBeyondLastLine: false,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              roundedSelection: true,
              renderLineHighlight: "line",
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      )}

      <div className="ce-sep" />

      {/* Output */}
      <div className="out-wrap">
        <div className="out-head">
          <span className="out-title"><Terminal className="i" /> Output</span>
          <span className="pill pill--fx">
            <Sparkles className="i" /> sandbox
          </span>
        </div>
        <OutputBox output={output} />
      </div>
    </div>
  );
}

export default CodeEditor;
