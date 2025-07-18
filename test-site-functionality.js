import { chromium } from 'playwright';

(async () => {
  try {
    console.log('🔍 TFT Meta Analyzer 기능 테스트 시작...');
    
    const browser = await chromium.launch({
      headless: false,
      slowMo: 1500,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 사이트 접속
    console.log('🌐 localhost:5173 접속 중...');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('domcontentloaded');
    
    const title = await page.title();
    console.log(`✅ 페이지 제목: ${title}`);
    
    // 1. 네비게이션 메뉴 테스트
    console.log('\n🧭 네비게이션 메뉴 테스트...');
    const navItems = ['추천 메타', '덱공략', '랭킹', '상세 통계', '덱 빌더', 'AI 질문하기'];
    
    for (const item of navItems) {
      try {
        const navElement = page.locator(`text=${item}`);
        if (await navElement.count() > 0) {
          console.log(`✅ 네비게이션 메뉴 발견: ${item}`);
        } else {
          console.log(`⚠️ 네비게이션 메뉴 미발견: ${item}`);
        }
      } catch (error) {
        console.log(`❌ 네비게이션 메뉴 오류: ${item}`);
      }
    }
    
    // 2. 검색창 테스트
    console.log('\n🔍 검색창 기능 테스트...');
    const searchInput = page.locator('input[placeholder*="소환사명"]');
    if (await searchInput.count() > 0) {
      console.log('✅ 검색창 발견');
      await searchInput.fill('챌린저#KR1');
      console.log('✅ 검색어 입력 완료');
      
      // 검색 버튼 클릭
      const searchButton = page.locator('button[type="submit"], button:has-text("검색")').first();
      if (await searchButton.count() > 0) {
        console.log('✅ 검색 버튼 발견');
        await searchButton.click();
        console.log('✅ 검색 실행');
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('⚠️ 검색창 미발견');
    }
    
    // 3. 지역 선택 테스트
    console.log('\n🌍 지역 선택 기능 테스트...');
    const regionSelect = page.locator('select', { hasText: 'KR' }).or(page.locator('[data-testid="region-select"]'));
    if (await regionSelect.count() > 0) {
      console.log('✅ 지역 선택 드롭다운 발견');
      await regionSelect.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ 지역 선택 드롭다운 미발견');
    }
    
    // 4. 다크모드 토글 테스트
    console.log('\n🌙 다크모드 토글 테스트...');
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]').or(page.locator('button:has-text("다크모드")'));
    if (await darkModeToggle.count() > 0) {
      console.log('✅ 다크모드 토글 발견');
      await darkModeToggle.click();
      console.log('✅ 다크모드 토글 클릭');
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ 다크모드 토글 미발견');
    }
    
    // 5. 언어 선택 테스트
    console.log('\n🗣️ 언어 선택 기능 테스트...');
    const langButton = page.locator('button:has-text("한국어")').or(page.locator('[data-testid="language-selector"]'));
    if (await langButton.count() > 0) {
      console.log('✅ 언어 선택 버튼 발견');
      await langButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('⚠️ 언어 선택 버튼 미발견');
    }
    
    // 6. 추천 메타 섹션 테스트
    console.log('\n🎯 추천 메타 섹션 테스트...');
    try {
      await page.locator('text=추천 메타').click();
      console.log('✅ 추천 메타 클릭');
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('⚠️ 추천 메타 클릭 실패');
    }
    
    // 7. AI 질문하기 테스트
    console.log('\n🤖 AI 질문하기 기능 테스트...');
    try {
      await page.locator('text=AI 질문하기').click();
      console.log('✅ AI 질문하기 클릭');
      await page.waitForTimeout(2000);
      
      // AI 질문 입력창 확인
      const aiInput = page.locator('textarea, input[placeholder*="질문"]');
      if (await aiInput.count() > 0) {
        console.log('✅ AI 질문 입력창 발견');
        await aiInput.fill('현재 메타에서 가장 강한 덱은 무엇인가요?');
        console.log('✅ AI 질문 입력 완료');
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('⚠️ AI 질문하기 기능 테스트 실패');
    }
    
    // 8. 덱 빌더 테스트
    console.log('\n🔧 덱 빌더 기능 테스트...');
    try {
      await page.locator('text=덱 빌더').click();
      console.log('✅ 덱 빌더 클릭');
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('⚠️ 덱 빌더 클릭 실패');
    }
    
    // 9. 성능 모니터 확인
    console.log('\n📊 성능 모니터 확인...');
    const performanceMonitor = page.locator('text=Performance Monitor');
    if (await performanceMonitor.count() > 0) {
      console.log('✅ 성능 모니터 발견');
      
      // Core Web Vitals 확인
      const cwvElements = await page.locator('[data-testid*="cwv"], text=/FCP|LCP|CLS|FID|TTFB/').all();
      console.log(`✅ Core Web Vitals 요소 ${cwvElements.length}개 발견`);
    } else {
      console.log('⚠️ 성능 모니터 미발견');
    }
    
    // 10. 반응형 디자인 테스트
    console.log('\n📱 반응형 디자인 테스트...');
    
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    console.log('✅ 모바일 뷰포트로 변경');
    await page.waitForTimeout(1000);
    
    // 다시 데스크톱으로 변경
    await page.setViewportSize({ width: 1200, height: 800 });
    console.log('✅ 데스크톱 뷰포트로 복원');
    await page.waitForTimeout(1000);
    
    // 11. 에러 로그 확인
    console.log('\n🐛 브라우저 콘솔 에러 확인...');
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ 콘솔 에러: ${msg.text()}`);
      }
    });
    
    // 12. 스크린샷 촬영
    console.log('\n📸 최종 스크린샷 촬영...');
    await page.screenshot({ path: 'functionality-test-screenshot.png', fullPage: true });
    console.log('✅ 스크린샷 저장: functionality-test-screenshot.png');
    
    // 마무리
    console.log('\n⏱️ 10초 후 브라우저를 닫습니다...');
    await page.waitForTimeout(10000);
    
    await browser.close();
    console.log('\n🎉 모든 기능 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
})();