#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 번들 분석 및 리포팅 스크립트
 * vite build 후 생성된 파일들을 분석하여 성능 메트릭을 제공
 */

const DIST_PATH = path.join(__dirname, '../dist');
const STATS_FILE = path.join(DIST_PATH, 'stats.html');
const ASSETS_PATH = path.join(DIST_PATH, 'assets');

// 파일 크기를 읽기 쉬운 형태로 변환
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// gzip 압축 시뮬레이션 (대략적인 추정)
function estimateGzipSize(size) {
  return Math.round(size * 0.3); // 일반적으로 30% 정도로 압축됨
}

// 번들 파일 분석
function analyzeBundles() {
  console.log('\n🔍 Bundle Analysis Report\n');
  console.log('=' .repeat(60));

  if (!fs.existsSync(ASSETS_PATH)) {
    console.error('❌ Assets directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_PATH);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  
  let totalSize = 0;
  let totalGzipSize = 0;
  
  const bundles = [];

  // JavaScript 파일 분석
  console.log('\n📦 JavaScript Bundles:');
  console.log('-'.repeat(60));
  
  jsFiles.forEach(file => {
    const filePath = path.join(ASSETS_PATH, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    const gzipSize = estimateGzipSize(size);
    
    totalSize += size;
    totalGzipSize += gzipSize;
    
    // 파일 타입 추정
    let type = 'Unknown';
    if (file.includes('vendor')) type = '📚 Vendor';
    else if (file.includes('react')) type = '⚛️ React';
    else if (file.includes('router')) type = '🛣️ Router';
    else if (file.includes('query')) type = '🔄 Query';
    else if (file.includes('i18n')) type = '🌍 i18n';
    else if (file.includes('dnd')) type = '🎯 DnD';
    else if (file.includes('charts')) type = '📊 Charts';
    else if (file.includes('ai')) type = '🤖 AI';
    else if (file.includes('summoner')) type = '👤 Summoner';
    else if (file.includes('tierlist')) type = '🏆 TierList';
    else if (file.includes('deckbuilder')) type = '🃏 DeckBuilder';
    else if (file.includes('stats')) type = '📈 Stats';
    else if (file.includes('ranking')) type = '🏅 Ranking';
    else if (file.includes('index')) type = '🏠 Main';
    else type = '📄 Other';
    
    bundles.push({
      name: file,
      type,
      size,
      gzipSize,
      formatted: formatFileSize(size),
      gzipFormatted: formatFileSize(gzipSize)
    });
  });

  // 크기 순으로 정렬
  bundles.sort((a, b) => b.size - a.size);
  
  bundles.forEach(bundle => {
    console.log(`${bundle.type.padEnd(12)} ${bundle.formatted.padStart(8)} (${bundle.gzipFormatted} gzipped) - ${bundle.name}`);
  });

  // CSS 파일 분석
  if (cssFiles.length > 0) {
    console.log('\n🎨 CSS Files:');
    console.log('-'.repeat(60));
    
    cssFiles.forEach(file => {
      const filePath = path.join(ASSETS_PATH, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      const gzipSize = estimateGzipSize(size);
      
      totalSize += size;
      totalGzipSize += gzipSize;
      
      console.log(`🎨 CSS       ${formatFileSize(size).padStart(8)} (${formatFileSize(gzipSize)} gzipped) - ${file}`);
    });
  }

  // 총합 및 권장사항
  console.log('\n📊 Summary:');
  console.log('-'.repeat(60));
  console.log(`Total Bundle Size: ${formatFileSize(totalSize)}`);
  console.log(`Total Gzipped Size: ${formatFileSize(totalGzipSize)}`);
  console.log(`Number of JS chunks: ${jsFiles.length}`);
  console.log(`Number of CSS files: ${cssFiles.length}`);

  // 성능 권장사항
  console.log('\n💡 Performance Recommendations:');
  console.log('-'.repeat(60));
  
  const largeChunks = bundles.filter(b => b.size > 500 * 1024); // 500KB 이상
  if (largeChunks.length > 0) {
    console.log('⚠️  Large chunks detected (>500KB):');
    largeChunks.forEach(chunk => {
      console.log(`   - ${chunk.name}: ${chunk.formatted}`);
    });
    console.log('   Consider further code splitting for these chunks.\n');
  }
  
  const vendorChunk = bundles.find(b => b.name.includes('vendor'));
  if (vendorChunk && vendorChunk.size > 1024 * 1024) { // 1MB 이상
    console.log('⚠️  Vendor chunk is quite large. Consider:');
    console.log('   - Using dynamic imports for less critical dependencies');
    console.log('   - Analyzing which dependencies contribute most to bundle size\n');
  }
  
  if (jsFiles.length > 15) {
    console.log('⚠️  Many JS chunks detected. This might hurt HTTP/2 performance.');
    console.log('   Consider consolidating some smaller chunks.\n');
  }
  
  if (totalGzipSize < 200 * 1024) {
    console.log('✅ Excellent! Total gzipped size is under 200KB.');
  } else if (totalGzipSize < 500 * 1024) {
    console.log('✅ Good! Total gzipped size is under 500KB.');
  } else {
    console.log('⚠️  Consider optimizing bundle size (current: ' + formatFileSize(totalGzipSize) + ' gzipped)');
  }

  // Stats.html 파일 체크
  if (fs.existsSync(STATS_FILE)) {
    console.log('\n📈 Bundle Visualizer:');
    console.log('-'.repeat(60));
    console.log(`Open ${STATS_FILE} in your browser for detailed analysis.`);
    
    // OS에 따라 다른 명령어로 브라우저 열기
    const platform = process.platform;
    if (platform === 'darwin') {
      console.log('💡 Run: open dist/stats.html');
    } else if (platform === 'win32') {
      console.log('💡 Run: start dist/stats.html');
    } else {
      console.log('💡 Run: xdg-open dist/stats.html');
    }
  }

  console.log('\n' + '='.repeat(60));
  
  // JSON 리포트 생성
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSize,
      totalGzipSize,
      jsChunks: jsFiles.length,
      cssFiles: cssFiles.length
    },
    bundles: bundles.map(b => ({
      name: b.name,
      type: b.type.trim(),
      size: b.size,
      gzipSize: b.gzipSize
    })),
    recommendations: {
      hasLargeChunks: largeChunks.length > 0,
      hasLargeVendor: vendorChunk && vendorChunk.size > 1024 * 1024,
      tooManyChunks: jsFiles.length > 15,
      performanceGrade: totalGzipSize < 200 * 1024 ? 'excellent' : 
                       totalGzipSize < 500 * 1024 ? 'good' : 'needs-optimization'
    }
  };

  // JSON 리포트 저장
  const reportPath = path.join(DIST_PATH, 'bundle-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// 이전 빌드와 비교
function compareWithPrevious() {
  const currentReportPath = path.join(DIST_PATH, 'bundle-report.json');
  const previousReportPath = path.join(DIST_PATH, 'bundle-report-previous.json');
  
  if (fs.existsSync(previousReportPath) && fs.existsSync(currentReportPath)) {
    const current = JSON.parse(fs.readFileSync(currentReportPath, 'utf8'));
    const previous = JSON.parse(fs.readFileSync(previousReportPath, 'utf8'));
    
    const sizeDiff = current.summary.totalGzipSize - previous.summary.totalGzipSize;
    const percentDiff = ((sizeDiff / previous.summary.totalGzipSize) * 100).toFixed(1);
    
    console.log('\n📈 Size Comparison with Previous Build:');
    console.log('-'.repeat(60));
    
    if (sizeDiff > 0) {
      console.log(`📈 Bundle size increased by ${formatFileSize(sizeDiff)} (+${percentDiff}%)`);
    } else if (sizeDiff < 0) {
      console.log(`📉 Bundle size decreased by ${formatFileSize(Math.abs(sizeDiff))} (${percentDiff}%)`);
    } else {
      console.log(`📊 Bundle size unchanged`);
    }
  }
  
  // 현재 리포트를 이전 리포트로 백업
  if (fs.existsSync(currentReportPath)) {
    fs.copyFileSync(currentReportPath, previousReportPath);
  }
}

// 메인 실행
function main() {
  console.log('🚀 Starting Bundle Analysis...');
  
  try {
    analyzeBundles();
    compareWithPrevious();
    
    console.log('\n✅ Bundle analysis completed successfully!');
  } catch (error) {
    console.error('\n❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

main();