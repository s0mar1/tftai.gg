#!/usr/bin/env tsx
/**
 * 성능 예산 관리 스크립트
 * 번들 크기 예산을 설정하고 모니터링
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PerformanceBudget {
  name: string;
  pattern: string;
  maxSize: number;
  maxGzipSize: number;
  severity: 'error' | 'warning';
  description: string;
}

interface BudgetConfig {
  budgets: PerformanceBudget[];
  global: {
    maxTotalSize: number;
    maxTotalGzipSize: number;
    maxChunkCount: number;
  };
  alerts: {
    slackWebhook?: string;
    emailTo?: string[];
  };
}

/**
 * 기본 성능 예산 설정
 */
const defaultBudgets: PerformanceBudget[] = [
  {
    name: 'Main Bundle',
    pattern: 'index-*.js',
    maxSize: 300 * 1024, // 300KB
    maxGzipSize: 200 * 1024, // 200KB
    severity: 'error',
    description: '메인 번들 - 초기 로딩에 필요한 핵심 코드'
  },
  {
    name: 'Vendor Bundle',
    pattern: 'vendor-*.js',
    maxSize: 1200 * 1024, // 1.2MB
    maxGzipSize: 800 * 1024, // 800KB
    severity: 'warning',
    description: '벤더 번들 - 외부 라이브러리들'
  },
  {
    name: 'Route Chunks',
    pattern: '*.js',
    maxSize: 700 * 1024, // 700KB
    maxGzipSize: 500 * 1024, // 500KB
    severity: 'warning',
    description: '라우트 청크 - 페이지별 코드'
  },
  {
    name: 'CSS Files',
    pattern: '*.css',
    maxSize: 150 * 1024, // 150KB
    maxGzipSize: 100 * 1024, // 100KB
    severity: 'warning',
    description: 'CSS 파일 - 스타일 시트'
  },
  {
    name: 'AI Components',
    pattern: 'ai-*.js',
    maxSize: 500 * 1024, // 500KB
    maxGzipSize: 350 * 1024, // 350KB
    severity: 'warning',
    description: 'AI 컴포넌트 - AI 관련 기능'
  },
  {
    name: 'Charts & Visualization',
    pattern: 'charts-*.js',
    maxSize: 400 * 1024, // 400KB
    maxGzipSize: 280 * 1024, // 280KB
    severity: 'warning',
    description: '차트 라이브러리 - 데이터 시각화'
  }
];

/**
 * 기본 설정 생성
 */
const defaultConfig: BudgetConfig = {
  budgets: defaultBudgets,
  global: {
    maxTotalSize: 3 * 1024 * 1024, // 3MB
    maxTotalGzipSize: 2 * 1024 * 1024, // 2MB
    maxChunkCount: 20
  },
  alerts: {}
};

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
 * 성능 예산 설정 로드
 */
function loadBudgetConfig(): BudgetConfig {
  const configPath = path.join(__dirname, '../performance-budget.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaultConfig, ...config };
    } catch (error) {
      console.warn('⚠️ 설정 파일 로드 중 오류, 기본 설정 사용:', error);
    }
  }
  
  return defaultConfig;
}

/**
 * 성능 예산 설정 저장
 */
function saveBudgetConfig(config: BudgetConfig): void {
  const configPath = path.join(__dirname, '../performance-budget.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ 성능 예산 설정 저장: ${configPath}`);
}

/**
 * 예산 검증
 */
function validateBudgets(budgets: PerformanceBudget[]): string[] {
  const errors: string[] = [];
  
  budgets.forEach((budget, index) => {
    if (!budget.name || !budget.pattern) {
      errors.push(`예산 ${index + 1}: 이름과 패턴은 필수입니다.`);
    }
    
    if (budget.maxSize <= 0 || budget.maxGzipSize <= 0) {
      errors.push(`예산 ${index + 1}: 크기 제한은 양수여야 합니다.`);
    }
    
    if (budget.maxGzipSize > budget.maxSize) {
      errors.push(`예산 ${index + 1}: 압축 크기는 원본 크기보다 작아야 합니다.`);
    }
    
    if (!['error', 'warning'].includes(budget.severity)) {
      errors.push(`예산 ${index + 1}: 심각도는 'error' 또는 'warning'이어야 합니다.`);
    }
  });
  
  return errors;
}

/**
 * 예산 상태 확인
 */
function checkBudgetStatus(): void {
  const reportPath = path.join(__dirname, '../dist/bundle-monitor-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.log('❌ 번들 리포트가 없습니다. 먼저 `npm run bundle:monitor`를 실행하세요.');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const config = loadBudgetConfig();
    
    console.log('\n📊 성능 예산 상태 확인');
    console.log('='.repeat(60));
    
    let totalViolations = 0;
    let errorViolations = 0;
    
    config.budgets.forEach(budget => {
      const matchingFiles = report.metrics.filter((metric: any) => {
        const regex = new RegExp(budget.pattern.replace('*', '.*'));
        return regex.test(metric.name);
      });
      
      if (matchingFiles.length === 0) {
        console.log(`\n📋 ${budget.name}:`);
        console.log(`   ℹ️ 패턴에 일치하는 파일 없음 (${budget.pattern})`);
        return;
      }
      
      console.log(`\n📋 ${budget.name}:`);
      console.log(`   📝 설명: ${budget.description}`);
      console.log(`   🎯 패턴: ${budget.pattern}`);
      console.log(`   📏 크기 제한: ${formatFileSize(budget.maxSize)}`);
      console.log(`   🗜️ 압축 제한: ${formatFileSize(budget.maxGzipSize)}`);
      
      let budgetViolations = 0;
      
      matchingFiles.forEach((file: any) => {
        const sizeExceeded = file.size > budget.maxSize;
        const gzipExceeded = file.gzipSize > budget.maxGzipSize;
        
        if (sizeExceeded || gzipExceeded) {
          budgetViolations++;
          totalViolations++;
          
          if (budget.severity === 'error') {
            errorViolations++;
          }
          
          const emoji = budget.severity === 'error' ? '❌' : '⚠️';
          console.log(`   ${emoji} ${file.name}:`);
          console.log(`      크기: ${formatFileSize(file.size)} ${sizeExceeded ? '(초과)' : ''}`);
          console.log(`      압축: ${formatFileSize(file.gzipSize)} ${gzipExceeded ? '(초과)' : ''}`);
        } else {
          console.log(`   ✅ ${file.name}: ${formatFileSize(file.gzipSize)} (통과)`);
        }
      });
      
      if (budgetViolations === 0) {
        console.log(`   ✅ 모든 파일이 예산을 준수합니다.`);
      }
    });
    
    // 전역 예산 확인
    console.log('\n🌍 전역 예산:');
    console.log(`   📦 총 크기: ${formatFileSize(report.summary.totalSize)} / ${formatFileSize(config.global.maxTotalSize)} ${report.summary.totalSize > config.global.maxTotalSize ? '(초과)' : ''}`);
    console.log(`   🗜️ 총 압축 크기: ${formatFileSize(report.summary.totalGzipSize)} / ${formatFileSize(config.global.maxTotalGzipSize)} ${report.summary.totalGzipSize > config.global.maxTotalGzipSize ? '(초과)' : ''}`);
    console.log(`   📊 청크 수: ${report.summary.chunkCount} / ${config.global.maxChunkCount} ${report.summary.chunkCount > config.global.maxChunkCount ? '(초과)' : ''}`);
    
    // 요약
    console.log('\n📋 요약:');
    if (totalViolations === 0) {
      console.log('   ✅ 모든 예산 기준을 통과했습니다.');
    } else {
      console.log(`   ⚠️ 총 ${totalViolations}개의 예산 위반`);
      console.log(`   ❌ 그 중 ${errorViolations}개는 오류 수준`);
    }
    
    // 권장사항
    console.log('\n💡 권장사항:');
    
    if (errorViolations > 0) {
      console.log('   🚨 오류 수준의 예산 위반이 있습니다. 즉시 수정하세요.');
    }
    
    if (totalViolations > 0) {
      console.log('   🔧 코드 스플리팅을 고려해보세요.');
      console.log('   📦 번들 분석을 통해 큰 의존성을 확인하세요.');
      console.log('   🌳 트리 쉐이킹을 통해 미사용 코드를 제거하세요.');
    }
    
    if (report.summary.chunkCount > config.global.maxChunkCount) {
      console.log('   📊 청크 수가 많습니다. 일부 청크를 통합해보세요.');
    }
    
  } catch (error) {
    console.error('❌ 예산 상태 확인 중 오류:', error);
  }
}

/**
 * 새 예산 추가
 */
function addBudget(name: string, pattern: string, maxSize: number, maxGzipSize: number, severity: 'error' | 'warning', description: string): void {
  const config = loadBudgetConfig();
  
  const newBudget: PerformanceBudget = {
    name,
    pattern,
    maxSize,
    maxGzipSize,
    severity,
    description
  };
  
  const errors = validateBudgets([newBudget]);
  if (errors.length > 0) {
    console.error('❌ 예산 검증 실패:');
    errors.forEach(error => console.error(`   - ${error}`));
    return;
  }
  
  config.budgets.push(newBudget);
  saveBudgetConfig(config);
  
  console.log(`✅ 새 예산 추가: ${name}`);
}

/**
 * 예산 설정 출력
 */
function printBudgetConfig(): void {
  const config = loadBudgetConfig();
  
  console.log('\n📋 성능 예산 설정');
  console.log('='.repeat(60));
  
  config.budgets.forEach((budget, index) => {
    console.log(`\n${index + 1}. ${budget.name} (${budget.severity.toUpperCase()})`);
    console.log(`   📝 설명: ${budget.description}`);
    console.log(`   🎯 패턴: ${budget.pattern}`);
    console.log(`   📏 최대 크기: ${formatFileSize(budget.maxSize)}`);
    console.log(`   🗜️ 최대 압축 크기: ${formatFileSize(budget.maxGzipSize)}`);
  });
  
  console.log('\n🌍 전역 예산:');
  console.log(`   📦 최대 총 크기: ${formatFileSize(config.global.maxTotalSize)}`);
  console.log(`   🗜️ 최대 총 압축 크기: ${formatFileSize(config.global.maxTotalGzipSize)}`);
  console.log(`   📊 최대 청크 수: ${config.global.maxChunkCount}`);
}

/**
 * 메인 실행 함수
 */
function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'init':
      saveBudgetConfig(defaultConfig);
      console.log('✅ 기본 성능 예산 설정이 생성되었습니다.');
      break;
      
    case 'check':
      checkBudgetStatus();
      break;
      
    case 'show':
      printBudgetConfig();
      break;
      
    case 'add':
      if (args.length < 6) {
        console.error('❌ 사용법: npm run bundle:budget add <name> <pattern> <maxSize> <maxGzipSize> <severity> [description]');
        process.exit(1);
      }
      
      const [, name, pattern, maxSizeStr, maxGzipSizeStr, severity, description = ''] = args;
      const maxSize = parseInt(maxSizeStr) * 1024; // KB to bytes
      const maxGzipSize = parseInt(maxGzipSizeStr) * 1024; // KB to bytes
      
      if (severity !== 'error' && severity !== 'warning') {
        console.error('❌ 심각도는 "error" 또는 "warning"이어야 합니다.');
        process.exit(1);
      }
      
      addBudget(name, pattern, maxSize, maxGzipSize, severity, description);
      break;
      
    default:
      console.log('🎯 성능 예산 관리 도구');
      console.log('');
      console.log('사용법:');
      console.log('  npm run bundle:budget init     - 기본 설정 생성');
      console.log('  npm run bundle:budget check    - 예산 상태 확인');
      console.log('  npm run bundle:budget show     - 현재 설정 보기');
      console.log('  npm run bundle:budget add      - 새 예산 추가');
      console.log('');
      console.log('예제:');
      console.log('  npm run bundle:budget add "API Utils" "api-*.js" 300 200 warning "API 유틸리티 함수들"');
      break;
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { loadBudgetConfig, saveBudgetConfig, checkBudgetStatus, addBudget };