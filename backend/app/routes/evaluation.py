from flask import Blueprint, current_app, jsonify, request
from datetime import datetime
from ..services.evaluation_service import evaluate_interview

evaluation_bp = Blueprint("evaluation", __name__, url_prefix="/api/evaluation")

@evaluation_bp.route("/evaluate", methods=["POST"])
def evaluate_interview_endpoint():
    """
    Evaluate an interview using Gemini with the LeBron James rubric.
    
    Expected JSON body:
    {
        "transcript": [{"role": "user", "content": "..."}, {"role": "ai", "content": "..."}],
        "code_submission": "def solution()...",
        "language": "python",
        "test_results": {"summary": {"passed": 5, "total": 10}, "results": [...]},
        "question": {
            "optimal_time_complexity": "O(n)",
            "optimal_space_complexity": "O(1)",
            "candidate_time_complexity": "O(n^2)",
            "candidate_space_complexity": "O(1)",
            "solution": "Optimal solution explanation..."
        }
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Extract required fields
        transcript = data.get("transcript", [])
        code_submission = data.get("code_submission", "")
        language = data.get("language", "python")
        test_results = data.get("test_results", {})
        question = data.get("question", {})
        interview_start_time = data.get("interviewStartTime")
        
        # Validate required fields
        if not transcript:
            return jsonify({"error": "Transcript is required"}), 400
        
        if not code_submission:
            return jsonify({"error": "Code submission is required"}), 400
        
        # Get Gemini API key from config
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return jsonify({"error": "Gemini API key not configured"}), 500
        
        # Perform evaluation
        evaluation_result = evaluate_interview(
            api_key=api_key,
            transcript=transcript,
            code_submission=code_submission,
            test_results=test_results,
            language=language,
            question=question
        )
        
        # Parse interview start time and get current evaluation time
        current_time = datetime.now()
        evaluation_formatted = current_time.strftime("%Y-%m-%d %H:%M:%S")
        
        # Parse the interview start time
        start_time = datetime.fromisoformat(interview_start_time.replace('Z', '+00:00'))
        start_formatted = start_time.strftime("%Y-%m-%d %H:%M:%S")
        
        return jsonify({
            "success": True,
            "evaluation": evaluation_result,
            "interview_start_time": interview_start_time,
            "interview_started_at": start_formatted,
        })
        
    except Exception as e:
        current_app.logger.error(f"Interview evaluation failed: {str(e)}")
        return jsonify({
            "error": f"Evaluation failed: {str(e)}"
        }), 500

@evaluation_bp.route("/health", methods=["GET"])
def health_check():
    """Simple health check for the evaluation service."""
    return jsonify({"status": "healthy", "service": "evaluation"})
