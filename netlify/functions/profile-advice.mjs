import Groq from 'groq-sdk';
import {
  ADVICE_JSON_SCHEMA,
  ADVICE_SYSTEM_PROMPT,
  fallbackProfileAdvice,
  parseAdviceJson,
  toAdviceContext,
} from '../../src/lib/recommendations/profileAdvice.ts';
import { groqKey, json } from '../lib/http.mjs';
import { sanitizeProfile } from '../lib/sanitizeProfile.mjs';

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const ADVICE_MODEL = process.env.GROQ_ADVICE_MODEL || 'openai/gpt-oss-120b';
const ADVICE_TIMEOUT_MS = 12_000;

function asRules(profile) {
  const fallback = fallbackProfileAdvice(profile);
  return json(200, { mode: 'rules', intro: fallback.intro, suggestions: fallback.suggestions });
}

function extractFailedGeneration(error) {
  const direct = error?.error?.failed_generation;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const message = String(error?.message || '');
  const brace = message.indexOf('{');
  if (brace < 0) return '';
  try {
    const parsed = JSON.parse(message.slice(brace));
    const failed = parsed?.error?.failed_generation;
    return typeof failed === 'string' ? failed.trim() : '';
  } catch {
    return '';
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Content-Type': 'application/json' } };
  if (event.httpMethod !== 'POST') return json(405, { notice: 'POST only' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { notice: 'Некорректный JSON.' });
  }

  const sanitized = sanitizeProfile(body?.profile);
  if (sanitized.error) return json(400, { notice: sanitized.error });
  const profile = sanitized.profile;

  const incoming = Array.isArray(body?.items) ? body.items.slice(0, 4) : [];
  const items = incoming.map((item) => ({
    program:
      item?.program && typeof item.program === 'object'
        ? {
            program: String(item.program.program || ''),
            university: String(item.program.university || ''),
            field: String(item.program.field || ''),
          }
        : null,
    requirementsToComplete: Array.isArray(item?.requirementsToComplete)
      ? item.requirementsToComplete.slice(0, 4).map(String)
      : [],
    whyItFits: Array.isArray(item?.whyItFits) ? item.whyItFits.slice(0, 3).map(String) : [],
  }));
  const diagnostics =
    body?.diagnostics && typeof body.diagnostics === 'object'
      ? {
          strengths: Array.isArray(body.diagnostics.strengths) ? body.diagnostics.strengths.slice(0, 8).map(String) : [],
          gaps: Array.isArray(body.diagnostics.gaps) ? body.diagnostics.gaps.slice(0, 8).map(String) : [],
          thingsToClarify: Array.isArray(body.diagnostics.thingsToClarify)
            ? body.diagnostics.thingsToClarify.slice(0, 8).map(String)
            : [],
        }
      : undefined;

  const context = toAdviceContext(profile, items, diagnostics);
  const key = groqKey();
  if (!key) return asRules(profile);

  const groqClient = new Groq({ apiKey: key });
  const models = [ADVICE_MODEL];
  if (ADVICE_MODEL !== MODEL) models.push(MODEL);

  try {
    let parsed = null;
    for (const model of models) {
      try {
        const response = await groqClient.chat.completions.create(
          {
            model,
            temperature: 0.35,
            max_completion_tokens: 1600,
            reasoning_effort: 'low',
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'aurora_profile_advice', strict: true, schema: ADVICE_JSON_SCHEMA },
            },
            messages: [
              { role: 'system', content: ADVICE_SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(context) },
            ],
          },
          { timeout: ADVICE_TIMEOUT_MS },
        );
        const raw = response.choices?.[0]?.message?.content || '';
        parsed = parseAdviceJson(JSON.parse(raw), profile);
        if (parsed) break;
      } catch (error) {
        const recovered = extractFailedGeneration(error);
        if (recovered) {
          try {
            parsed = parseAdviceJson(JSON.parse(recovered), profile);
            if (parsed) break;
          } catch {
            /* continue */
          }
        }
      }
    }
    if (!parsed) return asRules(profile);
    return json(200, { mode: 'ai', intro: parsed.intro, suggestions: parsed.suggestions });
  } catch (error) {
    console.error('[profile-advice] Groq error', error?.message || error);
    return asRules(profile);
  }
}
