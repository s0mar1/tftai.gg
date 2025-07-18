// tests/e2e/local.spec.ts
// 기존 test-local.js를 Playwright 공식 테스트 스위트로 통합

import { test, expect } from '@playwright/test';

test.describe('Local Environment Tests', () => {
  test('should render basic HTML page correctly', async ({ page }) => {
    // 간단한 HTML 콘텐츠 설정 (기존 test-local.js와 동일한 내용)
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Playwright 테스트</title>
          <style>
            body { font-family: Arial; padding: 50px; background: #f0f0f0; }
            h1 { color: #333; }
            button { padding: 10px 20px; font-size: 16px; margin: 10px; }
          </style>
        </head>
        <body>
          <h1>Playwright 테스트 페이지</h1>
          <p id="current-time">현재 시간: ${new Date().toLocaleString()}</p>
          <button id="alert-btn" onclick="alert('버튼 클릭됨!')">클릭해보세요</button>
          <button id="color-btn" onclick="document.body.style.background='lightblue'">배경색 변경</button>
        </body>
      </html>
    `);

    // 페이지 요소들이 올바르게 렌더링되었는지 확인
    await expect(page.locator('h1')).toHaveText('Playwright 테스트 페이지');
    await expect(page.locator('#current-time')).toContainText('현재 시간:');
    await expect(page.locator('#alert-btn')).toHaveText('클릭해보세요');
    await expect(page.locator('#color-btn')).toHaveText('배경색 변경');
  });

  test('should change background color when button is clicked', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 50px; background: #f0f0f0; }
            button { padding: 10px 20px; font-size: 16px; margin: 10px; }
          </style>
        </head>
        <body>
          <h1>Background Color Test</h1>
          <button id="color-btn" onclick="document.body.style.background='lightblue'">배경색 변경</button>
        </body>
      </html>
    `);

    // 초기 배경색 확인
    const initialBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // 버튼 클릭
    await page.click('#color-btn');

    // 배경색이 변경되었는지 확인
    const newBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(newBgColor).not.toBe(initialBgColor);
    expect(newBgColor).toBe('lightblue');
  });

  test('should handle JavaScript interactions correctly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="counter">0</div>
          <button id="increment" onclick="increment()">증가</button>
          <script>
            let count = 0;
            function increment() {
              count++;
              document.getElementById('counter').textContent = count;
            }
          </script>
        </body>
      </html>
    `);

    // 초기 카운터 값 확인
    await expect(page.locator('#counter')).toHaveText('0');

    // 버튼을 여러 번 클릭하여 카운터 증가 테스트
    for (let i = 1; i <= 5; i++) {
      await page.click('#increment');
      await expect(page.locator('#counter')).toHaveText(i.toString());
    }
  });

  test('should handle CSS styling correctly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .test-element {
              color: red;
              font-size: 16px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="test-element" id="styled-element">스타일 테스트</div>
        </body>
      </html>
    `);

    // CSS 스타일이 올바르게 적용되었는지 확인
    const element = page.locator('#styled-element');
    
    await expect(element).toHaveCSS('color', 'rgb(255, 0, 0)'); // red
    await expect(element).toHaveCSS('font-size', '16px');
    await expect(element).toHaveCSS('font-weight', '700'); // bold
  });

  test('should handle form interactions', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="test-form">
            <input type="text" id="name-input" name="name" placeholder="이름을 입력하세요" />
            <select id="category-select" name="category">
              <option value="">카테고리 선택</option>
              <option value="frontend">프론트엔드</option>
              <option value="backend">백엔드</option>
              <option value="fullstack">풀스택</option>
            </select>
            <button type="submit" id="submit-btn">제출</button>
          </form>
          <div id="result"></div>
          <script>
            document.getElementById('test-form').addEventListener('submit', function(e) {
              e.preventDefault();
              const name = document.getElementById('name-input').value;
              const category = document.getElementById('category-select').value;
              document.getElementById('result').textContent = 
                \`이름: \${name}, 카테고리: \${category}\`;
            });
          </script>
        </body>
      </html>
    `);

    // 폼 입력 테스트
    await page.fill('#name-input', '테스트 사용자');
    await page.selectOption('#category-select', 'frontend');
    
    // 입력된 값 확인
    await expect(page.locator('#name-input')).toHaveValue('테스트 사용자');
    await expect(page.locator('#category-select')).toHaveValue('frontend');
    
    // 폼 제출
    await page.click('#submit-btn');
    
    // 결과 확인
    await expect(page.locator('#result')).toHaveText('이름: 테스트 사용자, 카테고리: frontend');
  });

  test('should handle responsive design elements', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .responsive-element {
              width: 100%;
              max-width: 500px;
              height: 200px;
              background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
            }
            @media (max-width: 768px) {
              .responsive-element {
                height: 150px;
                font-size: 14px;
              }
            }
          </style>
        </head>
        <body>
          <div class="responsive-element" id="responsive-div">
            반응형 테스트 요소
          </div>
        </body>
      </html>
    `);

    // 데스크톱 뷰포트에서 테스트
    await page.setViewportSize({ width: 1200, height: 800 });
    
    const desktopElement = page.locator('#responsive-div');
    await expect(desktopElement).toHaveCSS('height', '200px');
    
    // 모바일 뷰포트에서 테스트
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(desktopElement).toHaveCSS('height', '150px');
  });
});