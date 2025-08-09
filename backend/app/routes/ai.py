from flask import Blueprint, current_app, jsonify, request
from ..services.gemini import analyze_with_gemini

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

@ai_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    Body:
    {
      "messages": [{ "role": "user"|"ai", "content": "..." }, ...],
      "system_prompt": "optional string",
      "model": "optional model name"
    }
    """
    data = request.get_json(silent=True) or {}
    messages = data.get("messages") or []
    system_prompt = data.get("system_prompt")
    model_name = data.get("model")

    cfg = current_app.config
    api_key = cfg.get("GEMINI_API_KEY")
    model = model_name or cfg.get("GEMINI_MODEL", "gemini-1.5-flash")

    if not api_key:
        return jsonify({"error": "Missing GEMINI_API_KEY on server"}), 500

    try:
        text = analyze_with_gemini(api_key=api_key, model_name=model, messages=messages, system_prompt=system_prompt)
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": f"Gemini analyze failed: {e}"}), 500