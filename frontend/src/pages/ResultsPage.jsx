import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './results.css';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { evaluation } = location.state || {};

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
                
                {location.state?.metadata && (
                  <div className="interview-metadata">
                    <h4>Interview Information</h4>
                    <p><strong>Problem:</strong> {location.state.metadata.question}</p>
                    <p><strong>Language:</strong> {location.state.metadata.language}</p>
                    <p><strong>Duration:</strong> {Math.round(location.state.metadata.interviewDuration)} minutes</p>
                    {location.state.metadata.testResults && (
                      <p><strong>Test Results:</strong> {location.state.metadata.testResults.summary?.passed || 0}/{location.state.metadata.testResults.summary?.total || 0} tests passed</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
