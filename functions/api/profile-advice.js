const ADVICE_MODEL = 'openai/gpt-oss-120b';

const SYSTEM = `Ты — Aurora Profile Coach.

Ты помогаешь школьнику улучшить профиль подготовки к университету.
Предложи 2–3 конкретных действия, которые подходят именно этому пользователю.

Не советуй улучшать то, что уже является сильной стороной.
Если IELTS/TOEFL уже высокие, не пиши "улучши английский".
Если SAT уже высокий, не советуй готовиться к SAT.

Запрещено: гарантировать поступление; придумывать требования вузов, дедлайны, баллы, стипендии и конкретные курсы.

Верни JSON:
{"intro":"string","recommendations":[{"title":"","why":"","firstStep":"","expectedResult":"","effort":"","category":""}]}`;

export async function onRequestPost(context) {
  const key = context.env?.GROQ_API_KEY;
  if (!key) {
    return Response.json({ mode: 'rules', intro: '', suggestions: [] }, { status: 200 });
  }
  try {
    const body = await context.request.json();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const groq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ADVICE_MODEL,
        temperature: 0.35,
        max_completion_tokens: 1600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(body) },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await groq.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed.recommendations) ? parsed.recommendations : parsed.suggestions;
    const suggestions = Array.isArray(rows)
      ? rows.slice(0, 3).map((row, index) => ({
          id: `ai-advice-${index + 1}`,
          title: String(row.title || '').slice(0, 140),
          reason: String(row.why || row.reason || '').slice(0, 420),
          firstStep: String(row.firstStep || '').slice(0, 320),
          expectedOutcome: String(row.expectedResult || row.expectedOutcome || '').slice(0, 320),
          suggestedEffort: String(row.effort || row.estimatedEffort || '1–2 недели'),
          category: 'advice',
          programId: null,
          opportunityId: null,
        }))
      : [];
    if (suggestions.length < 2) {
      return Response.json({ mode: 'rules', intro: '', suggestions: [] });
    }
    return Response.json({
      mode: 'ai',
      intro: String(parsed.intro || parsed.summary || ''),
      suggestions,
    });
  } catch {
    return Response.json({ mode: 'rules', intro: '', suggestions: [] });
  }
}
