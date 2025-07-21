#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let fixedContent = content;
  let changeCount = 0;
  
  // 로컬 import 수정 (./로 시작하는 것들)
  fixedContent = fixedContent.replace(
    /import\s+(.+?)\s+from\s+['"](\.[^'"]*?)['"];?/g,
    (match, imports, specifier) => {
      // 이미 확장자가 있으면 그대로 반환
      if (specifier.endsWith('.js')) {
        return match;
      }
      changeCount++;
      return `import ${imports} from '${specifier}.js';`;
    }
  );
  
  // 상대 경로가 아닌 로컬 import도 수정 (같은 프로젝트 내 모듈)
  fixedContent = fixedContent.replace(
    /import\s+(.+?)\s+from\s+['"]([^'"]*?[^./][^'"]*?)['"];?/g,
    (match, imports, specifier) => {
      // node_modules 패키지는 건드리지 않음
      if (specifier.includes('/node_modules/') || 
          !specifier.startsWith('.') && !specifier.startsWith('/') &&
          !specifier.includes('config/') && !specifier.includes('services/') && 
          !specifier.includes('utils/') && !specifier.includes('models/') &&
          !specifier.includes('routes/') && !specifier.includes('types/') &&
          !specifier.includes('middlewares/') && !specifier.includes('initialization/') &&
          !specifier.includes('controllers/') && !specifier.includes('jobs/') &&
          !specifier.includes('prompts/') && !specifier.includes('shared/')) {
        return match;
      }
      // 이미 확장자가 있으면 그대로 반환
      if (specifier.endsWith('.js')) {
        return match;
      }
      
      // 디렉토리 import 확인 (예: services/system)
      const fullPath = path.resolve(distDir, specifier);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        const indexPath = path.join(fullPath, 'index.js');
        if (fs.existsSync(indexPath)) {
          changeCount++;
          return `import ${imports} from '${specifier}/index.js';`;
        }
      }
      
      changeCount++;
      return `import ${imports} from '${specifier}.js';`;
    }
  );

  if (changeCount > 0) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed ${changeCount} imports in: ${path.relative(distDir, filePath)}`);
  }
}

function processDirectory(directory) {
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.endsWith('.js')) {
      fixImportsInFile(fullPath);
    }
  }
}

console.log('Fixing ESM imports in dist directory...');
processDirectory(distDir);
console.log('Import fixing completed!');