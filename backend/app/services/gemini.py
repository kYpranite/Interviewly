import google.generativeai as genai

def _to_gemini_contents(messages):
    """
    Convert [{role: 'user'|'ai', content: '...'}] to Gemini 'contents' format.
    'ai' -> 'model' role for Gemini.
    """
    contents = []
    for m in messages or []:
        role = "user" if m.get("role") == "user" else "model"
        text = (m.get("content") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    return contents

def analyze_with_gemini(*, api_key: str, model_name: str, messages: list, system_prompt: str | None = None) -> str:
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    contents = _to_gemini_contents(messages)
    if system_prompt:
        # Prepend a system-ish instruction as a user part (Gemini doesn't use 'system' role directly)
        contents = [{"role": "user", "parts": [{"text": system_prompt}]}] + contents

    resp = model.generate_content(contents)
    # `resp.text` is the simplest way to get the main text answer
    return (getattr(resp, "text", None) or "").strip()