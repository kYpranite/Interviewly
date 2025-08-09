from flask import Blueprint, request, jsonify
import requests
from ..language_versions import LANGUAGE_VERSIONS

code_bp = Blueprint("code", __name__, url_prefix="/api/code")

@code_bp.route("/run", methods=["POST"])
def run_code():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    language = data.get("language", "python")
    version = LANGUAGE_VERSIONS.get(language, "")
    files = data.get("files")
    if not files:
        files = [{"name": "main", "content": code}]
    payload = {
        "language": language,
        "version": str(version),
        "files": files
    }
    # Optional fields
    for key in [
        "stdin", "args", "run_timeout", "compile_timeout", "compile_memory_limit", "run_memory_limit"
    ]:
        if key in data:
            payload[key] = data[key]
    try:
        response = requests.post("https://emkc.org/api/v2/piston/execute", json=payload, timeout=10)
        result = response.json()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

