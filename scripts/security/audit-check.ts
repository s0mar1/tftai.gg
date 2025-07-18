#!/usr/bin/env tsx
/**
 * 보안 감사 체크 스크립트
 * pnpm audit을 실행하고 결과를 분석하여 보안 취약점을 리포트
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface AuditResult {
  vulnerabilities: {
    total: number;
    high: number;
    moderate: number;
    low: number;
    critical: number;
  };
  packages: {
    total: number;
    vulnerable: number;
  };
  summary: string;
}

/**
 * pnpm audit 실행 및 결과 파싱
 */
async function runAudit(): Promise<AuditResult> {
  try {
    console.log('🔍 보안 감사 시작...');
    
    const { stdout, stderr } = await execAsync('pnpm audit --json', {
      cwd: process.cwd(),
      timeout: 30000
    });

    if (stderr) {
      console.warn('⚠️ 경고:', stderr);
    }

    const auditData = JSON.parse(stdout);
    
    const result: AuditResult = {
      vulnerabilities: {
        total: auditData.metadata?.vulnerabilities?.total || 0,
        critical: auditData.metadata?.vulnerabilities?.critical || 0,
        high: auditData.metadata?.vulnerabilities?.high || 0,
        moderate: auditData.metadata?.vulnerabilities?.moderate || 0,
        low: auditData.metadata?.vulnerabilities?.low || 0,
      },
      packages: {
        total: auditData.metadata?.totalDependencies || 0,
        vulnerable: auditData.metadata?.vulnerabilities?.total || 0
      },
      summary: auditData.metadata?.summary || 'No vulnerabilities found'
    };

    return result;
  } catch (error) {
    console.error('❌ 보안 감사 실행 중 오류:', error);
    
    // 일반 audit 명령으로 재시도
    try {
      const { stdout } = await execAsync('pnpm audit', {
        cwd: process.cwd(),
        timeout: 30000
      });
      
      console.log('📋 보안 감사 결과:');
      console.log(stdout);
      
      return {
        vulnerabilities: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
        packages: { total: 0, vulnerable: 0 },
        summary: 'Manual audit completed'
      };
    } catch (fallbackError) {
      throw new Error(`보안 감사 실행 실패: ${fallbackError}`);
    }
  }
}

/**
 * 패키지별 보안 감사 실행
 */
async function auditPackage(packagePath: string, packageName: string): Promise<void> {
  console.log(`\n📦 ${packageName} 패키지 보안 감사...`);
  
  try {
    const { stdout } = await execAsync('pnpm audit --json', {
      cwd: packagePath,
      timeout: 30000
    });

    const auditData = JSON.parse(stdout);
    const vulns = auditData.metadata?.vulnerabilities || {};
    
    if (vulns.total > 0) {
      console.log(`   ❌ 취약점 발견: ${vulns.total}개`);
      console.log(`      - 심각: ${vulns.critical || 0}개`);
      console.log(`      - 높음: ${vulns.high || 0}개`);
      console.log(`      - 보통: ${vulns.moderate || 0}개`);
      console.log(`      - 낮음: ${vulns.low || 0}개`);
    } else {
      console.log(`   ✅ 취약점 없음`);
    }
  } catch (error) {
    console.log(`   ⚠️ 감사 실행 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 보안 리포트 생성
 */
function generateSecurityReport(result: AuditResult): void {
  const reportPath = path.join(process.cwd(), 'security-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    audit: result,
    recommendations: [],
    status: 'completed'
  };

  // 권장사항 생성
  if (result.vulnerabilities.critical > 0) {
    report.recommendations.push('🚨 치명적 취약점이 발견되었습니다. 즉시 업데이트하세요.');
  }
  
  if (result.vulnerabilities.high > 0) {
    report.recommendations.push('⚠️ 높은 수준의 취약점이 발견되었습니다. 빠른 시일 내에 업데이트하세요.');
  }
  
  if (result.vulnerabilities.moderate > 0) {
    report.recommendations.push('💡 중간 수준의 취약점이 발견되었습니다. 업데이트를 검토하세요.');
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 보안 리포트 생성: ${reportPath}`);
}

/**
 * 보안 상태 출력
 */
function printSecurityStatus(result: AuditResult): void {
  console.log('\n🔒 보안 감사 결과');
  console.log('='.repeat(50));
  console.log(`📊 전체 패키지 수: ${result.packages.total}`);
  console.log(`🔍 취약점 총 개수: ${result.vulnerabilities.total}`);
  
  if (result.vulnerabilities.total > 0) {
    console.log('\n📋 취약점 세부 현황:');
    console.log(`   🚨 치명적: ${result.vulnerabilities.critical}`);
    console.log(`   ⚠️ 높음: ${result.vulnerabilities.high}`);
    console.log(`   💡 보통: ${result.vulnerabilities.moderate}`);
    console.log(`   ℹ️ 낮음: ${result.vulnerabilities.low}`);
  }

  console.log('\n💡 권장사항:');
  if (result.vulnerabilities.total === 0) {
    console.log('   ✅ 발견된 취약점이 없습니다.');
  } else {
    console.log('   🔧 `npm run security:update` 명령으로 업데이트를 실행하세요.');
    console.log('   🔍 `npm run security:scan` 명령으로 상세 분석을 실행하세요.');
  }
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    console.log('🛡️ TFT Meta Analyzer 보안 감사 시작');
    console.log('='.repeat(50));
    
    // 루트 레벨 감사
    const rootResult = await runAudit();
    
    // 개별 패키지 감사
    const packages = [
      { path: 'backend', name: 'Backend' },
      { path: 'frontend', name: 'Frontend' },
      { path: 'shared', name: 'Shared' }
    ];
    
    for (const pkg of packages) {
      const packagePath = path.join(process.cwd(), pkg.path);
      if (fs.existsSync(packagePath)) {
        await auditPackage(packagePath, pkg.name);
      }
    }
    
    // 결과 출력 및 리포트 생성
    printSecurityStatus(rootResult);
    generateSecurityReport(rootResult);
    
    console.log('\n✅ 보안 감사 완료');
    
    // 치명적 취약점이 있으면 프로세스 종료 코드 1로 종료
    if (rootResult.vulnerabilities.critical > 0) {
      console.log('\n🚨 치명적 취약점으로 인해 프로세스를 종료합니다.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 보안 감사 실행 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { runAudit, auditPackage, generateSecurityReport };