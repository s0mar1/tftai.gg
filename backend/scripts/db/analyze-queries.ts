#!/usr/bin/env tsx
/**
 * 데이터베이스 쿼리 분석 스크립트
 * 느린 쿼리 로그를 분석하고 최적화 권장사항을 제공
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { slowQueryDetector } from '../../src/utils/slow-query-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QueryAnalysis {
  pattern: string;
  count: number;
  avgDuration: number;
  maxDuration: number;
  collections: string[];
  operations: string[];
  suggestions: string[];
}

interface OptimizationSuggestion {
  type: 'index' | 'query' | 'schema' | 'performance';
  priority: 'high' | 'medium' | 'low';
  collection: string;
  description: string;
  implementation: string;
  estimatedImprovement: string;
}

/**
 * 쿼리 패턴 분석
 */
function analyzeQueryPatterns(queries: any[]): QueryAnalysis[] {
  const patterns = new Map<string, {
    queries: any[];
    durations: number[];
  }>();

  // 쿼리 패턴 그룹화
  queries.forEach(query => {
    const pattern = createQueryPattern(query.query);
    if (!patterns.has(pattern)) {
      patterns.set(pattern, { queries: [], durations: [] });
    }
    patterns.get(pattern)!.queries.push(query);
    patterns.get(pattern)!.durations.push(query.duration);
  });

  // 분석 결과 생성
  const analyses: QueryAnalysis[] = [];
  
  patterns.forEach((data, pattern) => {
    const durations = data.durations;
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    
    const collections = [...new Set(data.queries.map(q => q.collection))];
    const operations = [...new Set(data.queries.map(q => q.operation))];
    
    analyses.push({
      pattern,
      count: data.queries.length,
      avgDuration,
      maxDuration,
      collections,
      operations,
      suggestions: generatePatternSuggestions(pattern, data.queries)
    });
  });

  return analyses.sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * 쿼리 패턴 생성
 */
function createQueryPattern(query: Record<string, any>): string {
  const normalized = normalizeQuery(query);
  return JSON.stringify(normalized, null, 0);
}

/**
 * 쿼리 정규화 (값들을 플레이스홀더로 변경)
 */
function normalizeQuery(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeQuery(item));
  }
  
  if (obj && typeof obj === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        normalized[key] = '<string>';
      } else if (typeof value === 'number') {
        normalized[key] = '<number>';
      } else if (typeof value === 'boolean') {
        normalized[key] = '<boolean>';
      } else if (value instanceof Date) {
        normalized[key] = '<date>';
      } else if (value === null) {
        normalized[key] = null;
      } else if (typeof value === 'object') {
        normalized[key] = normalizeQuery(value);
      } else {
        normalized[key] = '<value>';
      }
    }
    return normalized;
  }
  
  return obj;
}

/**
 * 패턴별 최적화 제안 생성
 */
function generatePatternSuggestions(pattern: string, queries: any[]): string[] {
  const suggestions: string[] = [];
  const sampleQuery = queries[0];
  
  // 컬렉션 스캔 감지
  if (pattern.includes('{}') || Object.keys(sampleQuery.query).length === 0) {
    suggestions.push('전체 컬렉션 스캔이 감지됨 - 적절한 인덱스 추가 필요');
  }
  
  // 정규식 사용 감지
  if (pattern.includes('$regex')) {
    suggestions.push('정규식 사용 감지 - 텍스트 인덱스 사용 고려');
  }
  
  // 정렬 없는 limit 감지
  if (pattern.includes('$limit') && !pattern.includes('$sort')) {
    suggestions.push('정렬 없는 limit 사용 - 정렬 추가 또는 인덱스 최적화 필요');
  }
  
  // 복잡한 $or 조건 감지
  if (pattern.includes('$or') && pattern.match(/\$or/g)?.length! > 1) {
    suggestions.push('복잡한 $or 조건 - 쿼리 분할 또는 인덱스 전략 재검토 필요');
  }
  
  // 범위 쿼리 감지
  if (pattern.includes('$gte') || pattern.includes('$lte') || pattern.includes('$gt') || pattern.includes('$lt')) {
    suggestions.push('범위 쿼리 감지 - 복합 인덱스 최적화 고려');
  }
  
  return suggestions;
}

/**
 * 최적화 권장사항 생성
 */
function generateOptimizationSuggestions(analyses: QueryAnalysis[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  analyses.forEach(analysis => {
    if (analysis.avgDuration > 3000) { // 3초 이상
      suggestions.push({
        type: 'performance',
        priority: 'high',
        collection: analysis.collections[0],
        description: `매우 느린 쿼리 패턴 (평균 ${analysis.avgDuration.toFixed(0)}ms)`,
        implementation: '쿼리 재설계 또는 데이터 구조 최적화 필요',
        estimatedImprovement: '50-80%'
      });
    }
    
    if (analysis.count > 100) { // 자주 실행되는 쿼리
      suggestions.push({
        type: 'index',
        priority: 'high',
        collection: analysis.collections[0],
        description: `자주 실행되는 쿼리 (${analysis.count}회)`,
        implementation: '전용 인덱스 생성 또는 캐싱 적용',
        estimatedImprovement: '30-60%'
      });
    }
    
    // 패턴별 구체적 제안
    analysis.suggestions.forEach(suggestion => {
      if (suggestion.includes('컬렉션 스캔')) {
        suggestions.push({
          type: 'index',
          priority: 'high',
          collection: analysis.collections[0],
          description: '컬렉션 스캔 최적화',
          implementation: '쿼리 필드에 대한 인덱스 생성',
          estimatedImprovement: '80-95%'
        });
      }
      
      if (suggestion.includes('정규식')) {
        suggestions.push({
          type: 'index',
          priority: 'medium',
          collection: analysis.collections[0],
          description: '정규식 쿼리 최적화',
          implementation: '텍스트 인덱스 생성 또는 부분 문자열 인덱스 사용',
          estimatedImprovement: '40-70%'
        });
      }
    });
  });
  
  return suggestions;
}

/**
 * 인덱스 제안 생성
 */
function generateIndexSuggestions(analyses: QueryAnalysis[]): Array<{
  collection: string;
  fields: Record<string, 1 | -1>;
  description: string;
  priority: 'high' | 'medium' | 'low';
}> {
  const indexSuggestions: Array<{
    collection: string;
    fields: Record<string, 1 | -1>;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];
  
  // 컬렉션별 자주 사용되는 필드 분석
  const collectionFields = new Map<string, Map<string, number>>();
  
  analyses.forEach(analysis => {
    analysis.collections.forEach(collection => {
      if (!collectionFields.has(collection)) {
        collectionFields.set(collection, new Map());
      }
      
      const fields = collectionFields.get(collection)!;
      
      // 쿼리 패턴에서 필드 추출 (단순화된 버전)
      const pattern = analysis.pattern;
      const fieldMatches = pattern.match(/"([^"]+)":/g);
      
      if (fieldMatches) {
        fieldMatches.forEach(match => {
          const field = match.slice(1, -2); // 따옴표와 콜론 제거
          fields.set(field, (fields.get(field) || 0) + analysis.count);
        });
      }
    });
  });
  
  // 인덱스 제안 생성
  collectionFields.forEach((fields, collection) => {
    const sortedFields = Array.from(fields.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // 상위 5개 필드
    
    if (sortedFields.length > 0) {
      const indexFields: Record<string, 1 | -1> = {};
      sortedFields.forEach(([field]) => {
        indexFields[field] = 1;
      });
      
      indexSuggestions.push({
        collection,
        fields: indexFields,
        description: `자주 사용되는 필드들에 대한 복합 인덱스`,
        priority: 'high'
      });
    }
  });
  
  return indexSuggestions;
}

/**
 * 리포트 생성
 */
function generateReport(analyses: QueryAnalysis[], suggestions: OptimizationSuggestion[]): string {
  let report = '# 🔍 데이터베이스 쿼리 분석 리포트\n\n';
  
  report += `생성 시간: ${new Date().toLocaleString()}\n\n`;
  
  // 요약
  report += '## 📊 요약\n\n';
  report += `- 분석된 쿼리 패턴: ${analyses.length}개\n`;
  report += `- 최적화 권장사항: ${suggestions.length}개\n`;
  report += `- 평균 실행 시간: ${analyses.reduce((sum, a) => sum + a.avgDuration, 0) / analyses.length}ms\n\n`;
  
  // 상위 느린 쿼리 패턴
  report += '## 🐌 상위 느린 쿼리 패턴\n\n';
  analyses.slice(0, 10).forEach((analysis, index) => {
    report += `### ${index + 1}. ${analysis.collections[0]} - ${analysis.operations[0]}\n`;
    report += `- 실행 횟수: ${analysis.count}회\n`;
    report += `- 평균 실행 시간: ${analysis.avgDuration.toFixed(2)}ms\n`;
    report += `- 최대 실행 시간: ${analysis.maxDuration.toFixed(2)}ms\n`;
    report += `- 쿼리 패턴: \`${analysis.pattern}\`\n`;
    
    if (analysis.suggestions.length > 0) {
      report += '- 제안사항:\n';
      analysis.suggestions.forEach(suggestion => {
        report += `  - ${suggestion}\n`;
      });
    }
    report += '\n';
  });
  
  // 최적화 권장사항
  report += '## 💡 최적화 권장사항\n\n';
  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');
  const lowPriority = suggestions.filter(s => s.priority === 'low');
  
  if (highPriority.length > 0) {
    report += '### 🚨 높은 우선순위\n\n';
    highPriority.forEach((suggestion, index) => {
      report += `${index + 1}. **${suggestion.collection}** - ${suggestion.description}\n`;
      report += `   - 구현: ${suggestion.implementation}\n`;
      report += `   - 예상 개선 효과: ${suggestion.estimatedImprovement}\n\n`;
    });
  }
  
  if (mediumPriority.length > 0) {
    report += '### ⚠️ 중간 우선순위\n\n';
    mediumPriority.forEach((suggestion, index) => {
      report += `${index + 1}. **${suggestion.collection}** - ${suggestion.description}\n`;
      report += `   - 구현: ${suggestion.implementation}\n`;
      report += `   - 예상 개선 효과: ${suggestion.estimatedImprovement}\n\n`;
    });
  }
  
  return report;
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    console.log('🔍 데이터베이스 쿼리 분석 시작...');
    
    // 느린 쿼리 데이터 로드
    const { queries, summary } = await slowQueryDetector.analyzeSlowQueries(1000);
    
    if (queries.length === 0) {
      console.log('📊 분석할 느린 쿼리가 없습니다.');
      console.log('💡 애플리케이션을 실행하여 쿼리 로그를 생성하세요.');
      return;
    }
    
    console.log(`📊 총 ${queries.length}개의 느린 쿼리를 분석합니다.`);
    
    // 쿼리 패턴 분석
    const analyses = analyzeQueryPatterns(queries);
    
    // 최적화 권장사항 생성
    const suggestions = generateOptimizationSuggestions(analyses);
    
    // 인덱스 제안 생성
    const indexSuggestions = generateIndexSuggestions(analyses);
    
    // 리포트 생성
    const report = generateReport(analyses, suggestions);
    
    // 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 분석 결과');
    console.log('='.repeat(60));
    
    console.log(`\n📈 쿼리 통계:`);
    console.log(`   총 쿼리: ${summary.total}개`);
    console.log(`   평균 실행 시간: ${summary.averageDuration.toFixed(2)}ms`);
    console.log(`   컬렉션별 분포: ${Object.entries(summary.byCollection).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    console.log(`   심각도별 분포: ${Object.entries(summary.bySeverity).map(([k, v]) => `${k}(${v})`).join(', ')}`);
    
    console.log(`\n🔍 분석된 패턴: ${analyses.length}개`);
    console.log(`💡 최적화 권장사항: ${suggestions.length}개`);
    console.log(`📋 인덱스 제안: ${indexSuggestions.length}개`);
    
    // 상위 5개 느린 패턴
    console.log('\n🐌 상위 느린 쿼리 패턴:');
    analyses.slice(0, 5).forEach((analysis, index) => {
      console.log(`   ${index + 1}. ${analysis.collections[0]} (${analysis.avgDuration.toFixed(0)}ms, ${analysis.count}회)`);
    });
    
    // 우선순위 높은 제안
    const highPriority = suggestions.filter(s => s.priority === 'high');
    if (highPriority.length > 0) {
      console.log('\n🚨 높은 우선순위 최적화:');
      highPriority.slice(0, 3).forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.collection}: ${suggestion.description}`);
      });
    }
    
    // 리포트 파일 저장
    const reportPath = path.join(__dirname, '../../../query-analysis-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 상세 리포트: ${reportPath}`);
    
    // JSON 데이터 저장
    const jsonData = {
      timestamp: new Date().toISOString(),
      summary,
      analyses,
      suggestions,
      indexSuggestions
    };
    
    const jsonPath = path.join(__dirname, '../../../query-analysis-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    
    console.log(`📊 분석 데이터: ${jsonPath}`);
    console.log('\n✅ 쿼리 분석 완료');
    
  } catch (error) {
    console.error('❌ 쿼리 분석 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { analyzeQueryPatterns, generateOptimizationSuggestions, generateIndexSuggestions };