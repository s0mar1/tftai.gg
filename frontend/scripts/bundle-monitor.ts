#!/usr/bin/env tsx
/**
 * 번들 모니터링 스크립트
 * 번들 크기 변화를 추적하고 성능 예산을 관리
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BundleMetrics {
  name: string;
  size: number;
  gzipSize: number;
  type: 'js' | 'css' | 'asset';
  category: 'main' | 'vendor' | 'chunk' | 'css' | 'asset';
}

interface BundleReport {
  timestamp: string;
  commit?: string;
  branch?: string;
  metrics: BundleMetrics[];
  summary: {
    totalSize: number;
    totalGzipSize: number;
    jsSize: number;
    cssSize: number;
    assetSize: number;
    chunkCount: number;
  };
  budget: {
    status: 'pass' | 'warning' | 'fail';
    violations: Array<{
      file: string;
      actual: number;
      budget: number;
      severity: 'warning' | 'error';
    }>;
  };
}

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * gzip 압축 크기 추정
 */
function estimateGzipSize(size: number): number {
  return Math.round(size * 0.3);
}

/**
 * 파일 카테고리 결정
 */
function getFileCategory(filename: string): 'main' | 'vendor' | 'chunk' | 'css' | 'asset' {
  if (filename.includes('vendor')) return 'vendor';
  if (filename.includes('index')) return 'main';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.js')) return 'chunk';
  return 'asset';
}

/**
 * 번들 메트릭 수집
 */
async function collectBundleMetrics(): Promise<BundleMetrics[]> {
  const distPath = path.join(__dirname, '../dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    throw new Error('Assets directory not found. Run build first.');
  }

  const files = fs.readdirSync(assetsPath);
  const metrics: BundleMetrics[] = [];

  for (const file of files) {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const gzipSize = estimateGzipSize(size);

    metrics.push({
      name: file,
      size,
      gzipSize,
      type: file.endsWith('.js') ? 'js' : file.endsWith('.css') ? 'css' : 'asset',
      category: getFileCategory(file)
    });
  }

  return metrics.sort((a, b) => b.size - a.size);
}

/**
 * 번들 요약 생성
 */
function createBundleSummary(metrics: BundleMetrics[]) {
  const summary = {
    totalSize: metrics.reduce((sum, m) => sum + m.size, 0),
    totalGzipSize: metrics.reduce((sum, m) => sum + m.gzipSize, 0),
    jsSize: metrics.filter(m => m.type === 'js').reduce((sum, m) => sum + m.size, 0),
    cssSize: metrics.filter(m => m.type === 'css').reduce((sum, m) => sum + m.size, 0),
    assetSize: metrics.filter(m => m.type === 'asset').reduce((sum, m) => sum + m.size, 0),
    chunkCount: metrics.filter(m => m.type === 'js').length
  };

  return summary;
}

/**
 * 성능 예산 검사
 */
function checkPerformanceBudget(metrics: BundleMetrics[]) {
  const budgets = [
    { pattern: /index-.*\.js$/, limit: 200 * 1024, severity: 'error' as const },
    { pattern: /vendor-.*\.js$/, limit: 800 * 1024, severity: 'warning' as const },
    { pattern: /.*\.js$/, limit: 500 * 1024, severity: 'warning' as const },
    { pattern: /.*\.css$/, limit: 100 * 1024, severity: 'warning' as const }
  ];

  const violations: Array<{
    file: string;
    actual: number;
    budget: number;
    severity: 'warning' | 'error';
  }> = [];

  for (const metric of metrics) {
    for (const budget of budgets) {
      if (budget.pattern.test(metric.name) && metric.gzipSize > budget.limit) {
        violations.push({
          file: metric.name,
          actual: metric.gzipSize,
          budget: budget.limit,
          severity: budget.severity
        });
        break; // 첫 번째 일치하는 예산 규칙만 적용
      }
    }
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  const hasWarnings = violations.some(v => v.severity === 'warning');

  return {
    status: hasErrors ? 'fail' as const : hasWarnings ? 'warning' as const : 'pass' as const,
    violations
  };
}

/**
 * Git 정보 수집
 */
async function getGitInfo(): Promise<{ commit?: string; branch?: string }> {
  try {
    const { stdout: commit } = await execAsync('git rev-parse HEAD');
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
    
    return {
      commit: commit.trim().substring(0, 7),
      branch: branch.trim()
    };
  } catch (error) {
    return {};
  }
}

/**
 * 번들 리포트 생성
 */
async function generateBundleReport(): Promise<BundleReport> {
  const metrics = await collectBundleMetrics();
  const summary = createBundleSummary(metrics);
  const budget = checkPerformanceBudget(metrics);
  const gitInfo = await getGitInfo();

  return {
    timestamp: new Date().toISOString(),
    ...gitInfo,
    metrics,
    summary,
    budget
  };
}

/**
 * 이전 리포트와 비교
 */
function compareWithPrevious(currentReport: BundleReport): {
  sizeDiff: number;
  percentDiff: number;
  significant: boolean;
} {
  const historyPath = path.join(__dirname, '../dist/bundle-history.json');
  
  if (!fs.existsSync(historyPath)) {
    return { sizeDiff: 0, percentDiff: 0, significant: false };
  }

  try {
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    const previousReport = history[history.length - 1];
    
    if (!previousReport) {
      return { sizeDiff: 0, percentDiff: 0, significant: false };
    }

    const sizeDiff = currentReport.summary.totalGzipSize - previousReport.summary.totalGzipSize;
    const percentDiff = (sizeDiff / previousReport.summary.totalGzipSize) * 100;
    const significant = Math.abs(percentDiff) > 5; // 5% 이상 변화

    return { sizeDiff, percentDiff, significant };
  } catch (error) {
    return { sizeDiff: 0, percentDiff: 0, significant: false };
  }
}

/**
 * 리포트 히스토리 저장
 */
function saveToHistory(report: BundleReport): void {
  const historyPath = path.join(__dirname, '../dist/bundle-history.json');
  
  let history: BundleReport[] = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (error) {
      history = [];
    }
  }

  history.push(report);
  
  // 최근 50개 리포트만 유지
  if (history.length > 50) {
    history = history.slice(-50);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

/**
 * 결과 출력
 */
function printReport(report: BundleReport, comparison: ReturnType<typeof compareWithPrevious>): void {
  console.log('\n📊 번들 모니터링 리포트');
  console.log('='.repeat(60));
  
  if (report.commit) {
    console.log(`🔗 커밋: ${report.commit} (${report.branch})`);
  }
  
  console.log(`📅 생성 시간: ${new Date(report.timestamp).toLocaleString()}`);
  
  console.log('\n📈 번들 요약:');
  console.log(`   📦 총 크기: ${formatFileSize(report.summary.totalSize)}`);
  console.log(`   🗜️ 압축 크기: ${formatFileSize(report.summary.totalGzipSize)}`);
  console.log(`   📄 JS 크기: ${formatFileSize(report.summary.jsSize)}`);
  console.log(`   🎨 CSS 크기: ${formatFileSize(report.summary.cssSize)}`);
  console.log(`   📊 청크 수: ${report.summary.chunkCount}`);

  // 이전 빌드와 비교
  if (comparison.sizeDiff !== 0) {
    console.log('\n📊 이전 빌드와 비교:');
    const diffIcon = comparison.sizeDiff > 0 ? '📈' : '📉';
    const diffText = comparison.sizeDiff > 0 ? '증가' : '감소';
    console.log(`   ${diffIcon} 크기 ${diffText}: ${formatFileSize(Math.abs(comparison.sizeDiff))} (${comparison.percentDiff.toFixed(1)}%)`);
    
    if (comparison.significant) {
      console.log('   ⚠️ 유의미한 크기 변화가 감지되었습니다.');
    }
  }

  // 성능 예산 상태
  console.log('\n💰 성능 예산:');
  if (report.budget.status === 'pass') {
    console.log('   ✅ 모든 예산 기준을 통과했습니다.');
  } else {
    console.log(`   ${report.budget.status === 'fail' ? '❌' : '⚠️'} ${report.budget.violations.length}개의 예산 위반`);
    
    report.budget.violations.forEach(violation => {
      const emoji = violation.severity === 'error' ? '❌' : '⚠️';
      console.log(`   ${emoji} ${violation.file}: ${formatFileSize(violation.actual)} (한도: ${formatFileSize(violation.budget)})`);
    });
  }

  // 상위 5개 파일
  console.log('\n📋 상위 5개 파일:');
  report.metrics.slice(0, 5).forEach((metric, index) => {
    const emoji = metric.type === 'js' ? '📄' : metric.type === 'css' ? '🎨' : '📎';
    console.log(`   ${index + 1}. ${emoji} ${metric.name}`);
    console.log(`      크기: ${formatFileSize(metric.size)} (${formatFileSize(metric.gzipSize)} 압축)`);
  });

  // 권장사항
  console.log('\n💡 권장사항:');
  
  if (report.budget.violations.length > 0) {
    console.log('   🔧 번들 크기 최적화가 필요합니다.');
    console.log('   📦 코드 스플리팅을 고려해보세요.');
  }
  
  if (report.summary.chunkCount > 15) {
    console.log('   ⚠️ 청크 수가 많습니다. 일부 청크를 통합해보세요.');
  }
  
  if (report.summary.totalGzipSize > 1024 * 1024) {
    console.log('   📉 총 번들 크기가 1MB를 초과합니다.');
  }
  
  if (comparison.significant && comparison.sizeDiff > 0) {
    console.log('   📊 번들 크기가 크게 증가했습니다. 원인을 조사해보세요.');
  }
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 번들 모니터링 시작...');
    
    const report = await generateBundleReport();
    const comparison = compareWithPrevious(report);
    
    printReport(report, comparison);
    
    // 리포트 저장
    const reportPath = path.join(__dirname, '../dist/bundle-monitor-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    saveToHistory(report);
    
    console.log(`\n📄 상세 리포트: ${reportPath}`);
    console.log('✅ 번들 모니터링 완료');
    
    // 성능 예산 위반 시 종료 코드 설정
    if (report.budget.status === 'fail') {
      console.log('\n❌ 성능 예산 위반으로 프로세스를 종료합니다.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 번들 모니터링 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { generateBundleReport, compareWithPrevious, checkPerformanceBudget };