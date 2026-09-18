const jsonHeaders = { 'Content-Type': 'application/json' };

export function json(statusCode, payload) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  };
}

export function groqKey() {
  const key = process.env.GROQ_API_KEY;
  return key && String(key).trim() ? String(key).trim() : '';
}
