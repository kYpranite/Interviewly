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

export async function updateAIContext({ code, language }, clientId) {
  const headers = { 'Content-Type': 'application/json' };
  if (clientId) headers['X-Client-Id'] = clientId;
  const resp = await fetch('/api/ai/update_context', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, language })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Failed to update AI context');
  return data; // { ok, bytes }
}
