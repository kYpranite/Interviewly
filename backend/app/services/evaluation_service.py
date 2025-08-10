import json
from .gemini import analyze_with_gemini

TIME_COMPLEXITY_PROMPT = """You are an expert in algorithm analysis.
Analyze the following code and output ONLY the time complexity and space complexity in Big-O notation as JSON. ONLY return the output JSON. Do NOT output any text along with it.

Instructions:
1. Carefully examine the provided function.
2. Identify all loops, recursive calls, and relevant operations that affect complexity.
3. Understand how each part of the code contributes to the total time complexity.
4. State the final time complexity in **Big-O** form.
5. Also determine the **space complexity**, including auxiliary data structures.
6. If the complexity depends on multiple parameters (e.g., `n` and `m`), express them clearly.
7. Report the complexity of the provided code as written (not the theoretically optimal approach).
8. Do not assume O(1) auxiliary space is always optimal. Many optimal-time solutions trade O(n) space for O(n) time (e.g., using a hash map for Two Sum). Report the actual auxiliary space used by the code.

Format:
{{
    "time_complexity": "O(...)",
    "space_complexity": "O(...)"
}}

Function:
```{language}
{code}
```
"""

def analyze_complexity(*, api_key: str, code_submission: str, language: str) -> dict:
    """
    Analyze the time and space complexity of the given code.
    
    Args:
        api_key: Gemini API key
        code_submission: Code to analyze
        language: Programming language
        
    Returns:
        Dictionary containing time_complexity and space_complexity
    """
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")
    
    # Format the prompt with the actual code
    complexity_prompt = TIME_COMPLEXITY_PROMPT.format(
        language=language,
        code=code_submission
    )
    
    try:
        response = analyze_with_gemini(
            api_key=api_key,
            model_name="gemini-1.5-flash",
            system_prompt=(
                "You are an expert algorithm analyst. Analyze code complexity and return only valid JSON in the exact format specified. "
                "Do not include any explanatory text, markdown formatting, or code blocks - just the raw JSON object. "
                "When assessing space, prefer the actual auxiliary usage of the code; do not assume O(1) is optimal where a hash/map is used for optimal time (e.g., Two Sum)."
            ),
            messages=[{"role": "user", "content": complexity_prompt}],
            temperature=0.1,
            top_p=0.95,
            top_k=40,
            max_tokens=512
        )
        
        # Parse the JSON response
        try:
            # Clean the response - remove any markdown code block markers
            cleaned_response = response.strip()
            
            # Remove markdown code block markers if present
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
                
            cleaned_response = cleaned_response.strip()
            
            complexity_result = json.loads(cleaned_response)
            return complexity_result
        except json.JSONDecodeError as e:
            # If parsing fails, try to extract JSON using regex
            try:
                import re
                # Look for JSON object in the response
                json_match = re.search(r'\{[^{}]*"time_complexity"[^{}]*"space_complexity"[^{}]*\}', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    complexity_result = json.loads(json_str)
                    return complexity_result
                else:
                    # If still no match, try a broader search
                    json_match = re.search(r'\{.*?\}', response, re.DOTALL)
                    if json_match:
                        json_str = json_match.group()
                        complexity_result = json.loads(json_str)
                        # Validate it has the required fields
                        if "time_complexity" in complexity_result and "space_complexity" in complexity_result:
                            return complexity_result
            except:
                pass
            
            # If all parsing attempts fail, return default values
            return {
                "time_complexity": "Not determined",
                "space_complexity": "Not determined"
            }
            
    except Exception as e:
        print(f"Complexity analysis error: {str(e)}")
        print(f"Response was: {response[:200] if 'response' in locals() else 'No response'}")
        return {
            "time_complexity": "Analysis failed",
            "space_complexity": "Analysis failed"
        }

def evaluate_interview(*, api_key: str, transcript: list, code_submission: str, 
                      test_results: dict, language: str, question: dict) -> dict:
    """
    Evaluate an interview using Gemini with the LeBron James rubric.
    
    Args:
        api_key: Gemini API key
        transcript: List of conversation turns with role and content
        code_submission: Final code submitted by candidate
        test_results: Test execution results with pass/fail information
        language: Programming language used
        question: Question details including optimal complexity
        
    Returns:
        Dictionary containing evaluation scores and feedback
    """
    
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY")
    
    # First, analyze the code complexity
    try:
        complexity_analysis = analyze_complexity(
            api_key=api_key,
            code_submission=code_submission,
            language=language
        )
    except Exception as e:
        print(f"Complexity analysis failed: {str(e)}")
        complexity_analysis = {
            "time_complexity": "Analysis failed",
            "space_complexity": "Analysis failed"
        }
    
    # Extract complexity information
    candidate_time = complexity_analysis.get("time_complexity", "Not determined")
    candidate_space = complexity_analysis.get("space_complexity", "Not determined")
    
    # Format transcript for evaluation
    transcript_text = ""
    for turn in transcript:
        role = "Candidate" if turn.get("role") == "user" else "Interviewer"
        content = turn.get("content", "")
        transcript_text += f"{role}: {content}\n"
    
    # Calculate test pass rate
    total_tests = test_results.get("summary", {}).get("total", 0)
    passed_tests = test_results.get("summary", {}).get("passed", 0)
    pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    # Format test results
    test_details = test_results.get("results", [])
    test_summary = f"Passed {passed_tests}/{total_tests} tests ({pass_rate:.1f}%)"
    
    # Get question details
    optimal_time = question.get("optimal_time_complexity", "O(n)")
    optimal_space = question.get("optimal_space_complexity", "O(1)")
    # Include question metadata and official solution if available
    q_title = question.get("title", "")
    q_prompt = question.get("prompt", "")
    q_constraints = question.get("constraints", []) or []
    q_args = question.get("args", []) or []
    q_function = question.get("function", "")
    q_difficulty = question.get("difficulty", "")
    q_topics = question.get("topics", []) or []

    # The "solution" field could be a map with approach/code/language
    solution = question.get("solution", "No solution provided")
    if isinstance(solution, dict):
        approach = solution.get("approach", "")
        code = solution.get("code", "")
        sol_lang = solution.get("language", "")
        solution_text = (
            (f"Approach:\n{approach}\n\n" if approach else "") +
            (f"Reference Code ({sol_lang}):\n```{sol_lang}\n{code}\n```\n" if code else "")
        ).strip() or "No solution provided"
    else:
        solution_text = str(solution)
    
    # Create the evaluation prompt
    evaluation_prompt = f"""
TRANSCRIPT:
{transcript_text}

CODE SUBMISSION (Language: {language}):
```{language}
{code_submission}
```

TEST RESULTS:
{test_summary}
Details: {json.dumps(test_details, indent=2)}

COMPLEXITY ANALYSIS:
Optimal Time Complexity: {optimal_time}
Optimal Space Complexity: {optimal_space}
Candidate Time Complexity: {candidate_time}
Candidate Space Complexity: {candidate_space}

QUESTION DETAILS:
Title: {q_title}
Difficulty: {q_difficulty}
Topics: {", ".join(q_topics)}
Function Signature: {q_function}({", ".join(q_args)})
Prompt: {q_prompt}
Constraints:\n{"\n".join(q_constraints)}

OFFICIAL SOLUTION AND APPROACH (for rubric reference):
{solution_text}

Please evaluate this candidate according to the rubric and return ONLY the JSON output as specified.
Note: If complexity analysis failed, use your best judgment based on the code structure for the Time/Space Complexity category.
Scoring constraint: If all tests passed (Passed == Total), you MUST set the "Correctness" score to 5 out of 5 regardless of other factors.
"""

    # LeBron James evaluation system prompt
    system_prompt = """Your name is LeBron James. You are a Senior Staff Engineer at Google and are known for your high standards and unflinching technical feedback.
You are interviewing a software engineering candidate and must evaluate their performance using the detailed rubric below. Use the correct solution and notes you were given in your evaluation. ONLY return the output JSON. Do NOT output any text along with it

You will be given:
1. Transcript — a record of the candidate's verbal reasoning during the interview.
2. Code Submission — their solution to the problem.
3. Test Results — public/hidden test case results, including performance metrics.
4. Complexity Analysis — comparison between optimal and candidate's time/space complexity.
5. Solution with approach and code.

Your task: Score the candidate 1–5 in each category (1 = Not Demonstrated, 5 = Excellent) according to the embedded rubric.
Be critical and brutally honest. Avoid vague praise. Back up every score with direct evidence from transcript, code, or tests.

IMPORTANT: For the Time/Space Complexity category, judge against realistic optimal trade-offs rather than assuming O(1) space when that would significantly worsen time complexity. For example, in Two Sum the optimal-time approach uses O(n) extra space; do NOT penalize O(n) space there. If the only way to reduce space (e.g., to O(1)) requires worsening time by a tier or more (e.g., from O(n) to O(n log n) or O(n^2)), treat the O(n)-space solution as meeting optimal expectations. In these trade-off scenarios, award 5/5 when time is optimal even if space is one tier worse. Use the following tier rankings to judge the gap between optimal and actual:
Time Complexity Tier (best to worst):
O(1) > O(log n) > O(n) > O(n log n) > O(n^2) > O(n^3) > O(2^n) > O(n!)
Space Complexity Tier (best to worst):
O(1) > O(log n) > O(n) > O(n log n) > O(n^2) > O(2^n)

HARSH Scoring rules for Time/Space Complexity (with trade-off awareness):
- Score 5: Time matches the optimal tier AND (a) space matches optimal, OR (b) space is exactly one tier worse but is the standard/necessary trade-off to achieve optimal time (e.g., hashing for Two Sum). In such cases, treat as meeting optimal expectations.
- Score 4: Both time and space are at most **one tier worse** than optimal without a clear, standard trade-off justification.
- Score 3: One is at most one tier worse and the other is **two tiers worse**, OR both are **two tiers worse**.
- Score 2: Either is **three tiers worse** than optimal, OR one is two tiers worse and the other is worse than that.
- Score 1: Either is **four or more tiers worse**, or is at the exponential/factorial range (O(2^n), O(n!)) without clear necessity.

In short: quadratic when optimal is linear is already a serious penalty; cubic when optimal is quadratic is also serious. Prefer solutions that achieve near-optimal time even if they use O(n) extra space when that is the standard optimal trade-off. Do not punish candidates for O(n) time and O(n) auxiliary space when the only way to save space would worsen time (e.g., hash-map Two Sum). In such cases, consider the O(n)-space solution as meeting optimal expectations and award a 5/5.

RUBRIC:

Communication and Clarity must be judged primarily from the transcript (what the candidate actually says). Code should only be used as a minor, tie-breaker signal in these two categories.

1. Communication (spoken-first)
5: Consistently verbalizes thought process; restates problem; explains approach and key decisions; asks/answers clarifying questions; adapts to feedback. Code references only to support explanations.
4: Explains approach and rationale with minor lapses; restates most requirements; generally interactive and understandable.
3: Partial explanations; skips reasoning steps; understanding present but not consistently verbalized.
2: Disorganized or minimal reasoning; interviewer must infer rationale.
1: Does not communicate thought process or approach.

2. Understanding
5: Fully grasps problem requirements, constraints, and edge cases; proactively clarifies ambiguities; considers trade-offs.
4: Understands main requirements and most constraints; minor omissions in edge case discussion.
3: Understands general problem but misses key constraints or multiple edge cases.
2: Misinterprets problem or constraints; solves wrong problem; needs major hints.
1: Shows no understanding of the problem.

3. Clarity (spoken-first)
5: Clear, well-structured verbal explanations; concise; uses concrete examples; correct terminology. Code clarity considered only minimally here.
4: Mostly clear and logical with minor digressions or ambiguity.
3: Some structure but explanations wander; filler or occasional confusion.
2: Hard to follow; frequent vagueness or poor flow.
1: Incoherent or no discernible structure.

4. Code Readability
5: Code is clean, well-structured, idiomatic; good naming; consistent formatting; helpful comments for complex logic.
4: Generally clean and readable; minor naming or formatting inconsistencies.
3: Understandable but with poor names, minimal comments, or some formatting issues.
2: Difficult to read due to poor structure, bad formatting, or cryptic names.
1: Unreadable or severely unstructured code.

5. Correctness
5: Passes all tests (public + hidden). If 100% tests pass, award 5/5 for this category regardless of other factors. Handles all edge cases; robust to unexpected inputs (if applicable).
4: Passes most tests; misses only rare or tricky edge cases.
3: Passes about half the tests; fails common edge cases.
2: Passes few tests; fails basic cases.
1: Produces mostly incorrect or no output.

6. Time/Space Complexity
Use the harsher scoring rules above based on tier rankings. 

SCORING METHOD:
1. Assign a single integer score (1–5) to each category above.
2. Provide specific, critical justification for each score citing transcript lines, code snippets, and/or test evidence.
3. Do not inflate scores — if the candidate failed a criterion, score low and explain why.

OUTPUT JSON FORMAT:
{
  "criteria": [
    {
      "name": "Communication",
      "score": 3,
      "justification": "Explained approach partially; skipped rationale for key steps..."
    },
    {
      "name": "Understanding",
      "score": 4,
      "justification": "Identified most constraints but missed memory tradeoffs..."
    },
    {
      "name": "Clarity",
      "score": 2,
      "justification": "Explanation wandered with irrelevant tangents..."
    },
    {
      "name": "Code Readability",
      "score": 5,
      "justification": "Clean style, good variable naming..."
    },
    {
      "name": "Correctness",
      "score": 3,
      "justification": "Passed 60% of tests; failed multiple edge cases..."
    },
    {
      "name": "Time/Space Complexity",
      "score": 2,
      "justification": "Time complexity was O(n^2) when optimal was O(n) — two tiers worse; space matched optimal."
    }
  ],
  "overall_feedback": "Strong code readability and problem understanding; however, clarity and communication need work. Missed handling of certain edge cases."
}"""

    try:
        # Call Gemini with the evaluation prompt
        response = analyze_with_gemini(
            api_key=api_key,
            model_name="gemini-1.5-flash",
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": evaluation_prompt}],
            temperature=0.1,  # Low temperature for consistent evaluation
            top_p=0.95,
            top_k=40,
            max_tokens=2048
        )
        
        # Parse the JSON response
        try:
            # Clean the response - remove any markdown code block markers
            cleaned_response = response.strip()
            
            # Remove markdown code block markers if present
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]   # Remove ```
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
                
            cleaned_response = cleaned_response.strip()
            
            evaluation_result = json.loads(cleaned_response)
            return evaluation_result
        except json.JSONDecodeError as e:
            # If response still isn't valid JSON, try to extract JSON from the response
            try:
                # Look for JSON object in the response
                import re
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    evaluation_result = json.loads(json_str)
                    return evaluation_result
                else:
                    raise e
            except:
                # If all parsing attempts fail, wrap it
                return {
                    "error": "Failed to parse evaluation response",
                    "raw_response": response,
                    "parse_error": str(e)
                }
            
    except Exception as e:
        raise Exception(f"Evaluation failed: {str(e)}")
