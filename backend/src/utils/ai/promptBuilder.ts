import { ChatMessage } from '../../types/ai';

export function buildAnalysisPrompt(
  playerData: string,
  metaData: string,
  systemRole: string,
  context: string,
  format: string
): string {
  return `
${systemRole}

${context}

현재 메타 덱 정보:
${metaData}

${playerData}

${format}

중요: 반드시 위의 형식을 정확히 지켜서 답변해주세요.
  `.trim();
}

export function buildQnAPrompt(
  question: string,
  history: ChatMessage[],
  systemRole: string,
  context: string,
  format: string
): string {
  const historyText = history.length > 0 ? 
    history.map(msg => `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}`).join('\n') :
    '대화 기록이 없습니다.';

  return `
${systemRole}

${context}

이전 대화 기록:
${historyText}

현재 질문: ${question}

${format}

위의 형식에 맞춰서 친근하고 도움이 되는 답변을 해주세요.
  `.trim();
}

export function sanitizeAIResponse(response: string): string {
  // 불필요한 마크다운 문법 제거
  return response
    .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
    .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
    .replace(/\*(.*?)\*/g, '$1') // 이탤릭 제거
    .replace(/#{1,6}\s*/g, '') // 헤더 제거
    .replace(/^\s*[-*+]\s*/gm, '• ') // 리스트 마커 통일
    .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 제거
    .trim();
}

export function extractKeyInsights(response: string): string[] {
  const insightPatterns = [
    /핵심 인사이트[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|\n-|\n\*|$)/s,
    /주요 발견사항[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|\n-|\n\*|$)/s,
    /중요 포인트[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n\d+\.|\n-|\n\*|$)/s
  ];

  for (const pattern of insightPatterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && (line.startsWith('-') || line.startsWith('•')))
        .map(line => line.replace(/^[-•]\s*/, ''))
        .filter(line => line.length > 0);
    }
  }

  return [];
}

export function extractImprovements(response: string): string[] {
  const improvementPatterns = [
    /개선 사항[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n다음|\n결론|$)/s,
    /개선 방안[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n다음|\n결론|$)/s,
    /추천 사항[:\s]*(.*?)(?=\n\n|\n[A-Z]|\n다음|\n결론|$)/s
  ];

  for (const pattern of improvementPatterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && (line.startsWith('-') || line.startsWith('•')))
        .map(line => line.replace(/^[-•]\s*/, ''))
        .filter(line => line.length > 0);
    }
  }

  return [];
}