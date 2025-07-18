#!/usr/bin/env node

/**
 * ADR 인덱스 자동 생성 스크립트
 * 
 * 이 스크립트는 docs/adr/ 디렉토리의 모든 ADR 파일을 스캔하여
 * README.md 파일의 ADR 목록을 자동으로 업데이트합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 경로 설정
const PROJECT_ROOT = path.join(__dirname, '..');
const ADR_DIR = path.join(PROJECT_ROOT, 'docs', 'adr');
const README_PATH = path.join(ADR_DIR, 'README.md');

/**
 * ADR 파일 정보를 파싱합니다.
 */
function parseAdrFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let title = '';
    let status = '';
    let date = '';
    
    // 첫 번째 줄에서 제목 추출
    for (let line of lines) {
      if (line.startsWith('# ADR-')) {
        title = line.substring(2).trim();
        break;
      }
    }
    
    // 메타데이터 추출
    for (let line of lines) {
      if (line.startsWith('**상태:**')) {
        status = line.replace('**상태:**', '').trim();
      }
      if (line.startsWith('**날짜:**')) {
        date = line.replace('**날짜:**', '').trim();
      }
    }
    
    return {
      title,
      status,
      date,
      filename: path.basename(filePath)
    };
  } catch (error) {
    console.error(`ADR 파일 파싱 오류: ${filePath}`, error);
    return null;
  }
}

/**
 * ADR 번호를 추출합니다.
 */
function extractAdrNumber(filename) {
  const match = filename.match(/^(\d{3})-/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 상태별 이모지를 반환합니다.
 */
function getStatusEmoji(status) {
  switch (status) {
    case '승인됨':
      return '✅';
    case '제안됨':
      return '🔄';
    case '폐기됨':
      return '❌';
    case '대체됨':
      return '🔄';
    default:
      return '📋';
  }
}

/**
 * 카테고리별로 ADR을 분류합니다.
 */
function categorizeAdrs(adrs) {
  const categories = {
    '핵심 아키텍처 결정': [],
    '개발 워크플로우': [],
    '보안 및 성능': [],
    '기타': []
  };
  
  adrs.forEach(adr => {
    const title = adr.title.toLowerCase();
    
    if (title.includes('typescript') || title.includes('esm') || title.includes('pnpm') || title.includes('캐싱')) {
      categories['핵심 아키텍처 결정'].push(adr);
    } else if (title.includes('ai') || title.includes('점진적')) {
      categories['개발 워크플로우'].push(adr);
    } else if (title.includes('에러') || title.includes('레이트')) {
      categories['보안 및 성능'].push(adr);
    } else {
      categories['기타'].push(adr);
    }
  });
  
  return categories;
}

/**
 * ADR 목록을 생성합니다.
 */
function generateAdrList() {
  console.log('📋 ADR 파일 스캔 중...');
  
  if (!fs.existsSync(ADR_DIR)) {
    console.error('❌ ADR 디렉토리가 존재하지 않습니다:', ADR_DIR);
    return '';
  }
  
  const files = fs.readdirSync(ADR_DIR);
  const adrFiles = files.filter(file => 
    file.match(/^\d{3}-.*\.md$/) && file !== 'template.md'
  );
  
  if (adrFiles.length === 0) {
    console.log('ℹ️  ADR 파일이 없습니다.');
    return '';
  }
  
  console.log(`📄 ${adrFiles.length}개의 ADR 파일을 발견했습니다.`);
  
  // ADR 파일 정보 파싱
  const adrs = [];
  adrFiles.forEach(file => {
    const filePath = path.join(ADR_DIR, file);
    const adrInfo = parseAdrFile(filePath);
    if (adrInfo) {
      adrs.push(adrInfo);
    }
  });
  
  // 번호순으로 정렬
  adrs.sort((a, b) => extractAdrNumber(a.filename) - extractAdrNumber(b.filename));
  
  // 카테고리별로 분류
  const categories = categorizeAdrs(adrs);
  
  // 마크다운 생성
  let markdown = '';
  
  // 전체 목록
  markdown += '### 핵심 아키텍처 결정\n';
  categories['핵심 아키텍처 결정'].forEach(adr => {
    markdown += `- ${getStatusEmoji(adr.status)} **[${adr.title}](${adr.filename})**\n`;
  });
  
  markdown += '\n### 개발 워크플로우\n';
  categories['개발 워크플로우'].forEach(adr => {
    markdown += `- ${getStatusEmoji(adr.status)} **[${adr.title}](${adr.filename})**\n`;
  });
  
  markdown += '\n### 보안 및 성능\n';
  categories['보안 및 성능'].forEach(adr => {
    markdown += `- ${getStatusEmoji(adr.status)} **[${adr.title}](${adr.filename})**\n`;
  });
  
  if (categories['기타'].length > 0) {
    markdown += '\n### 기타\n';
    categories['기타'].forEach(adr => {
      markdown += `- ${getStatusEmoji(adr.status)} **[${adr.title}](${adr.filename})**\n`;
    });
  }
  
  // 통계 정보
  markdown += '\n## 📊 ADR 통계\n\n';
  markdown += `- **총 ADR 수**: ${adrs.length}개\n`;
  markdown += `- **승인됨**: ${adrs.filter(adr => adr.status === '승인됨').length}개\n`;
  markdown += `- **제안됨**: ${adrs.filter(adr => adr.status === '제안됨').length}개\n`;
  markdown += `- **폐기됨**: ${adrs.filter(adr => adr.status === '폐기됨').length}개\n`;
  markdown += `- **대체됨**: ${adrs.filter(adr => adr.status === '대체됨').length}개\n`;
  
  // 최근 업데이트 정보
  const recentAdrs = adrs
    .filter(adr => adr.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  
  if (recentAdrs.length > 0) {
    markdown += '\n## 🕒 최근 업데이트\n\n';
    recentAdrs.forEach(adr => {
      markdown += `- **${adr.date}**: [${adr.title}](${adr.filename})\n`;
    });
  }
  
  console.log('✅ ADR 목록 생성 완료');
  return markdown;
}

/**
 * README.md 파일을 업데이트합니다.
 */
function updateReadme(adrList) {
  console.log('📝 README.md 파일 업데이트 중...');
  
  if (!fs.existsSync(README_PATH)) {
    console.error('❌ README.md 파일이 존재하지 않습니다:', README_PATH);
    return false;
  }
  
  let content = fs.readFileSync(README_PATH, 'utf8');
  
  // ADR 목록 섹션 찾기
  const startMarker = '## ADR 목록';
  const endMarker = '## ADR 작성 가이드';
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('❌ README.md에서 ADR 목록 섹션을 찾을 수 없습니다.');
    return false;
  }
  
  // 새로운 내용으로 교체
  const newContent = 
    content.substring(0, startIndex) + 
    startMarker + '\n\n' + 
    adrList + '\n\n' + 
    content.substring(endIndex);
  
  fs.writeFileSync(README_PATH, newContent, 'utf8');
  console.log('✅ README.md 업데이트 완료');
  return true;
}

/**
 * 메인 함수
 */
function main() {
  console.log('🚀 ADR 인덱스 자동 생성 스크립트 시작\n');
  
  try {
    const adrList = generateAdrList();
    
    if (adrList) {
      const success = updateReadme(adrList);
      if (success) {
        console.log('\n🎉 ADR 인덱스 자동 생성 완료!');
        console.log('📄 업데이트된 파일:', README_PATH);
        console.log('\n💡 다음 단계:');
        console.log('   1. 변경사항 확인: git diff docs/adr/README.md');
        console.log('   2. 변경사항 커밋: git add docs/adr/README.md && git commit -m "docs: ADR 인덱스 자동 업데이트"');
      }
    }
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAdrList, updateReadme };