from flask import Blueprint, current_app, jsonify, request
from ..services.gemini import analyze_with_gemini

# Simple in-memory context store per client. For production, replace with Redis or DB.
_CONTEXT_BY_CLIENT = {}

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

@ai_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    Body:
    {
      "messages": [{ "role": "user"|"ai", "content": "..." }, ...]
    }
    All Gemini settings (model, system prompt, temps) are server-side.
    """
    data = request.get_json(silent=True) or {}
    messages = data.get("messages") or []

    # If a client has sent code context recently, prepend it so Gemini gets the latest code
    client_id = request.headers.get("X-Client-Id")
    ctx = _CONTEXT_BY_CLIENT.get(client_id) if client_id else None
    if ctx and isinstance(messages, list):
        code = (ctx.get("code") or "").strip()
        lang = (ctx.get("language") or "unknown").strip()
        if code:
            messages = [{
                "role": "user",
                "content": f"SYSTEM: This is the user's current code context. Language: {lang}\n\n{code}"
            }] + messages

    cfg = current_app.config
    api_key = cfg.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Missing GEMINI_API_KEY on server"}), 500

    try:
        # Build a dynamic system prompt that includes the current interview question (if available)
        base_system_prompt = cfg.get("GEMINI_SYSTEM_PROMPT") or ""
        system_prompt = base_system_prompt

        if ctx and isinstance(ctx, dict):
            q = ctx.get("question") or {}
            if isinstance(q, dict) and (q.get("title") or q.get("prompt")):
                # Prefer safe, concise fields; do NOT include solution in the interviewer prompt
                title = (q.get("title") or "").strip()
                prompt = (q.get("prompt") or "").strip()
                # Some prompts may include HTML; allow a minimal hint without heavy parsing
                constraints = q.get("constraints") or []
                function = (q.get("function") or "").strip()
                args = q.get("args") or []
                difficulty = (q.get("difficulty") or "").strip()
                topics = q.get("topics") or []

                constraints_str = "\n".join([f"- {c}" for c in constraints]) if constraints else ""
                args_str = ", ".join(args) if args else ""
                topics_str = ", ".join(topics) if topics else ""

                question_block = (
                    "\n\nCURRENT INTERVIEW QUESTION (for the candidate):\n"
                    f"Title: {title}\n"
                    f"Difficulty: {difficulty}\n"
                    f"Topics: {topics_str}\n"
                    f"Function: {function}({args_str})\n"
                    f"Prompt: {prompt}\n"
                    + (f"Constraints:\n{constraints_str}\n" if constraints_str else "")
                )
                system_prompt = f"{base_system_prompt}{question_block}"

        text = analyze_with_gemini(
            api_key=api_key,
            model_name=cfg.get("GEMINI_MODEL"),
            system_prompt=system_prompt,
            messages=messages,
            temperature=cfg.get("GEMINI_TEMPERATURE"),
            top_p=cfg.get("GEMINI_TOP_P"),
            top_k=cfg.get("GEMINI_TOP_K"),
            max_tokens=cfg.get("GEMINI_MAX_TOKENS"),
        )
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": f"Gemini analyze failed: {e}"}), 500


@ai_bp.route("/update_context", methods=["POST"])
def update_context():
    """Stores the latest editor code and current question for a client.

    Body: { code: string, language?: string, question?: object }
    Header: X-Client-Id: <stable-id>
    """
    client_id = request.headers.get("X-Client-Id")
    if not client_id:
        return jsonify({"error": "Missing X-Client-Id header"}), 400

    data = request.get_json(silent=True) or {}
    code = data.get("code") or ""
    language = data.get("language") or "unknown"
    question = data.get("question")  # may be a dict per schema
    # Merge with any existing context for this client
    existing = _CONTEXT_BY_CLIENT.get(client_id) or {}
    updated = {**existing, "code": code, "language": language}
    if question is not None:
        updated["question"] = question
    _CONTEXT_BY_CLIENT[client_id] = updated
    return jsonify({"ok": True, "bytes": len(code), "has_question": question is not None})