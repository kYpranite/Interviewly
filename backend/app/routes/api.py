from flask import Blueprint, current_app, jsonify, request
from ..services.azure_speech import issue_token

bp = Blueprint("api", __name__, url_prefix="/api")

@bp.route("/submit_code", methods=["POST"])
def submit_code():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "") or ""
    lines = len(code.splitlines()) if code else 0
    chars = len(code)
    # Future: forward code to your scoring/LLM service
    return jsonify({
        "received": True,
        "lines": lines,
        "chars": chars,
        "message": f"Code received: {lines} line(s), {chars} character(s)."
    })

@bp.route("/azure_token", methods=["GET"])
def azure_token():
    """
    Issues a short-lived Azure Speech token for the browser SDK.

    🔑 Where to put keys:
      - Set .env or environment with:
        AZURE_SPEECH_KEY=<your key>
        AZURE_SPEECH_REGION=<region> (e.g., eastus)
        # OR:
        AZURE_SPEECH_ENDPOINT=https://<your-res>.cognitiveservices.azure.com
    """
    cfg = current_app.config
    key = cfg.get("AZURE_SPEECH_KEY")
    region = cfg.get("AZURE_SPEECH_REGION")
    endpoint = cfg.get("AZURE_SPEECH_ENDPOINT")

    if not key or (not region and not endpoint):
        return jsonify({"error": "Missing Azure config. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT."}), 500

    try:
        token = issue_token(key=key, region=region, endpoint=endpoint)
        # Browser SDK needs a region; if using endpoint, return some region value (your real region is best).
        return jsonify({"token": token, "region": region or "eastus", "endpoint": endpoint or None})
    except Exception as e:
        return jsonify({"error": f"Failed to issue token: {e}"}), 500