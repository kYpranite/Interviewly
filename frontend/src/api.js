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

// Simple client-side throttle/dedupe for updateAIContext calls per client
const __ctxRate = new Map(); // clientId -> { lastAt: number, lastHash: string }
function hashContext(code, language, question) {
  try {
    const qId = question?.id || `${question?.title || ''}|${question?.function || ''}|${Array.isArray(question?.args) ? question.args.join(',') : ''}`;
    // Lightweight hash: length + small rolling hash of a slice
    const s = (code || '').slice(-1024); // last 1KB
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return `${code?.length || 0}|${language || 'unknown'}|${qId}|${h >>> 0}`;
  } catch {
    return `${code?.length || 0}|${language || 'unknown'}`;
  }
}

export async function updateAIContext({ code, language, question }, clientId) {
  const id = clientId || 'default';
  const now = Date.now();
  const hash = hashContext(code, language, question);
  const entry = __ctxRate.get(id) || { lastAt: 0, lastHash: '' };
  const since = now - entry.lastAt;

  // Skip if identical content sent within 10s
  if (entry.lastHash === hash && since < 10000) {
    return { ok: true, skipped: true, reason: 'identical_recent' };
  }
  // Throttle hard to max ~2 requests/sec per client
  if (since < 500) {
    return { ok: true, skipped: true, reason: 'throttled' };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (clientId) headers['X-Client-Id'] = clientId;
  const resp = await fetch('/api/ai/update_context', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, language, question })
  });
  const data = await resp.json();
  if (resp.ok) {
    __ctxRate.set(id, { lastAt: now, lastHash: hash });
  }
  if (!resp.ok) throw new Error(data?.error || 'Failed to update AI context');
  return data; // { ok, bytes }
}

export async function analyzeAIContext(clientId) {
  const headers = { 'Content-Type': 'application/json' };
  if (clientId) headers['X-Client-Id'] = clientId;
  const resp = await fetch('/api/ai/analyze_context', {
    method: 'POST',
    headers
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'AI analyze (context) failed');
  return data; // { text }
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

export async function evaluateInterview({ transcript, codeSubmission, language, testResults, question, interviewStartTime }) {
  const resp = await fetch('/api/evaluation/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      code_submission: codeSubmission,
      language,
      test_results: testResults,
      question,
      interviewStartTime
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Interview evaluation failed');
  return data; // { success, evaluation }
}
