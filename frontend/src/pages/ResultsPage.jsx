import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/Navbar';
import { useSessions } from '../hooks/useFirestore';
import './results.css';

export default function ResultsPage({ 
  // Props for historical data (when used as reusable component)
  historicalData = null,
  isHistoryMode = false,
  onNavigateBack = null
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { createSessionWithFeedback } = useSessions();
  const [sessionId, setSessionId] = useState(null);
  const [expandedCriteria, setExpandedCriteria] = useState({});
  const sessionCreationAttempted = useRef(false);
  
  // Use either historical data or location state
  const sessionData = historicalData || location.state || {};
  const { 
    evaluation,
    interviewStartTime,
    questionId,
    question_title,
    language,
    testResults,
    interviewDuration,
    code,
    transcript,
    transcriptUrl
  } = sessionData;

  // Initialize all criteria as expanded by default
  React.useEffect(() => {
    if (evaluation?.criteria) {
      const initialExpanded = {};
      evaluation.criteria.forEach((_, index) => {
        initialExpanded[index] = true;
      });
      setExpandedCriteria(initialExpanded);
    }
  }, [evaluation]);
  
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

  // Handler functions for buttons
  const handleViewTranscript = async () => {
    try {
      let transcriptData = transcript;
      
      // If we don't have transcript but have transcriptUrl, fetch it
      if (!transcriptData && transcriptUrl) {
        const response = await fetch(transcriptUrl);
        if (response.ok) {
          const fetchedText = await response.text();
          try {
            transcriptData = JSON.parse(fetchedText);
          } catch {
            // If parsing fails, treat as plain text
            transcriptData = fetchedText;
          }
        } else {
          throw new Error('Failed to fetch transcript');
        }
      }

      if (transcriptData) {
        console.log('Transcript data:', transcriptData);
        
        // Format transcript content based on data type
        let formattedTranscript = '';
        
        if (Array.isArray(transcriptData)) {
          // Handle array format with role/content objects
          formattedTranscript = transcriptData.map(entry => {
            const role = entry.role === 'user' ? 'Candidate' : 'Interviewer';
            const roleClass = entry.role === 'user' ? 'user-message' : 'interviewer-message';
            return `<div class="message ${roleClass}">
              <div class="role">${role}:</div>
              <div class="content">${entry.content}</div>
            </div>`;
          }).join('');
        } else if (typeof transcriptData === 'string') {
          // Handle plain string format
          formattedTranscript = `<div class="transcript-content">${transcriptData}</div>`;
        } else {
          // Handle other formats
          formattedTranscript = `<div class="transcript-content">${JSON.stringify(transcriptData, null, 2)}</div>`;
        }

        // Create a new window to display the transcript
        const transcriptWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
        transcriptWindow.document.write(`
          <html>
            <head>
              <title>Interview Transcript</title>
              <style>
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  margin: 0;
                  padding: 20px; 
                  background: #1a1a1a; 
                  color: #e5e7eb; 
                  line-height: 1.6;
                }
                .header { 
                  border-bottom: 2px solid #404040; 
                  padding-bottom: 15px; 
                  margin-bottom: 25px; 
                  background: linear-gradient(145deg, #262626, #1a1a1a);
                  padding: 20px;
                  border-radius: 8px;
                  margin: -20px -20px 25px -20px;
                }
                .header h1 { 
                  margin: 0 0 10px 0; 
                  color: #60a5fa; 
                  font-size: 1.8rem;
                }
                .header p { 
                  margin: 5px 0; 
                  color: #9ca3af; 
                  font-size: 0.9rem;
                }
                .transcript-container {
                  max-width: 800px;
                  margin: 0 auto;
                }
                .message {
                  margin-bottom: 20px;
                  padding: 15px;
                  border-radius: 8px;
                  border-left: 4px solid;
                }
                .user-message {
                  background: linear-gradient(145deg, #1e3a8a, #1e40af);
                  border-left-color: #60a5fa;
                }
                .interviewer-message {
                  background: linear-gradient(145deg, #065f46, #047857);
                  border-left-color: #10b981;
                }
                .role {
                  font-weight: 600;
                  font-size: 0.9rem;
                  margin-bottom: 8px;
                  color: #ffffff;
                }
                .content {
                  font-size: 0.95rem;
                  white-space: pre-wrap;
                  line-height: 1.5;
                }
                .transcript-content { 
                  white-space: pre-wrap; 
                  line-height: 1.6;
                  font-family: monospace;
                  background: #262626;
                  padding: 20px;
                  border-radius: 8px;
                  border: 1px solid #404040;
                }
                .no-transcript {
                  text-align: center;
                  color: #9ca3af;
                  font-style: italic;
                  padding: 40px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>📝 Interview Transcript</h1>
                <p><strong>Question:</strong> ${question_title || 'Unknown'}</p>
                <p><strong>Language:</strong> ${language || 'Python'}</p>
                <p><strong>Date:</strong> ${new Date(interviewStartTime || Date.now()).toLocaleString()}</p>
              </div>
              <div class="transcript-container">
                ${formattedTranscript || '<div class="no-transcript">No transcript content available</div>'}
              </div>
            </body>
          </html>
        `);
        transcriptWindow.document.close();
      } else {
        alert('No transcript available for this session.');
      }
    } catch (error) {
      console.error('Error viewing transcript:', error);
      alert('Error loading transcript. Please try again.');
    }
  };

  const handleDownloadJSON = () => {
    try {
      // Create a comprehensive JSON object with all session data
      const sessionData = {
        sessionInfo: {
          sessionId: sessionId || (historicalData?.sessionId) || 'unknown',
          questionId,
          questionTitle: question_title,
          language: language || 'Python',
          interviewStartTime,
          interviewDuration,
          finalScore: Math.round(calculateFinalScore),
          isHistoricalData: isHistoryMode
        },
        evaluation: {
          overallScore: Math.round(calculateFinalScore),
          criteria: evaluation?.criteria || [],
          scoreBreakdown: getScoreBreakdown,
          summaryFeedback: evaluation?.summary_feedback || evaluation?.overall_feedback || ''
        },
        code: {
          finalSolution: code || '',
          language: language || 'Python'
        },
        testResults: testResults || null,
        transcript: transcript || 'No transcript available',
        metadata: {
          generatedAt: new Date().toISOString(),
          sessionId: sessionId || (historicalData?.sessionId) || 'unknown',
          mode: isHistoryMode ? 'history' : 'live'
        }
      };

      // Create and download the JSON file
      const dataStr = JSON.stringify(sessionData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      const filePrefix = isHistoryMode ? 'historical' : 'session';
      link.download = `interview-${filePrefix}-${questionId || 'unknown'}-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading JSON:', error);
      alert('Error creating download file. Please try again.');
    }
  };

  // Create session and feedback on component mount (only for new sessions, not history)
  useEffect(() => {
    // Skip session creation if in history mode or if we already have a sessionId
    if (isHistoryMode || sessionId || historicalData) {
      return;
    }

    const uploadSessionAndFeedback = async () => {
      // Prevent multiple session creation attempts
      if (sessionCreationAttempted.current || !evaluation || !interviewStartTime) {
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
  }, [evaluation, interviewStartTime, calculateFinalScore, questionId, isHistoryMode, historicalData, sessionId]); // Added dependencies
  if (!evaluation) {
    return (
      <div className="results-page">
        <Navbar />
        <main className="content">
          <div className="error-container">
            <h1>No Evaluation Data</h1>
            <p>No evaluation data was found. Please complete an interview first.</p>
            <button 
              onClick={() => {
                if (isHistoryMode && onNavigateBack) {
                  onNavigateBack();
                } else {
                  navigate('/');
                }
              }} 
              className="btn btn--primary"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleReturnToDashboard = () => {
    if (isHistoryMode && onNavigateBack) {
      onNavigateBack();
    } else {
      navigate('/');
    }
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

  const toggleCriteriaExpansion = (index) => {
    setExpandedCriteria(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="results-page">
      <Navbar />
      <main className="content">
        <div className="results-header">
          <h1>Feedback Overview</h1>
          <div className="results-meta">
            <span className="date">
              {new Date(interviewStartTime || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {isHistoryMode && (
              <span className="history-badge">Historical Session</span>
            )}
          </div>
        </div>

        <div className="results-grid">
          {/* Left Column - Score Overview with Summary */}
          <div className="score-summary-column">
            <div className="score-summary-card">
              {/* Question info moved into score card */}
              <div className="question-info">
                <h3 className="question-title">
                  {question_title || "Two Pointers - Remove Duplicates from Sorted Array"}
                </h3>
                <div className="question-meta">
                  <span className="language-indicator capitalize">
                    <span className="language-icon"><FontAwesomeIcon icon={faLanguage} /></span>
                    {language || "Python"}
                  </span>
                  <div className="tags">
                    <span className="tag">two-pointers</span>
                    <span className="tag">arrays</span>
                    <span className="tag">in-place</span>
                    <span className="tag">easy-medium</span>
                  </div>
                </div>
              </div>

              <div className="score-circle-container">
                <div className="score-circle">
                  <svg className="progress-ring" width="120" height="120">
                    <circle
                      className="progress-ring-circle"
                      stroke="#1e293b"
                      strokeWidth="8"
                      fill="transparent"
                      r="52"
                      cx="60"
                      cy="60"
                    />
                    <circle
                      className="progress-ring-circle progress"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="transparent"
                      r="52"
                      cx="60"
                      cy="60"
                      strokeDasharray={`${2 * Math.PI * 52 * (calculateFinalScore / 100)} ${2 * Math.PI * 52}`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="score-text">
                    <span className="score-number">{Math.round(calculateFinalScore)}</span>
                    <span className="score-label">Final Score</span>
                  </div>
                </div>
              </div>
              
              <div className="score-details">
                <p>Avg Criteria: {evaluation?.criteria ? (evaluation.criteria.reduce((sum, criterion) => sum + criterion.score, 0) / evaluation.criteria.length).toFixed(1) : 0}/5.0</p>
                <div className="action-buttons">
                  <button className="btn btn--ghost" onClick={handleViewTranscript}>View transcript</button>
                  <button className="btn btn--ghost" onClick={handleDownloadJSON}>Download JSON</button>
                  {isHistoryMode && (
                    <button className="btn btn--ghost" onClick={handleReturnToDashboard}>
                      Return to Dashboard
                    </button>
                  )}
                </div>
              </div>

              {/* Summary Feedback integrated */}
              <div className="summary-feedback-section">
                <h3>Summary feedback</h3>
                <div className="feedback-content">
                  {evaluation.overall_feedback ? (
                    <p>{evaluation.overall_feedback}</p>
                  ) : (
                    <p>Strong demonstration of the two-pointer technique and clear reasoning about time/space complexity. Consider iterating through process more consistently and adding brief comments for future maintenance. Great job overall.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Code Submission below */}
            <div className="code-submission">
              <div className="code-header">
                <h2>Code submission</h2>
                <span className="final-solution">Your final solution</span>
              </div>
              <div className="code-container">
                <button className="btn btn--ghost copy-btn">Copy</button>
                <pre className="code-block">
                  <code>
{code || `def remove_duplicates(nums):
    if not nums:
        return 0
    
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[read - 1]:
            nums[write] = nums[read]
            write += 1
    return write

arr = [0,0,1,1,1,2,2,3,4]
k = remove_duplicates(arr)
print(k, arr[:k])  # [0, 1, 2, 3, 4]`}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Right Column - Criteria Breakdown */}
          <div className="criteria-breakdown">
            <h2>Criteria breakdown</h2>
            <p className="breakdown-subtitle">Detailed rubric scores with explanation</p>
            
            <div className="criteria-list">
              {evaluation.criteria?.map((criterion, index) => (
                <div key={index} className="criteria-item">
                  <div className="criteria-header">
                    <div className="criteria-title">
                      <span className="criteria-name">{criterion.name}</span>
                      <div className="score-bar">
                        <div 
                          className="score-fill" 
                          style={{ width: `${(criterion.score / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="criteria-score">Score: {criterion.score}/5</span>
                    <button 
                      className="btn btn--ghost btn--sm show-reasoning"
                      onClick={() => toggleCriteriaExpansion(index)}
                    >
                      {expandedCriteria[index] === false ? 'Show reasoning' : 'Hide reasoning'}
                      <span className={`dropdown-arrow ${expandedCriteria[index] === false ? '' : 'expanded'}`}>
                        ▼
                      </span>
                    </button>
                  </div>
                  {expandedCriteria[index] !== false && (
                    <div className="criteria-content">
                      <p>{criterion.justification}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
