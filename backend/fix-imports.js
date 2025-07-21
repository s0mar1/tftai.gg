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
  
  // 모든 import 문을 찾아서 처리
  fixedContent = fixedContent.replace(
    /import\s+(.+?)\s+from\s+['"]([^'"]+?)['"];?/g,
    (match, imports, specifier) => {
      // 이미 .js 확장자가 있거나 외부 패키지면 그대로 반환
      if (specifier.endsWith('.js') || isExternalPackage(specifier)) {
        return match;
      }
      
      // 상대 경로든 절대 경로든 로컬 모듈인지 확인
      if (isLocalModule(specifier)) {
        const resolvedSpecifier = resolveLocalImport(specifier, filePath);
        if (resolvedSpecifier !== specifier) {
          changeCount++;
          return `import ${imports} from '${resolvedSpecifier}';`;
        }
      }
      
      return match;
    }
  );

  if (changeCount > 0) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Fixed ${changeCount} imports in: ${path.relative(distDir, filePath)}`);
  }
}

function isExternalPackage(specifier) {
  // node_modules 패키지나 내장 모듈인지 확인
  return !specifier.startsWith('.') && 
         !specifier.startsWith('/') && 
         !specifier.includes('config/') && 
         !specifier.includes('services/') && 
         !specifier.includes('utils/') && 
         !specifier.includes('models/') &&
         !specifier.includes('routes/') && 
         !specifier.includes('types/') &&
         !specifier.includes('middlewares/') && 
         !specifier.includes('initialization/') &&
         !specifier.includes('controllers/') && 
         !specifier.includes('jobs/') &&
         !specifier.includes('prompts/') && 
         !specifier.includes('shared/');
}

function isLocalModule(specifier) {
  return specifier.startsWith('.') || 
         specifier.includes('config/') || 
         specifier.includes('services/') || 
         specifier.includes('utils/') || 
         specifier.includes('models/') ||
         specifier.includes('routes/') || 
         specifier.includes('types/') ||
         specifier.includes('middlewares/') || 
         specifier.includes('initialization/') ||
         specifier.includes('controllers/') || 
         specifier.includes('jobs/') ||
         specifier.includes('prompts/') || 
         specifier.includes('shared/');
}

function resolveLocalImport(specifier, currentFilePath) {
  // 현재 파일 기준으로 실제 경로 계산
  const currentDir = path.dirname(currentFilePath);
  let targetPath;
  
  if (specifier.startsWith('.')) {
    // 상대 경로
    targetPath = path.resolve(currentDir, specifier);
  } else {
    // 절대 경로 (dist 기준)
    targetPath = path.resolve(distDir, specifier);
  }
  
  // 파일이 존재하는지 확인
  if (fs.existsSync(targetPath + '.js')) {
    return specifier + '.js';
  }
  
  // 디렉토리인지 확인하고 index.js가 있는지 체크
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    const indexPath = path.join(targetPath, 'index.js');
    if (fs.existsSync(indexPath)) {
      return specifier + '/index.js';
    }
  }
  
  // 기본적으로 .js 확장자 추가
  return specifier + '.js';
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