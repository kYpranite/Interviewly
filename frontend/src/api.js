// Minimal API helpers for frontend -> backend

export async function getSpeechToken() {
  const resp = await fetch('/api/azure_token');
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'Failed to get speech token');
  return data; // { token, region, endpoint? }
}

export async function sendToAI(messages) {
  const resp = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || 'AI analyze failed');
  return data; // { text }
}
