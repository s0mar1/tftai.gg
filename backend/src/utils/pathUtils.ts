/**
 * ESM 호환 경로 유틸리티
 * CommonJS의 __dirname과 __filename을 ESM 환경에서 사용할 수 있도록 지원
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../config/logger';

/**
 * ESM 환경에서 __dirname과 동일한 기능을 제공
 * @param importMetaUrl import.meta.url 값
 * @returns 현재 파일의 디렉토리 경로
 */
export function getDirname(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

/**
 * ESM 환경에서 __filename과 동일한 기능을 제공
 * @param importMetaUrl import.meta.url 값
 * @returns 현재 파일의 전체 경로
 */
export function getFilename(importMetaUrl: string): string {
  return fileURLToPath(importMetaUrl);
}

/**
 * 프로젝트 루트 기준 경로를 안전하게 생성
 * 개발 환경(src/)과 프로덕션 환경(dist/) 모두 지원
 * @param importMetaUrl import.meta.url 값
 * @param relativePath 상대 경로
 * @returns 절대 경로
 */
export function getProjectPath(importMetaUrl: string, relativePath: string): string {
  const currentDir = getDirname(importMetaUrl);
  
  // dist 환경인지 src 환경인지 확인
  const isDistEnvironment = currentDir.includes('/dist/');
  
  if (isDistEnvironment) {
    // 프로덕션 환경: dist 폴더 기준
    // dist/routes/staticData.js에서 dist/data/file.json으로 접근
    const distRoot = currentDir.split('/dist/')[0] + '/dist';
    return join(distRoot, relativePath);
  } else {
    // 개발 환경: src 폴더 기준
    // src/routes/staticData.ts에서 src/data/file.json으로 접근
    const srcRoot = currentDir.split('/src/')[0] + '/src';
    return join(srcRoot, relativePath);
  }
}

/**
 * data 폴더의 파일 경로를 안전하게 생성
 * @param importMetaUrl import.meta.url 값
 * @param filename data 폴더 내 파일명
 * @returns data 파일의 절대 경로
 */
export function getDataFilePath(importMetaUrl: string, filename: string): string {
  const currentDir = getDirname(importMetaUrl);
  const isDistEnvironment = currentDir.includes('/dist/');
  const finalPath = getProjectPath(importMetaUrl, join('data', filename));
  
  // 프로덕션 환경에서는 경로 생성 과정을 로깅
  if (process.env.NODE_ENV === 'production') {
    logger.info('[pathUtils] Data file path generation', {
      filename,
      currentDir,
      isDistEnvironment,
      finalPath,
      nodeEnv: process.env.NODE_ENV
    });
  }
  
  return finalPath;
}