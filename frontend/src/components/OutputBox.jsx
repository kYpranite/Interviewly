import React, { useEffect, useRef } from "react";
import { Copy, Trash2 } from "lucide-react";

function OutputBox({ output }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [output]);

  useEffect(() => {
    const onClear = () => {
      if (!ref.current) return;
      ref.current.textContent = "";
    };
    window.addEventListener("clear-output", onClear);
    return () => window.removeEventListener("clear-output", onClear);
  }, []);

  return (
    <div className="ob">
      <div className="ob-head">
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          onClick={() => navigator.clipboard?.writeText(output ?? "")}
          title="Copy output"
        >
          <Copy className="i" /> Copy
        </button>
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("clear-output"))}
          title="Clear output"
        >
          <Trash2 className="i" /> Clear
        </button>
      </div>
      <pre
        ref={ref}
        className="ob-pre"
        aria-live="polite"
      >
        {output || "No output yet."}
      </pre>
    </div>
  );
}

export default OutputBox;
