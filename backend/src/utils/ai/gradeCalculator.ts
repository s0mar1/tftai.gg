import { GradeInfo } from '../../types/ai';

export function createGradeInfo(gradeString: string): GradeInfo {
  const gradeColors: Record<string, { color: string; description: string }> = {
    'S': { color: '#FFD700', description: '완벽한 게임 플레이' },
    'A': { color: '#10B981', description: '우수한 성과' },
    'B': { color: '#3B82F6', description: '양호한 성과' },
    'C': { color: '#F59E0B', description: '평균적인 성과' },
    'D': { color: '#EF4444', description: '개선 필요' },
    'F': { color: '#DC143C', description: '많은 개선 필요' },
    'N/A': { color: '#6B7280', description: '분석 진행 중' }
  };
  
  const grade = gradeString || 'C';
  return {
    grade,
    color: gradeColors[grade]?.color || '#6B7280',
    description: gradeColors[grade]?.description || '분석 진행 중'
  };
}

export function calculateGradeFromScore(totalScore: number): string {
  if (totalScore >= 95) return 'S';
  if (totalScore >= 85) return 'A';
  if (totalScore >= 70) return 'B';
  if (totalScore >= 55) return 'C';
  if (totalScore >= 40) return 'D';
  return 'F';
}

export function normalizeScore(score: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, Math.round(score)));
}