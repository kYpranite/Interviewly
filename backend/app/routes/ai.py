from flask import Blueprint, current_app, jsonify, request
from ..services.gemini import analyze_with_gemini

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

    cfg = current_app.config
    api_key = cfg.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Missing GEMINI_API_KEY on server"}), 500

    try:
        text = analyze_with_gemini(
            api_key=api_key,
            model_name=cfg.get("GEMINI_MODEL"),
            system_prompt=cfg.get("GEMINI_SYSTEM_PROMPT"),
            messages=messages,
            temperature=cfg.get("GEMINI_TEMPERATURE"),
            top_p=cfg.get("GEMINI_TOP_P"),
            top_k=cfg.get("GEMINI_TOP_K"),
            max_tokens=cfg.get("GEMINI_MAX_TOKENS"),
        )
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": f"Gemini analyze failed: {e}"}), 500