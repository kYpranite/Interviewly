from flask import Blueprint, current_app, jsonify, request, Response
from ..services.azure_speech import issue_token
import re
import requests

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


@bp.route("/proxy_transcript", methods=["GET"])
def proxy_transcript():
    """
    Proxies a Firebase Storage transcript URL to bypass browser CORS issues.

    Query: ?url=<encoded firebase download URL>
    Behavior:
      - Validates URL is a Firebase Storage download URL
      - Tries the original URL
      - If 403/404, tries to fix legacy bucket names and ensure alt=media
    """
    raw_url = request.args.get("url", type=str)
    if not raw_url:
        return jsonify({"error": "Missing url parameter"}), 400

    try:
        # Only allow Firebase Storage download hosts
        if not (raw_url.startswith("https://firebasestorage.googleapis.com/") or raw_url.startswith("https://storage.googleapis.com/")):
            return jsonify({"error": "URL host not allowed"}), 400

        def _ensure_alt_media(u: str) -> str:
            from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
            p = urlparse(u)
            q = dict(parse_qsl(p.query, keep_blank_values=True))
            q.setdefault("alt", "media")
            new_q = urlencode(q)
            return urlunparse((p.scheme, p.netloc, p.path, p.params, new_q, p.fragment))

        def _fix_bucket_path(u: str) -> str:
            # Replace ".firebasestorage.app" in bucket segment with ".appspot.com"
            m = re.search(r"/v0/b/([^/]+)/o/", u)
            if not m:
                return u
            bucket = m.group(1)
            if ".firebasestorage.app" in bucket:
                fixed = bucket.replace(".firebasestorage.app", ".appspot.com")
                return u.replace(f"/v0/b/{bucket}/o/", f"/v0/b/{fixed}/o/")
            return u

        candidates = []
        candidates.append(_ensure_alt_media(raw_url))
        fixed1 = _fix_bucket_path(candidates[0])
        if fixed1 != candidates[0]:
            candidates.append(fixed1)

        last_exc = None
        for cu in candidates:
            try:
                r = requests.get(cu, timeout=15)
                if r.status_code == 200:
                    # Pass through content-type if provided
                    ct = r.headers.get("content-type", "application/octet-stream")
                    return Response(r.content, status=200, mimetype=ct)
                # Store last response for debugging, but continue trying others
                last_exc = Exception(f"Upstream status {r.status_code}")
            except Exception as e:
                last_exc = e

        # If all candidates failed, return error
        return jsonify({"error": f"Failed to fetch transcript: {last_exc}"}), 502
    except Exception as e:
        return jsonify({"error": f"Proxy error: {e}"}), 500