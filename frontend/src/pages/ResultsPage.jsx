import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSessions } from '../hooks/useFirestore';
import './results.css';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createSessionWithFeedback } = useSessions();
  const [sessionId, setSessionId] = useState(null);
  const sessionCreationAttempted = useRef(false);
  const { 
    evaluation,
    interviewStartTime,
    evaluatedAt,
    questionId,
    question_title,
    language,
    testResults,
    interviewDuration,
    code,
    transcript
  } = location.state || {};
  
  console.log('All state data:', location.state);
  console.log('Question ID:', questionId);
  console.log('Evaluation:', evaluation);

  // Calculate final score from evaluation criteria using weighted scores
  const calculateFinalScore = useMemo(() => {
    if (!evaluation?.criteria) return 0;
    
    // Define weights for each criterion
    const criteriaWeights = {
      'Communication': 0.30,
      'Understanding': 0.20,
      'Clarity': 0.15,
      'Code Readability': 0.10,
      'Correctness': 0.20,
      'Time/Space Complexity': 0.05
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    evaluation.criteria.forEach(criterion => {
      const weight = criteriaWeights[criterion.name] || 0;
      // Convert score from 1-5 scale to 0-100 scale: (score - 1) / 4 * 100
      const normalizedScore = ((criterion.score - 1) / 4) * 100;
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    });
    
    // Return weighted average score out of 100
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight * 100) / 100 : 0;
  }, [evaluation]);

  // Get detailed breakdown of weighted scores
  const getScoreBreakdown = useMemo(() => {
    if (!evaluation?.criteria) return [];
    
    const criteriaWeights = {
      'Communication': 0.30,
      'Understanding': 0.20,
      'Clarity': 0.15,
      'Code Readability': 0.10,
      'Correctness': 0.20,
      'Time/Space Complexity': 0.05
    };
    
    return evaluation.criteria.map(criterion => {
      const weight = criteriaWeights[criterion.name] || 0;
      const normalizedScore = ((criterion.score - 1) / 4) * 100;
      const contribution = normalizedScore * weight;
      
      return {
        name: criterion.name,
        rawScore: criterion.score,
        normalizedScore: Math.round(normalizedScore * 100) / 100,
        weight: weight * 100, // Convert to percentage
        contribution: Math.round(contribution * 100) / 100,
        justification: criterion.justification
      };
    });
  }, [evaluation]);

  // Create session and feedback on component mount
  useEffect(() => {
    const uploadSessionAndFeedback = async () => {
      // Prevent multiple session creation attempts
      if (sessionCreationAttempted.current || sessionId || !evaluation || !interviewStartTime) {
        return;
      }

      // Create a unique identifier for this evaluation data
      const evaluationKey = `evaluation_${interviewStartTime}_${questionId}_${calculateFinalScore}`;
      const existingSessionId = sessionStorage.getItem(evaluationKey);
      
      // If we already have a session for this evaluation data, don't create another
      if (existingSessionId) {
        setSessionId(existingSessionId);
        console.log('Session already exists for this evaluation:', existingSessionId);
        return;
      }

      // Mark that we're attempting session creation
      sessionCreationAttempted.current = true;

      try {
        const endTime = new Date().toISOString();
        const finalScore = calculateFinalScore;
        
        const newSessionId = await createSessionWithFeedback({
          startTime: interviewStartTime,
          endTime: endTime,
          language,
          questionId,
          questionName: question_title,
          finalScore,
          evaluation,
          codeSubmission: code,
          transcript
        });
        
        setSessionId(newSessionId);
        // Store the session ID to prevent duplicates
        sessionStorage.setItem(evaluationKey, newSessionId);
        console.log('Session and feedback created with ID:', newSessionId);
      } catch (error) {
        console.error('Failed to create session and feedback:', error);
        // Reset the flag on error so user can retry if needed
        sessionCreationAttempted.current = false;
      }
    };

    uploadSessionAndFeedback();
  }, [evaluation, interviewStartTime, calculateFinalScore, questionId]); // Added necessary dependencies
  if (!evaluation) {
    return (
      <div className="results-page">
        <Navbar />
        <main className="content">
          <div className="error-container">
            <h1>No Evaluation Data</h1>
            <p>No evaluation data was found. Please complete an interview first.</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleReturnToDashboard = () => {
    navigate('/');
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'score-excellent';
    if (score >= 3) return 'score-good';
    if (score >= 2) return 'score-average';
    return 'score-poor';
  };

  const getScoreLabel = (score) => {
    if (score === 5) return 'Excellent';
    if (score === 4) return 'Good';
    if (score === 3) return 'Average';
    if (score === 2) return 'Below Average';
    return 'Poor';
  };

  return (
    <div className="results-page">
      <Navbar />
      <main className="content">
        <header className="page-header">
          <h1 className="page-title">Interview Evaluation Results</h1>
          <div className="header-controls">
            <button 
              className="btn-primary" 
              onClick={handleReturnToDashboard}
            >
              Return to Dashboard
            </button>
          </div>
        </header>

        <div className="results-container">
          {evaluation.error && !evaluation.criteria ? (
            <div className="error-section">
              <h2>Evaluation Error</h2>
              <p>There was an error processing your interview evaluation:</p>
              <pre className="error-details">{evaluation.error}</pre>
              {evaluation.raw_response && (
                <div className="raw-response">
                  <h3>Raw Response:</h3>
                  <pre>{evaluation.raw_response}</pre>
                </div>
              )}
              {evaluation.parse_error && (
                <div className="parse-error">
                  <h3>Parse Error:</h3>
                  <pre>{evaluation.parse_error}</pre>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="evaluation-summary">
                <h2>Evaluation by LeBron James, Senior Staff Engineer at Google</h2>
                <div className="final-score-display">
                  <h3>Final Score: <span className="final-score">{calculateFinalScore}/100</span></h3>
                  <p className="score-description">Weighted average based on interview criteria</p>
                </div>

                <div className="score-breakdown">
                  <h3>Score Breakdown</h3>
                  <div className="breakdown-table">
                    <div className="breakdown-header">
                      <span>Criterion</span>
                      <span>Score</span>
                      <span>Weight</span>
                      <span>Contribution</span>
                    </div>
                    {getScoreBreakdown.map((item, index) => (
                      <div key={index} className="breakdown-row">
                        <span className="criterion-name">{item.name}</span>
                        <span className="score-cell">
                          {item.rawScore}/5 ({item.normalizedScore}/100)
                        </span>
                        <span className="weight-cell">{item.weight}%</span>
                        <span className="contribution-cell">+{item.contribution}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="scores-grid">
                  {evaluation.criteria?.map((criterion, index) => (
                    <div key={index} className="score-card">
                      <div className="score-header">
                        <h3>{criterion.name}</h3>
                        <div className={`score-badge ${getScoreColor(criterion.score)}`}>
                          {criterion.score}/5
                        </div>
                      </div>
                      <div className="score-label">
                        {getScoreLabel(criterion.score)}
                      </div>
                      <div className="score-justification">
                        <p>{criterion.justification}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {evaluation.overall_feedback && (
                <div className="overall-feedback">
                  <h2>Overall Feedback</h2>
                  <div className="feedback-content">
                    <p>{evaluation.overall_feedback}</p>
                  </div>
                </div>
              )}

              <div className="evaluation-metadata">
                <h3>Evaluation Details</h3>
                <p><strong>Evaluator:</strong> LeBron James, Senior Staff Engineer at Google</p>
                <p><strong>Evaluation Date:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Scoring Scale:</strong> 1 (Not Demonstrated) to 5 (Excellent)</p>
                
                <div className="interview-metadata">
                  <h4>Interview Information</h4>
                  <p><strong>Problem:</strong> {question_title}</p>
                  <p><strong>Language:</strong> {language}</p>
                  <p><strong>Duration:</strong> {Math.round(interviewDuration)} minutes</p>
                  {testResults && (
                    <p><strong>Test Results:</strong> {testResults.summary?.passed || 0}/{testResults.summary?.total || 0} tests passed</p>
                  )}
                  {questionId && (
                    <p><strong>Question ID:</strong> {questionId}</p>
                  )}
                  {interviewStartTime && (
                    <p><strong>Interview Started:</strong> {new Date(interviewStartTime).toLocaleString()}</p>
                  )}
                  {evaluatedAt && (
                    <p><strong>Evaluated At:</strong> {evaluatedAt}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
