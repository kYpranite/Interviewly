import google.generativeai as genai

def _to_gemini_contents(messages):
    """
    Convert [{role:'user'|'ai', content:'...'}] -> Gemini contents.
    Frontend never sends config; only plain message turns.
    """
    out = []
    for m in messages or []:
        role = "user" if m.get("role") == "user" else "model"
        text = (m.get("content") or "").strip()
        if text:
            out.append({"role": role, "parts": [{"text": text}]})
    return out

def analyze_with_gemini(*, api_key: str, model_name: str, system_prompt: str,
                        messages: list, temperature: float, top_p: float,
                        top_k: int, max_tokens: int) -> str:
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")

    genai.configure(api_key=api_key)

    generation_config = {
        "temperature": temperature,
        "top_p": top_p,
        "top_k": top_k,
        "max_output_tokens": max_tokens,
    }

    # Use system_instruction so frontend never needs to send a prompt
    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_prompt,
        generation_config=generation_config,
    )

    contents = _to_gemini_contents(messages)
    resp = model.generate_content(contents)
    return (getattr(resp, "text", None) or "").strip()