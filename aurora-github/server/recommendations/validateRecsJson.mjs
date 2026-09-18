// Проверка структурированного ответа Groq для /api/recommendations.

/**
 * @param {string} raw JSON-текст модели
 * @param {number[]} candidateIds id программ, которые реально передали модели
 */
export function validateRecsJson(raw, candidateIds) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'empty' };

  const idSet = new Set(candidateIds);
  const recsIn = Array.isArray(data.recommendations) ? data.recommendations : [];
  const seen = new Set();
  const recommendations = [];

  for (const row of recsIn) {
    if (!row || typeof row !== 'object') continue;
    const programId = Number(row.programId);
    if (!idSet.has(programId) || seen.has(programId)) continue;
    seen.add(programId);
    recommendations.push({
      programId,
      whyItFits: Array.isArray(row.whyItFits) ? row.whyItFits.map(String).slice(0, 8) : [],
      preparationAdvice: Array.isArray(row.preparationAdvice) ? row.preparationAdvice.map(String).slice(0, 8) : [],
      questionsToClarify: Array.isArray(row.questionsToClarify) ? row.questionsToClarify.map(String).slice(0, 8) : [],
    });
  }

  if (recommendations.length === 0) return { ok: false, error: 'no_valid_recommendations' };

  const next = data.nextAction && typeof data.nextAction === 'object' ? data.nextAction : {};
  let nextProgramId = next.programId == null ? null : Number(next.programId);
  if (nextProgramId != null && !idSet.has(nextProgramId)) nextProgramId = null;

  const developmentActions = [];
  for (const row of Array.isArray(data.developmentActions) ? data.developmentActions : []) {
    if (!row || typeof row !== 'object') continue;
    developmentActions.push({
      id: String(row.id || '').slice(0, 80),
      title: String(row.title || '').slice(0, 160),
      reason: String(row.reason || '').slice(0, 400),
      firstStep: String(row.firstStep || '').slice(0, 300),
      expectedOutcome: String(row.expectedOutcome || '').slice(0, 300),
      suggestedEffort: String(row.suggestedEffort || '').slice(0, 180),
      category: row.category === 'requirement' ? 'requirement' : 'advice',
      programId: row.programId == null ? null : Number(row.programId),
      opportunityId: row.opportunityId == null || row.opportunityId === '' ? null : String(row.opportunityId).slice(0, 80),
    });
  }

  return {
    ok: true,
    value: {
      mode: 'ai',
      aiAvailable: true,
      profileSummary: String(data.profileSummary || '').slice(0, 500),
      strengths: Array.isArray(data.strengths) ? data.strengths.map(String).slice(0, 6) : [],
      constraints: Array.isArray(data.constraints) ? data.constraints.map(String).slice(0, 6) : [],
      missingInformation: Array.isArray(data.missingInformation) ? data.missingInformation.map(String).slice(0, 6) : [],
      recommendations,
      nextAction: {
        title: String(next.title || 'Изучи требования выбранной программы').slice(0, 180),
        description: String(next.description || '').slice(0, 400),
        programId: nextProgramId,
      },
      developmentActions: developmentActions.slice(0, 8),
    },
  };
}
