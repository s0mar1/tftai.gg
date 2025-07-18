#!/usr/bin/env tsx
/**
 * 의존성 업데이트 스크립트
 * npm-check-updates를 사용해 패키지 업데이트 확인 및 적용
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface UpdateInfo {
  packageName: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'major' | 'minor' | 'patch';
  location: string;
}

/**
 * 버전 변경 타입 결정
 */
function getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
  const currentParts = current.replace(/[^0-9.]/g, '').split('.');
  const latestParts = latest.replace(/[^0-9.]/g, '').split('.');
  
  if (currentParts[0] !== latestParts[0]) return 'major';
  if (currentParts[1] !== latestParts[1]) return 'minor';
  return 'patch';
}

/**
 * 패키지 업데이트 확인
 */
async function checkUpdates(packagePath: string): Promise<UpdateInfo[]> {
  try {
    const { stdout } = await execAsync('npx npm-check-updates --format json', {
      cwd: packagePath,
      timeout: 30000
    });

    const updates = JSON.parse(stdout);
    const updateInfos: UpdateInfo[] = [];

    for (const [packageName, latestVersion] of Object.entries(updates)) {
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      const currentVersion = packageJson.dependencies?.[packageName] || 
                           packageJson.devDependencies?.[packageName] || 
                           packageJson.peerDependencies?.[packageName];

      if (currentVersion) {
        updateInfos.push({
          packageName,
          current: currentVersion,
          wanted: latestVersion as string,
          latest: latestVersion as string,
          type: getUpdateType(currentVersion, latestVersion as string),
          location: path.relative(process.cwd(), packagePath)
        });
      }
    }

    return updateInfos;
  } catch (error) {
    console.error(`❌ ${packagePath}에서 업데이트 확인 중 오류:`, error);
    return [];
  }
}

/**
 * 보안 업데이트 적용
 */
async function applySecurityUpdates(packagePath: string, updates: UpdateInfo[]): Promise<void> {
  const securityUpdates = updates.filter(update => 
    update.type === 'patch' || 
    (update.type === 'minor' && isSecurityPackage(update.packageName))
  );

  if (securityUpdates.length === 0) {
    console.log(`   ✅ 보안 업데이트 없음`);
    return;
  }

  console.log(`   🔧 ${securityUpdates.length}개의 보안 업데이트 적용 중...`);
  
  try {
    // 패치 업데이트 적용
    const patchUpdates = securityUpdates.filter(u => u.type === 'patch');
    if (patchUpdates.length > 0) {
      await execAsync('npx npm-check-updates --target patch --upgrade', {
        cwd: packagePath,
        timeout: 60000
      });
      console.log(`   ✅ ${patchUpdates.length}개의 패치 업데이트 적용됨`);
    }

    // 보안 관련 마이너 업데이트 적용
    const securityMinorUpdates = securityUpdates.filter(u => 
      u.type === 'minor' && isSecurityPackage(u.packageName)
    );
    
    for (const update of securityMinorUpdates) {
      await execAsync(`npx npm-check-updates --filter ${update.packageName} --target minor --upgrade`, {
        cwd: packagePath,
        timeout: 30000
      });
      console.log(`   ✅ ${update.packageName} 보안 업데이트 적용됨`);
    }

    // 의존성 설치
    await execAsync('pnpm install', {
      cwd: packagePath,
      timeout: 120000
    });

  } catch (error) {
    console.error(`   ❌ 보안 업데이트 적용 중 오류:`, error);
  }
}

/**
 * 보안 관련 패키지 여부 확인
 */
function isSecurityPackage(packageName: string): boolean {
  const securityPackages = [
    'express',
    'mongoose',
    'axios',
    'helmet',
    'cors',
    'dotenv',
    'validator',
    'bcrypt',
    'jsonwebtoken',
    'express-rate-limit',
    'express-async-errors',
    'winston',
    'zod'
  ];
  
  return securityPackages.some(pkg => packageName.includes(pkg));
}

/**
 * 업데이트 요약 출력
 */
function printUpdateSummary(updates: UpdateInfo[]): void {
  if (updates.length === 0) {
    console.log('✅ 모든 패키지가 최신 상태입니다.');
    return;
  }

  console.log('\n📋 사용 가능한 업데이트:');
  console.log('-'.repeat(80));
  
  const grouped = {
    major: updates.filter(u => u.type === 'major'),
    minor: updates.filter(u => u.type === 'minor'),
    patch: updates.filter(u => u.type === 'patch')
  };

  Object.entries(grouped).forEach(([type, typeUpdates]) => {
    if (typeUpdates.length > 0) {
      console.log(`\n${type.toUpperCase()} 업데이트 (${typeUpdates.length}개):`);
      typeUpdates.forEach(update => {
        const emoji = type === 'major' ? '🚨' : type === 'minor' ? '⚠️' : '✅';
        console.log(`  ${emoji} ${update.packageName}: ${update.current} → ${update.latest} (${update.location})`);
      });
    }
  });

  console.log('\n💡 권장사항:');
  console.log('   🔧 PATCH 업데이트는 자동으로 적용됩니다.');
  console.log('   ⚠️ MINOR 업데이트는 보안 관련 패키지만 적용됩니다.');
  console.log('   🚨 MAJOR 업데이트는 수동으로 검토 후 적용하세요.');
}

/**
 * 업데이트 리포트 생성
 */
function generateUpdateReport(allUpdates: UpdateInfo[]): void {
  const reportPath = path.join(process.cwd(), 'dependency-update-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    totalUpdates: allUpdates.length,
    updatesByType: {
      major: allUpdates.filter(u => u.type === 'major').length,
      minor: allUpdates.filter(u => u.type === 'minor').length,
      patch: allUpdates.filter(u => u.type === 'patch').length
    },
    updates: allUpdates,
    recommendations: {
      autoApplied: allUpdates.filter(u => 
        u.type === 'patch' || (u.type === 'minor' && isSecurityPackage(u.packageName))
      ).length,
      manualReview: allUpdates.filter(u => 
        u.type === 'major' || (u.type === 'minor' && !isSecurityPackage(u.packageName))
      ).length
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 업데이트 리포트 생성: ${reportPath}`);
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    console.log('🔄 TFT Meta Analyzer 의존성 업데이트 확인');
    console.log('='.repeat(50));
    
    const packages = [
      { path: '.', name: 'Root' },
      { path: 'backend', name: 'Backend' },
      { path: 'frontend', name: 'Frontend' },
      { path: 'shared', name: 'Shared' }
    ];
    
    const allUpdates: UpdateInfo[] = [];
    
    for (const pkg of packages) {
      const packagePath = path.join(process.cwd(), pkg.path);
      if (fs.existsSync(path.join(packagePath, 'package.json'))) {
        console.log(`\n📦 ${pkg.name} 패키지 업데이트 확인...`);
        
        const updates = await checkUpdates(packagePath);
        allUpdates.push(...updates);
        
        if (updates.length > 0) {
          console.log(`   📋 ${updates.length}개의 업데이트 발견`);
          await applySecurityUpdates(packagePath, updates);
        } else {
          console.log(`   ✅ 업데이트 없음`);
        }
      }
    }
    
    printUpdateSummary(allUpdates);
    generateUpdateReport(allUpdates);
    
    console.log('\n✅ 의존성 업데이트 확인 완료');
    
  } catch (error) {
    console.error('❌ 의존성 업데이트 확인 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { checkUpdates, applySecurityUpdates, generateUpdateReport };