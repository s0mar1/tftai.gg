#!/usr/bin/env node

/**
 * TFT Set 15 다국어 매핑 검증 스크립트
 * 
 * 이 스크립트는 Set 15의 모든 게임 요소들이 각 언어별로 올바르게 번역되어 있는지 확인합니다.
 * - 챔피언 이름
 * - 특성(시너지) 이름
 * - 아이템 이름
 * - 증강체 이름
 */

require('dotenv').config({ path: './backend/.env' });

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 지원 언어
const SUPPORTED_LANGUAGES = {
  en: 'en_us',
  ko: 'ko_kr', 
  ja: 'ja_jp',
  zh: 'zh_cn'
};

const LOCALE_URLS = {
  'en_us': 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json',
  'ko_kr': 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json',
  'ja_jp': 'https://raw.communitydragon.org/latest/cdragon/tft/ja_jp.json',
  'zh_cn': 'https://raw.communitydragon.org/latest/cdragon/tft/zh_cn.json',
};

// 검증 결과 저장용
const verificationReport = {
  timestamp: new Date().toISOString(),
  set: 'Set15',
  languages: [],
  issues: [],
  summary: {}
};

// TFT 데이터 로드
async function loadTFTData(locale) {
  try {
    console.log(`📥 ${locale} 데이터 로딩 중...`);
    const response = await axios.get(LOCALE_URLS[locale], {
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024 // 50MB
    });
    console.log(`✅ ${locale} 데이터 로드 완료`);
    return response.data;
  } catch (error) {
    console.error(`❌ ${locale} 데이터 로드 실패:`, error.message);
    return null;
  }
}

// Set 15 데이터 추출
function extractSet15Data(tftData) {
  if (!tftData || !tftData.sets) {
    return null;
  }

  // Set 번호 찾기 (가장 최신 Set)
  const setKeys = Object.keys(tftData.sets)
    .filter(key => !isNaN(parseInt(key)))
    .sort((a, b) => parseInt(b) - parseInt(a));

  const latestSet = setKeys[0];
  const setData = tftData.sets[latestSet];

  if (!setData) {
    return null;
  }

  // 챔피언 필터링 (Set 15 챔피언만)
  const champions = setData.champions.filter(champ => {
    const apiName = champ.apiName || '';
    return apiName.includes('TFT15_') || apiName.includes('tft15_');
  });

  return {
    setNumber: latestSet,
    champions: champions,
    traits: setData.traits || [],
    items: tftData.items || [],
    augments: tftData.items?.filter(item => 
      item.apiName?.includes('TFT_Aug_') || 
      item.apiName?.includes('TFT_Augment_')
    ) || []
  };
}

// 번역 비교 및 검증
function compareTranslations(enData, langData, language) {
  const issues = [];
  const stats = {
    language,
    totalChampions: 0,
    translatedChampions: 0,
    totalTraits: 0,
    translatedTraits: 0,
    totalItems: 0,
    translatedItems: 0,
    totalAugments: 0,
    translatedAugments: 0
  };

  // 1. 챔피언 번역 검증
  console.log(`\n🏆 ${language} 챔피언 번역 검증 중...`);
  enData.champions.forEach(enChamp => {
    stats.totalChampions++;
    const langChamp = langData.champions.find(c => c.apiName === enChamp.apiName);
    
    if (!langChamp) {
      issues.push({
        type: 'MISSING_CHAMPION',
        language,
        apiName: enChamp.apiName,
        enName: enChamp.name,
        message: `챔피언 누락: ${enChamp.name} (${enChamp.apiName})`
      });
    } else if (langChamp.name === enChamp.name && language !== 'en') {
      issues.push({
        type: 'UNTRANSLATED_CHAMPION',
        language,
        apiName: enChamp.apiName,
        enName: enChamp.name,
        langName: langChamp.name,
        message: `챔피언 미번역: ${enChamp.name} → ${langChamp.name}`
      });
    } else {
      stats.translatedChampions++;
      console.log(`✅ ${enChamp.name} → ${langChamp.name}`);
    }
  });

  // 2. 특성 번역 검증
  console.log(`\n🎯 ${language} 특성 번역 검증 중...`);
  enData.traits.forEach(enTrait => {
    stats.totalTraits++;
    const langTrait = langData.traits.find(t => t.apiName === enTrait.apiName);
    
    if (!langTrait) {
      issues.push({
        type: 'MISSING_TRAIT',
        language,
        apiName: enTrait.apiName,
        enName: enTrait.name,
        message: `특성 누락: ${enTrait.name} (${enTrait.apiName})`
      });
    } else if (langTrait.name === enTrait.name && language !== 'en') {
      issues.push({
        type: 'UNTRANSLATED_TRAIT',
        language,
        apiName: enTrait.apiName,
        enName: enTrait.name,
        langName: langTrait.name,
        message: `특성 미번역: ${enTrait.name} → ${langTrait.name}`
      });
    } else {
      stats.translatedTraits++;
      console.log(`✅ ${enTrait.name} → ${langTrait.name}`);
    }
  });

  // 3. 아이템 번역 검증 (Set 15 관련 아이템)
  console.log(`\n⚔️ ${language} 아이템 번역 검증 중...`);
  const set15Items = enData.items.filter(item => 
    item.icon?.includes('Set15') || 
    item.apiName?.includes('15')
  );

  set15Items.forEach(enItem => {
    stats.totalItems++;
    const langItem = langData.items.find(i => i.apiName === enItem.apiName);
    
    if (!langItem) {
      issues.push({
        type: 'MISSING_ITEM',
        language,
        apiName: enItem.apiName,
        enName: enItem.name,
        message: `아이템 누락: ${enItem.name} (${enItem.apiName})`
      });
    } else if (langItem.name === enItem.name && language !== 'en') {
      issues.push({
        type: 'UNTRANSLATED_ITEM',
        language,
        apiName: enItem.apiName,
        enName: enItem.name,
        langName: langItem.name,
        message: `아이템 미번역: ${enItem.name} → ${langItem.name}`
      });
    } else {
      stats.translatedItems++;
      console.log(`✅ ${enItem.name} → ${langItem.name}`);
    }
  });

  // 4. 증강체 번역 검증
  console.log(`\n💎 ${language} 증강체 번역 검증 중 (샘플)...`);
  const sampleAugments = enData.augments.slice(0, 10); // 너무 많아서 샘플만
  
  sampleAugments.forEach(enAug => {
    stats.totalAugments++;
    const langAug = langData.augments.find(a => a.apiName === enAug.apiName);
    
    if (!langAug) {
      issues.push({
        type: 'MISSING_AUGMENT',
        language,
        apiName: enAug.apiName,
        enName: enAug.name,
        message: `증강체 누락: ${enAug.name} (${enAug.apiName})`
      });
    } else if (langAug.name === enAug.name && language !== 'en') {
      issues.push({
        type: 'UNTRANSLATED_AUGMENT',
        language,
        apiName: enAug.apiName,
        enName: enAug.name,
        langName: langAug.name,
        message: `증강체 미번역: ${enAug.name} → ${langAug.name}`
      });
    } else {
      stats.translatedAugments++;
      console.log(`✅ ${enAug.name} → ${langAug.name}`);
    }
  });

  return { issues, stats };
}

// 주요 챔피언 번역 예시 생성
function generateTranslationExamples(allData) {
  const examples = [];
  const popularChampions = ['Ahri', 'Yasuo', 'Jinx', 'Lux', 'Ezreal'];
  
  console.log('\n📋 주요 챔피언 번역 예시:');
  console.log('='.repeat(60));
  
  allData.en.champions.forEach(enChamp => {
    // 인기 챔피언이거나 Set 15 특별 챔피언인 경우
    if (popularChampions.some(name => enChamp.name.includes(name))) {
      const example = {
        apiName: enChamp.apiName,
        en: enChamp.name,
        ko: allData.ko?.champions.find(c => c.apiName === enChamp.apiName)?.name || 'N/A',
        ja: allData.ja?.champions.find(c => c.apiName === enChamp.apiName)?.name || 'N/A',
        zh: allData.zh?.champions.find(c => c.apiName === enChamp.apiName)?.name || 'N/A'
      };
      
      examples.push(example);
      console.log(`${example.en}: ${example.ko} | ${example.ja} | ${example.zh}`);
    }
  });
  
  return examples;
}

// 메인 실행 함수
async function main() {
  console.log('🚀 TFT Set 15 다국어 매핑 검증 시작\n');
  
  const allData = {};
  const allStats = {};
  const allIssues = [];

  // 1. 모든 언어 데이터 로드
  for (const [lang, locale] of Object.entries(SUPPORTED_LANGUAGES)) {
    const rawData = await loadTFTData(locale);
    
    if (rawData) {
      const set15Data = extractSet15Data(rawData);
      
      if (set15Data) {
        allData[lang] = set15Data;
        console.log(`✅ ${lang} Set ${set15Data.setNumber} 데이터 추출 완료`);
        console.log(`   - 챔피언: ${set15Data.champions.length}개`);
        console.log(`   - 특성: ${set15Data.traits.length}개`);
        console.log(`   - 아이템: ${set15Data.items.length}개`);
      } else {
        console.error(`❌ ${lang} Set 15 데이터 추출 실패`);
      }
    }
  }

  // 2. 영어를 기준으로 다른 언어들과 비교
  if (allData.en) {
    for (const [lang, data] of Object.entries(allData)) {
      if (lang !== 'en' && data) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 ${lang.toUpperCase()} 언어 검증`);
        console.log('='.repeat(60));
        
        const { issues, stats } = compareTranslations(allData.en, data, lang);
        allStats[lang] = stats;
        allIssues.push(...issues);
      }
    }
  }

  // 3. 번역 예시 생성
  const examples = generateTranslationExamples(allData);

  // 4. 보고서 생성
  verificationReport.languages = Object.keys(allData);
  verificationReport.issues = allIssues;
  verificationReport.summary = allStats;
  verificationReport.examples = examples;

  // 5. 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 검증 결과 요약');
  console.log('='.repeat(60));
  
  for (const [lang, stats] of Object.entries(allStats)) {
    console.log(`\n🌐 ${lang.toUpperCase()} 언어:`);
    console.log(`   챔피언: ${stats.translatedChampions}/${stats.totalChampions} 번역됨`);
    console.log(`   특성: ${stats.translatedTraits}/${stats.totalTraits} 번역됨`);
    console.log(`   아이템: ${stats.translatedItems}/${stats.totalItems} 번역됨`);
    console.log(`   증강체: ${stats.translatedAugments}/${stats.totalAugments} 번역됨 (샘플)`);
  }

  console.log(`\n⚠️ 총 이슈: ${allIssues.length}개`);
  
  // 이슈 타입별 집계
  const issuesByType = {};
  allIssues.forEach(issue => {
    issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
  });
  
  console.log('\n📋 이슈 타입별 분석:');
  for (const [type, count] of Object.entries(issuesByType)) {
    console.log(`   ${type}: ${count}개`);
  }

  // 6. 보고서 파일 저장
  const reportPath = path.join(__dirname, 'set15-language-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(verificationReport, null, 2));
  console.log(`\n📄 상세 보고서 저장: ${reportPath}`);

  // 7. 주요 문제점 강조
  if (allIssues.length > 0) {
    console.log('\n🚨 주요 문제점:');
    allIssues.slice(0, 10).forEach(issue => {
      console.log(`   - [${issue.language}] ${issue.message}`);
    });
    
    if (allIssues.length > 10) {
      console.log(`   ... 그 외 ${allIssues.length - 10}개 이슈`);
    }
  }

  console.log('\n✅ Set 15 다국어 매핑 검증 완료!');
}

// 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };