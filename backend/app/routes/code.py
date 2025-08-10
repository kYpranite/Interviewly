from flask import Blueprint, request, jsonify
from requests.exceptions import Timeout
from ..language_versions import LANGUAGE_VERSIONS
from ..util.execute_utils import prep_code, get_test_cases, run_single_test  # moved helpers

code_bp = Blueprint("code", __name__, url_prefix="/api/code")

 

@code_bp.route("/run", methods=["POST"])
def run_code():
    data = request.get_json(silent=True) or {}

    code = data.get("code", "")
    language = data.get("language", "python")
    version = LANGUAGE_VERSIONS.get(language, "")
    piston_url = data.get("piston_url", "https://emkc.org/api/v2/piston/execute")
    run_timeout = int(data.get("timeout", 10000))
    default_checker = data.get("checker", "deep_equal")
    func_name = data.get("function")
    stop_on_fail = bool(data.get("stop_on_fail", False))

    test_case_url = data.get("test_cases")
    tests = get_test_cases(test_case_url) if test_case_url else (data.get("tests") or [])
    if not isinstance(tests, list):
        return jsonify({"error": "tests must be a list"}), 400

    if not code or not func_name:
        return jsonify({"error": "code and function are required"}), 400

    try:
        combined_source = prep_code(code)
    except Exception as e:
        return jsonify({"error": f"prep_code failed: {e}"}), 500

    aggregated = []
    passed = 0

    # Run tests one at a time (no batching)
    for t in tests:
        try:
            results = run_single_test(
                piston_url, language, version, combined_source,
                func_name, t, default_checker, run_timeout
            )
        except Exception as e:
            msg = str(e)
            is_timeout = isinstance(e, Timeout) or ("timeout" in msg.lower() or "timed out" in msg.lower())
            results = [{
                "id": t.get("id"),
                "ok": False,
                "expected": t.get("output"),
                "got": None,
                "time_ms": None,
                "error": f"Piston request failed: {e}",
                "checker": t.get("checker", default_checker),
                "tle": is_timeout
            }]

        for res in results:
            if res.get("ok"):
                passed += 1
            aggregated.append(res)
            if stop_on_fail and not res.get("ok"):
                return jsonify({"summary": {"passed": passed, "total": len(aggregated)}, "results": aggregated})

    summary = {"passed": passed, "total": len(aggregated)}
    return jsonify({"summary": summary, "results": aggregated})
