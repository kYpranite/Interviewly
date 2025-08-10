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
            # Prepend just the raw code as context so generation is driven by server-side system prompt
            messages = [{
                "role": "user",
                "content": code
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

    from time import time
    import json

    data = request.get_json(silent=True) or {}
    code = data.get("code") or ""
    language = data.get("language") or "unknown"
    question = data.get("question")  # may be a dict per schema

    # Compute a lightweight hash to dedupe rapid repeats
    try:
        qid = None
        if isinstance(question, dict):
            qid = question.get("id") or f"{question.get('title','')}|{question.get('function','')}|{','.join(question.get('args') or [])}"
        sample = (code or "")[-1024:]  # last 1KB
        h = 5381
        for ch in sample:
            h = ((h << 5) + h) + ord(ch)
        content_hash = f"{len(code)}|{language}|{qid}|{h & 0xFFFFFFFF}"
    except Exception:
        content_hash = f"{len(code)}|{language}"

    now = time()
    existing = _CONTEXT_BY_CLIENT.get(client_id) or {}
    last_hash = existing.get("_last_hash")
    last_at = existing.get("_last_at") or 0

    # If identical payload arrives within 1s, skip storing to reduce spam
    if last_hash == content_hash and (now - last_at) < 1.0:
        return jsonify({
            "ok": True,
            "skipped": True,
            "reason": "dedupe_1s",
            "bytes": len(code),
            "has_question": question is not None
        })

    # Merge with any existing context for this client
    updated = {**existing, "code": code, "language": language, "_last_hash": content_hash, "_last_at": now}
    if question is not None:
        updated["question"] = question
    _CONTEXT_BY_CLIENT[client_id] = updated
    return jsonify({
        "ok": True,
        "bytes": len(code),
        "has_question": question is not None,
        "debug_hash": content_hash
    })


@ai_bp.route("/analyze_context", methods=["POST"])
def analyze_context():
    """Trigger an analysis using only the stored context for a client.

    Header: X-Client-Id: <stable-id>
    Response: { text }
    """
    client_id = request.headers.get("X-Client-Id")
    if not client_id:
        return jsonify({"error": "Missing X-Client-Id header"}), 400

    ctx = _CONTEXT_BY_CLIENT.get(client_id)
    if not ctx:
        return jsonify({"error": "No context for client"}), 400

    code = (ctx.get("code") or "").strip()
    language = (ctx.get("language") or "unknown").strip()
    question = ctx.get("question") or {}

    cfg = current_app.config
    api_key = cfg.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Missing GEMINI_API_KEY on server"}), 500

    # Build system prompt using base + question details (no solutions)
    base_system_prompt = cfg.get("GEMINI_SYSTEM_PROMPT") or ""
    system_prompt = base_system_prompt
    try:
        if isinstance(question, dict) and (question.get("title") or question.get("prompt")):
            title = (question.get("title") or "").strip()
            prompt = (question.get("prompt") or "").strip()
            constraints = question.get("constraints") or []
            function = (question.get("function") or "").strip()
            args = question.get("args") or []
            difficulty = (question.get("difficulty") or "").strip()
            topics = question.get("topics") or []

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

        messages = []
        if code:
            # Send only the code as the content so the context is clean
            messages.append({"role": "user", "content": code})

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