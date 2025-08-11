import json
import requests

RUNNER_PY = r"""
import sys, json, time


def _main():
    try:
        cfg = json.loads(sys.stdin.read())
        tests = cfg["tests"]
        func_name = cfg["func_name"]
        default_checker = cfg.get("checker", "deep_equal")

        instance = Solution()
        total = len(tests)
        passed = 0
        results = []

        for t in tests:
            args = t["input"]
            expected = t.get("output", None)  # may be a single value OR a list of acceptable outputs
            checker_name = t.get("checker", default_checker)

            start = time.time()
            try:
                got = getattr(instance, func_name)(*args)
                ok = CHECKERS[checker_name](expected, got)
                err = ""
            except Exception as e:
                got = None
                ok = False
                err = str(e)

            dur_ms = int((time.time() - start) * 1000)
            if ok:
                passed += 1

            results.append({
                "id": t["id"],
                "ok": ok,
                "expected": expected,
                "got": got,
                "time_ms": dur_ms,
                "error": err,
                "checker": checker_name
            })

        print(json.dumps({"summary": {"passed": passed, "total": total}, "results": results}))
    except Exception as e:
        print("Runner error: " + str(e))

_main()
"""

check_function = r"""
import math
import re
from collections import Counter

def deep_equal(a, b):
    # Handle case where expected is a single-element list and got is the element
    if isinstance(a, list) and len(a) == 1 and not isinstance(b, list):
        return deep_equal(a[0], b)
    if isinstance(b, list) and len(b) == 1 and not isinstance(a, list):
        return deep_equal(a, b[0])
    
    if type(a) != type(b):
        return False
    if isinstance(a, (int, str, bool)) or a is None:
        return a == b
    if isinstance(a, float):
        if math.isnan(a) and math.isnan(b):
            return True
        return a == b
    if isinstance(a, list):
        return len(a) == len(b) and all(deep_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(deep_equal(a[k], b[k]) for k in a)
    return False

def sequence_equal(a, b):
    return isinstance(b, list) and a == b

def multiset_equal(a, b):
    try:
        return Counter(a) == Counter(b)
    except Exception:
        return False

def float_close(a, b, rel_tol=1e-9, abs_tol=0.0):
    def isclose(x, y):
        if math.isnan(x) and math.isnan(y):
            return True
        return math.isclose(x, y, rel_tol=rel_tol, abs_tol=abs_tol)
    if isinstance(a, float) and isinstance(b, float):
        return isclose(a, b)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(float_close(x, y, rel_tol, abs_tol) for x, y in zip(a, b))
    return False

def text_exact(a, b):
    return a == b

def text_normalized(a, b):
    normalize = lambda s: re.sub(r"\\s+", " ", s.strip())
    return normalize(a) == normalize(b)

# --- Generic "one-of" wrappers (reusable) ---
def one_of_deep_equal(expected_list, actual):
    # expected_list: list of acceptable outputs; compare with deep_equal
    return any(deep_equal(e, actual) for e in expected_list)

def one_of_multiset_equal(expected_list, actual):
    # expected_list: list of acceptable outputs; inside each, order doesn't matter
    return any(multiset_equal(e, actual) for e in expected_list)

CHECKERS = {
    "deep_equal": deep_equal,
    "sequence_equal": sequence_equal,
    "multiset_equal": multiset_equal,
    "float_close": float_close,
    "text_exact": text_exact,
    "text_normalized": text_normalized,
    "one_of_deep_equal": one_of_deep_equal,
    "one_of_multiset_equal": one_of_multiset_equal,
}
"""

def prep_code(code):
    # Check if the code uses typing annotations and add necessary imports
    typing_imports = ""
    typing_needed = []
    
    # Check for common typing annotations
    if "List[" in code:
        typing_needed.append("List")
    if "Dict[" in code:
        typing_needed.append("Dict")
    if "Set[" in code:
        typing_needed.append("Set")
    if "Tuple[" in code:
        typing_needed.append("Tuple")
    if "Optional[" in code:
        typing_needed.append("Optional")
    if "Union[" in code:
        typing_needed.append("Union")
    if "Any" in code and "Any[" not in code:  # Avoid matching Any[...]
        typing_needed.append("Any")
    
    # Only add imports if typing is needed and not already imported
    if typing_needed and "from typing import" not in code and "import typing" not in code:
        typing_imports = f"from typing import {', '.join(typing_needed)}\n"
    
    # Combine the code with necessary imports, checker functions, and runner
    combined_source = typing_imports + check_function + "\n" + code.strip() + "\n" + RUNNER_PY
    return combined_source


def get_test_cases(url: str):
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


def is_tle(signal, stderr, stdout, exit_code):
    text = f"{str(signal or '')} {stderr or ''} {stdout or ''}".lower()
    if any(x in text for x in ["time limit", "timed out", "timeout", "exceeded time"]):
        return True
    sig = str(signal or '').upper()
    if sig in {"SIGKILL", "SIGXCPU"}:
        return True
    return False


def run_single_test(piston_url, language, version, combined_source, func_name, test_case, default_checker, run_timeout_ms):
    """Run a single test via Piston and return a list with one result dict."""
    cfg = {
        "func_name": func_name,
        "args": None,
        "tests": [test_case],
        "checker": default_checker,
    }
    payload = {
        "language": language,
        "version": version,
        "files": [{"name": "main.py", "content": combined_source}],
        "stdin": json.dumps(cfg),
        "run_timeout": run_timeout_ms,
    }

    r = requests.post(piston_url, json=payload, timeout=(10, 60))
    r.raise_for_status()
    data = r.json()

    stdout = (data.get("run") or {}).get("stdout", "").strip()
    stderr = (data.get("run") or {}).get("stderr", "")
    signal = (data.get("run") or {}).get("signal", None)
    exit_code = (data.get("run") or {}).get("code", None)

    if not stdout:
        tle = is_tle(signal, stderr, stdout, exit_code)
        return [{
            "id": test_case.get("id"),
            "ok": False,
            "expected": test_case.get("output"),
            "got": None,
            "time_ms": None,
            "error": stderr or f"Empty stdout (signal={signal}, exit={exit_code})",
            "checker": test_case.get("checker", default_checker),
            "tle": tle,
        }]

    try:
        runner_json = json.loads(stdout)
        results = runner_json.get("results", [])
        return results
    except Exception as e:
        tle = is_tle(signal, stderr, stdout, exit_code)
        return [{
            "id": test_case.get("id"),
            "ok": False,
            "expected": test_case.get("output"),
            "got": None,
            "time_ms": None,
            "error": f"Failed to parse runner output: {e}",
            "checker": test_case.get("checker", default_checker),
            "tle": tle,
        }]