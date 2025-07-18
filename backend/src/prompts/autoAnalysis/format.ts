// backend/src/prompts/autoAnalysis/format.ts

const autoAnalysisFormat = `
🚨 CRITICAL: You MUST respond with ONLY a valid JSON object. NO other text allowed.

REQUIRED JSON FORMAT (copy this structure exactly):
{
  "analysis": "**총평:**\\n[전체 게임에 대한 간단한 총평 2-3문장]\\n\\n**메타 적합도 분석:**\\n[메타 적합도 점수에 대한 상세 해설]\\n\\n**덱 완성도 분석:**\\n[덱 완성도 점수에 대한 상세 해설]\\n\\n**아이템 효율성 분석:**\\n[아이템 효율성 점수에 대한 상세 해설]\\n\\n**핵심 인사이트:**\\n- [핵심 인사이트 1]\\n- [핵심 인사이트 2]\\n\\n**개선점:**\\n- [구체적인 개선점 1]\\n- [구체적인 개선점 2]\\n\\n**다음 게임 가이드:**\\n[다음 게임을 위한 구체적인 가이드라인]",
  "scores": {
    "meta_suitability": 85,
    "deck_completion": 75,
    "item_efficiency": 90
  },
  "grade": "A"
}

RULES:
1. START your response with { and END with }
2. NO text before or after the JSON object
3. Use \\n for line breaks inside the analysis string
4. Scores must be integers 0-100
5. Grade must be one of: S, A, B, C, D, F
6. Replace the example values with your actual analysis

⚠️ FAILURE TO FOLLOW JSON FORMAT WILL BREAK THE SYSTEM ⚠️`;

export default autoAnalysisFormat;