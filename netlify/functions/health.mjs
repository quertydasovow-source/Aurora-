import { groqKey, json } from '../lib/http.mjs';
import { loadCatalog } from '../../src/lib/recommendations/catalogLoader.ts';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return json(405, { notice: 'GET or POST only' });
  }

  const configured = Boolean(groqKey());
  let catalogPrograms = 0;
  try {
    catalogPrograms = loadCatalog().programCount;
  } catch {
    catalogPrograms = 0;
  }

  return json(200, {
    ok: true,
    groqConfigured: configured,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    adviceModel: process.env.GROQ_ADVICE_MODEL || 'openai/gpt-oss-120b',
    mode: configured ? 'ai-ready' : 'rules',
    catalogPrograms,
  });
}
