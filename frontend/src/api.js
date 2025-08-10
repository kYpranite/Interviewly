// Minimal API helpers for frontend -> backend

export async function getSpeechToken() {
  const resp = await fetch('/api/azure_token');
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Failed to get speech token');
  return data; // { token, region, endpoint? }
}

export async function sendToAI(messages, clientId) {
  const headers = { 'Content-Type': 'application/json' };
  if (clientId) headers['X-Client-Id'] = clientId;
  const resp = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'AI analyze failed');
  return data; // { text }
}

export async function updateAIContext({ code, language, question }, clientId) {
  const headers = { 'Content-Type': 'application/json' };
  if (clientId) headers['X-Client-Id'] = clientId;
  const resp = await fetch('/api/ai/update_context', {
    method: 'POST',
    headers,
  body: JSON.stringify({ code, language, question })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Failed to update AI context');
  return data; // { ok, bytes }
}

export async function runCode(code, language, question) {
  const resp = await fetch('/api/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      language,
      test_cases: question.test_cases,
      timeout: question.timeout,
      checker: question.checker,
      function: question.function
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Code execution failed');
  return data; // { summary, results }
}

export async function evaluateInterview({ transcript, codeSubmission, language, testResults, question }) {
  const resp = await fetch('/api/evaluation/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      code_submission: codeSubmission,
      language,
      test_results: testResults,
      question
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Interview evaluation failed');
  return data; // { success, evaluation }
}
