#!/usr/bin/env tsx
/**
 * 코드 중복 분석 도구
 * jscpd를 사용하여 코드 중복을 탐지하고 리팩토링 제안 생성
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface DuplicateBlock {
  format: string;
  lines: number;
  tokens: number;
  firstFile: {
    name: string;
    start: number;
    end: number;
  };
  secondFile: {
    name: string;
    start: number;
    end: number;
  };
  fragment: string;
}

interface DuplicationReport {
  statistics: {
    total: {
      lines: number;
      sources: number;
      clones: number;
      duplicatedLines: number;
      duplicatedSources: number;
      percentage: number;
    };
    formats: Record<string, {
      sources: number;
      clones: number;
      duplicatedLines: number;
      percentage: number;
    }>;
  };
  duplicates: DuplicateBlock[];
}

interface RefactoringSuggestion {
  type: 'extract-function' | 'extract-class' | 'extract-constant' | 'move-to-shared';
  priority: 'high' | 'medium' | 'low';
  description: string;
  files: string[];
  duplicateCount: number;
  linesCount: number;
  suggestion: string;
  implementation: string;
}

/**
 * jscpd 실행 및 결과 파싱
 */
async function runDuplicateDetection(): Promise<DuplicationReport> {
  const configPath = path.join(process.cwd(), '.jscpd.json');
  
  // jscpd 설정 파일 생성
  const config = {
    threshold: 5,
    reporters: ['json', 'console'],
    absolute: true,
    gitignore: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/coverage/**',
      '**/*.d.ts'
    ],
    formats: ['typescript', 'javascript', 'tsx', 'jsx'],
    output: './jscpd-report'
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  try {
    console.log('🔍 코드 중복 분석 시작...');
    
    // jscpd 실행
    const { stdout, stderr } = await execAsync('npx jscpd --config .jscpd.json .', {
      cwd: process.cwd(),
      timeout: 120000 // 2분 타임아웃
    });
    
    if (stderr) {
      console.warn('⚠️ jscpd 경고:', stderr);
    }
    
    // JSON 리포트 파일 읽기
    const jsonReportPath = path.join(process.cwd(), 'jscpd-report.json');
    
    if (fs.existsSync(jsonReportPath)) {
      const reportData = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
      
      // 임시 파일 정리
      fs.unlinkSync(configPath);
      fs.unlinkSync(jsonReportPath);
      
      return reportData;
    } else {
      throw new Error('jscpd 리포트 파일을 찾을 수 없습니다.');
    }
    
  } catch (error) {
    // 설정 파일 정리
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    throw new Error(`코드 중복 분석 실행 중 오류: ${error}`);
  }
}

/**
 * 중복 코드 분석 및 분류
 */
function analyzeDuplicates(report: DuplicationReport): {
  byPackage: Record<string, DuplicateBlock[]>;
  byType: Record<string, DuplicateBlock[]>;
  crossPackage: DuplicateBlock[];
  highImpact: DuplicateBlock[];
} {
  const byPackage: Record<string, DuplicateBlock[]> = {};
  const byType: Record<string, DuplicateBlock[]> = {};
  const crossPackage: DuplicateBlock[] = [];
  const highImpact: DuplicateBlock[] = [];
  
  report.duplicates.forEach(duplicate => {
    // 패키지별 분류
    const package1 = getPackageFromPath(duplicate.firstFile.name);
    const package2 = getPackageFromPath(duplicate.secondFile.name);
    
    if (!byPackage[package1]) byPackage[package1] = [];
    if (!byPackage[package2]) byPackage[package2] = [];
    
    byPackage[package1].push(duplicate);
    if (package1 !== package2) {
      byPackage[package2].push(duplicate);
    }
    
    // 파일 타입별 분류
    const type = duplicate.format.toLowerCase();
    if (!byType[type]) byType[type] = [];
    byType[type].push(duplicate);
    
    // 패키지 간 중복
    if (package1 !== package2) {
      crossPackage.push(duplicate);
    }
    
    // 높은 영향도 중복 (20줄 이상)
    if (duplicate.lines >= 20) {
      highImpact.push(duplicate);
    }
  });
  
  return { byPackage, byType, crossPackage, highImpact };
}

/**
 * 파일 경로에서 패키지명 추출
 */
function getPackageFromPath(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('/backend/')) return 'backend';
  if (normalizedPath.includes('/frontend/')) return 'frontend';
  if (normalizedPath.includes('/shared/')) return 'shared';
  
  return 'root';
}

/**
 * 리팩토링 제안 생성
 */
function generateRefactoringSuggestions(
  report: DuplicationReport,
  analysis: ReturnType<typeof analyzeDuplicates>
): RefactoringSuggestion[] {
  const suggestions: RefactoringSuggestion[] = [];
  
  // 높은 영향도 중복에 대한 제안
  analysis.highImpact.forEach(duplicate => {
    suggestions.push({
      type: 'extract-function',
      priority: 'high',
      description: `${duplicate.lines}줄의 중복 코드 발견`,
      files: [duplicate.firstFile.name, duplicate.secondFile.name],
      duplicateCount: 1,
      linesCount: duplicate.lines,
      suggestion: '공통 함수로 추출하여 중복 제거',
      implementation: `공통 함수를 생성하고 두 파일에서 해당 함수를 호출하도록 리팩토링`
    });
  });
  
  // 패키지 간 중복에 대한 제안
  analysis.crossPackage.forEach(duplicate => {
    const package1 = getPackageFromPath(duplicate.firstFile.name);
    const package2 = getPackageFromPath(duplicate.secondFile.name);
    
    suggestions.push({
      type: 'move-to-shared',
      priority: 'medium',
      description: `${package1}와 ${package2} 간 중복 코드 (${duplicate.lines}줄)`,
      files: [duplicate.firstFile.name, duplicate.secondFile.name],
      duplicateCount: 1,
      linesCount: duplicate.lines,
      suggestion: 'shared 패키지로 이동',
      implementation: `중복 코드를 shared 패키지로 이동하고 두 패키지에서 import하도록 수정`
    });
  });
  
  // 타입별 분석
  Object.entries(analysis.byType).forEach(([type, duplicates]) => {
    if (duplicates.length > 5) {
      const totalLines = duplicates.reduce((sum, d) => sum + d.lines, 0);
      
      suggestions.push({
        type: 'extract-class',
        priority: 'medium',
        description: `${type} 파일에서 ${duplicates.length}개의 중복 블록 발견`,
        files: [...new Set(duplicates.flatMap(d => [d.firstFile.name, d.secondFile.name]))],
        duplicateCount: duplicates.length,
        linesCount: totalLines,
        suggestion: `${type} 코드의 공통 패턴을 클래스나 유틸리티로 추출`,
        implementation: '공통 패턴을 분석하여 재사용 가능한 클래스나 함수 생성'
      });
    }
  });
  
  // 패키지별 분석
  Object.entries(analysis.byPackage).forEach(([packageName, duplicates]) => {
    if (duplicates.length > 10) {
      const totalLines = duplicates.reduce((sum, d) => sum + d.lines, 0);
      
      suggestions.push({
        type: 'extract-function',
        priority: 'low',
        description: `${packageName} 패키지 내 ${duplicates.length}개의 중복 발견`,
        files: [...new Set(duplicates.flatMap(d => [d.firstFile.name, d.secondFile.name]))],
        duplicateCount: duplicates.length,
        linesCount: totalLines,
        suggestion: `${packageName} 패키지 내 공통 유틸리티 함수 생성`,
        implementation: '패키지별 유틸리티 모듈을 생성하여 중복 코드 통합'
      });
    }
  });
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * 상세 리포트 생성
 */
function generateDetailedReport(
  report: DuplicationReport,
  analysis: ReturnType<typeof analyzeDuplicates>,
  suggestions: RefactoringSuggestion[]
): string {
  let detailedReport = '# 🔍 코드 중복 분석 상세 리포트\n\n';
  
  detailedReport += `생성 시간: ${new Date().toLocaleString()}\n\n`;
  
  // 전체 통계
  detailedReport += '## 📊 전체 통계\n\n';
  detailedReport += `- 총 파일 수: ${report.statistics.total.sources}\n`;
  detailedReport += `- 총 라인 수: ${report.statistics.total.lines}\n`;
  detailedReport += `- 중복 블록 수: ${report.statistics.total.clones}\n`;
  detailedReport += `- 중복 라인 수: ${report.statistics.total.duplicatedLines}\n`;
  detailedReport += `- 중복 비율: ${report.statistics.total.percentage.toFixed(2)}%\n\n`;
  
  // 패키지별 통계
  detailedReport += '## 📦 패키지별 중복 현황\n\n';
  Object.entries(analysis.byPackage).forEach(([packageName, duplicates]) => {
    const totalLines = duplicates.reduce((sum, d) => sum + d.lines, 0);
    detailedReport += `- **${packageName}**: ${duplicates.length}개 블록, ${totalLines}줄\n`;
  });
  detailedReport += '\n';
  
  // 패키지 간 중복
  if (analysis.crossPackage.length > 0) {
    detailedReport += '## 🔗 패키지 간 중복 코드\n\n';
    analysis.crossPackage.slice(0, 10).forEach((duplicate, index) => {
      const package1 = getPackageFromPath(duplicate.firstFile.name);
      const package2 = getPackageFromPath(duplicate.secondFile.name);
      
      detailedReport += `### ${index + 1}. ${package1} ↔ ${package2}\n`;
      detailedReport += `- 파일 1: ${duplicate.firstFile.name}:${duplicate.firstFile.start}-${duplicate.firstFile.end}\n`;
      detailedReport += `- 파일 2: ${duplicate.secondFile.name}:${duplicate.secondFile.start}-${duplicate.secondFile.end}\n`;
      detailedReport += `- 중복 라인: ${duplicate.lines}줄\n`;
      detailedReport += `- 형식: ${duplicate.format}\n\n`;
    });
  }
  
  // 리팩토링 제안
  detailedReport += '## 💡 리팩토링 제안\n\n';
  
  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');
  const lowPriority = suggestions.filter(s => s.priority === 'low');
  
  if (highPriority.length > 0) {
    detailedReport += '### 🚨 높은 우선순위\n\n';
    highPriority.forEach((suggestion, index) => {
      detailedReport += `${index + 1}. **${suggestion.description}**\n`;
      detailedReport += `   - 타입: ${suggestion.type}\n`;
      detailedReport += `   - 중복 수: ${suggestion.duplicateCount}개\n`;
      detailedReport += `   - 총 라인: ${suggestion.linesCount}줄\n`;
      detailedReport += `   - 제안: ${suggestion.suggestion}\n`;
      detailedReport += `   - 구현: ${suggestion.implementation}\n\n`;
    });
  }
  
  if (mediumPriority.length > 0) {
    detailedReport += '### ⚠️ 중간 우선순위\n\n';
    mediumPriority.forEach((suggestion, index) => {
      detailedReport += `${index + 1}. **${suggestion.description}**\n`;
      detailedReport += `   - 제안: ${suggestion.suggestion}\n`;
      detailedReport += `   - 구현: ${suggestion.implementation}\n\n`;
    });
  }
  
  // 코드 품질 지표
  detailedReport += '## 📈 코드 품질 지표\n\n';
  detailedReport += `- 중복도: ${report.statistics.total.percentage.toFixed(2)}%\n`;
  detailedReport += `- 품질 등급: ${getQualityGrade(report.statistics.total.percentage)}\n`;
  detailedReport += `- 권장 목표: 5% 이하\n\n`;
  
  // 다음 단계
  detailedReport += '## 🎯 다음 단계\n\n';
  detailedReport += '1. 높은 우선순위 제안부터 순차적으로 적용\n';
  detailedReport += '2. 패키지 간 중복 코드를 shared 패키지로 이동\n';
  detailedReport += '3. 정기적인 코드 중복 분석 실행 (월 1회)\n';
  detailedReport += '4. 코드 리뷰 시 중복 코드 체크 프로세스 도입\n';
  
  return detailedReport;
}

/**
 * 코드 품질 등급 계산
 */
function getQualityGrade(percentage: number): string {
  if (percentage <= 5) return 'A (우수)';
  if (percentage <= 10) return 'B (양호)';
  if (percentage <= 20) return 'C (보통)';
  if (percentage <= 30) return 'D (미흡)';
  return 'F (개선 필요)';
}

/**
 * 결과 출력
 */
function printResults(
  report: DuplicationReport,
  analysis: ReturnType<typeof analyzeDuplicates>,
  suggestions: RefactoringSuggestion[]
): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 코드 중복 분석 결과');
  console.log('='.repeat(60));
  
  console.log(`\n📈 전체 통계:`);
  console.log(`   총 파일: ${report.statistics.total.sources}개`);
  console.log(`   총 라인: ${report.statistics.total.lines}줄`);
  console.log(`   중복 블록: ${report.statistics.total.clones}개`);
  console.log(`   중복 라인: ${report.statistics.total.duplicatedLines}줄`);
  console.log(`   중복 비율: ${report.statistics.total.percentage.toFixed(2)}%`);
  console.log(`   품질 등급: ${getQualityGrade(report.statistics.total.percentage)}`);
  
  console.log(`\n📦 패키지별 중복:`);
  Object.entries(analysis.byPackage).forEach(([packageName, duplicates]) => {
    const totalLines = duplicates.reduce((sum, d) => sum + d.lines, 0);
    console.log(`   ${packageName}: ${duplicates.length}개 블록, ${totalLines}줄`);
  });
  
  console.log(`\n🔗 패키지 간 중복: ${analysis.crossPackage.length}개`);
  console.log(`🚨 높은 영향도 중복: ${analysis.highImpact.length}개`);
  
  console.log(`\n💡 리팩토링 제안:`);
  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');
  const lowPriority = suggestions.filter(s => s.priority === 'low');
  
  console.log(`   높은 우선순위: ${highPriority.length}개`);
  console.log(`   중간 우선순위: ${mediumPriority.length}개`);
  console.log(`   낮은 우선순위: ${lowPriority.length}개`);
  
  if (highPriority.length > 0) {
    console.log(`\n🚨 즉시 처리 권장:`);
    highPriority.slice(0, 3).forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.description}`);
    });
  }
  
  console.log(`\n📊 권장사항:`);
  if (report.statistics.total.percentage > 20) {
    console.log(`   🔴 중복도가 높습니다. 적극적인 리팩토링이 필요합니다.`);
  } else if (report.statistics.total.percentage > 10) {
    console.log(`   🟡 중복도가 다소 높습니다. 계획적인 리팩토링을 권장합니다.`);
  } else {
    console.log(`   🟢 중복도가 적당합니다. 현재 상태를 유지하세요.`);
  }
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    console.log('🔍 TFT Meta Analyzer 코드 중복 분석 시작');
    console.log('='.repeat(60));
    
    // 코드 중복 분석 실행
    const report = await runDuplicateDetection();
    
    // 분석 결과 처리
    const analysis = analyzeDuplicates(report);
    
    // 리팩토링 제안 생성
    const suggestions = generateRefactoringSuggestions(report, analysis);
    
    // 결과 출력
    printResults(report, analysis, suggestions);
    
    // 상세 리포트 생성
    const detailedReport = generateDetailedReport(report, analysis, suggestions);
    const reportPath = path.join(process.cwd(), 'code-duplication-report.md');
    fs.writeFileSync(reportPath, detailedReport);
    
    // JSON 데이터 저장
    const jsonData = {
      timestamp: new Date().toISOString(),
      statistics: report.statistics,
      analysis,
      suggestions
    };
    
    const jsonPath = path.join(process.cwd(), 'code-duplication-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    
    console.log(`\n📄 상세 리포트: ${reportPath}`);
    console.log(`📊 분석 데이터: ${jsonPath}`);
    console.log('\n✅ 코드 중복 분석 완료');
    
  } catch (error) {
    console.error('❌ 코드 중복 분석 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { runDuplicateDetection, analyzeDuplicates, generateRefactoringSuggestions };