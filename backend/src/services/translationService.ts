import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cacheManager from './cacheManager';
import dotenv from 'dotenv';
import { AI_CONFIG, envGuards } from '../config/env';

// translationService.ts의 위치를 기준으로 상위 폴더의 .env 파일을 명시적으로 지정합니다.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

interface TranslationInstructions {
  name: string;
  instruction: string;
}

interface TranslationText {
  path: string;
  text: string;
}

interface TranslationResult {
  success: boolean;
  message: string;
  translated: number;
  total: number;
  filePath: string;
  fromCache?: boolean;
}

interface TranslationResults {
  [language: string]: TranslationResult | { success: false; _error: string };
}

// Gemini AI 설정 - lazy initialization
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function initializeGeminiAI() {
  if (!genAI) {
    const apiKey = AI_CONFIG.GOOGLE_AI_TRANSLATION_KEY;
    if (!envGuards.hasGoogleAIKey(apiKey)) {
      throw new Error('GOOGLE_AI_TRANSLATION_API_KEY가 설정되지 않았습니다. 번역 기능을 사용할 수 없습니다.');
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro", // 모델 변경
      generationConfig: {
        responseMimeType: "application/json", // JSON 출력 보장
      },
    });
  }
  return model!;
}

// 언어별 번역 지침
const TRANSLATION_INSTRUCTIONS: { [key: string]: TranslationInstructions } = {
  en: {
    name: 'English (US)',
    instruction: 'Translate the values in the following JSON object from Korean to natural, gaming-centric English. Maintain the original JSON structure and keys. Only translate the string values.'
  },
  ja: {
    name: 'Japanese',
    instruction: '다음 JSON 객체의 값을 한국어에서 자연스러운 게임 중심의 일본어로 번역하십시오. 원래의 JSON 구조와 키는 그대로 유지해야 합니다. 문자열 값만 번역하십시오.'
  },
  zh: {
    name: 'Chinese (Simplified)',
    instruction: '请将以下JSON对象中的值从韩语翻译成自然的、以游戏为中心的简体中文。保持原有的JSON结构和键不变。只翻译字符串值。'
  }
};

/**
 * JSON 객체 내의 모든 문자열 값을 재귀적으로 추출
 */
function extractTextsFromObject(obj: any, prefix: string = ''): TranslationText[] {
  const texts: TranslationText[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      texts.push({
        path: currentPath,
        text: value
      });
    } else if (typeof value === 'object' && value !== null) {
      texts.push(...extractTextsFromObject(value, currentPath));
    }
  }
  
  return texts;
}

/**
 * 추출된 텍스트들을 다시 JSON 구조로 재구성
 */
function reconstructObjectFromTexts(translatedTexts: TranslationText[]): any {
  const result: any = {};
  
  for (const { path, text } of translatedTexts) {
    const keys = path.split('.');
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = text;
  }
  
  return result;
}

/**
 * 텍스트 묶음을 단일 API 호출로 번역 (API 호출 최적화)
 */
async function translateTextsInBatch(texts: TranslationText[], targetLanguage: string): Promise<TranslationText[]> {
  const instructions = TRANSLATION_INSTRUCTIONS[targetLanguage];
  if (!instructions) {
    throw new Error(`지원하지 않는 언어: ${targetLanguage}`);
  }

  // 1. 번역할 텍스트들을 경로를 키로 하는 단일 JSON 객체로 변환
  const jsonToTranslate = texts.reduce((obj: any, item) => {
    obj[item.path] = item.text;
    return obj;
  }, {});

  // 2. AI에게 전달할 프롬프트 생성
  const prompt = `${instructions.instruction}

Keep placeholders like {{count}} exactly as they are.
Return ONLY the translated JSON object.

JSON to translate:
${JSON.stringify(jsonToTranslate, null, 2)}
`;

  try {
    // 3. 단일 API 호출 실행
    const result = await initializeGeminiAI().generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // 4. AI가 반환한 JSON 문자열 파싱
    const translatedJson = JSON.parse(responseText);

    // 5. 번역된 JSON 객체를 다시 {path, text} 형태의 배열로 변환
    const translatedTexts = Object.entries(translatedJson).map(([path, text]) => ({
      path,
      text: text as string,
    }));

    return translatedTexts;

  } catch (_error) {
    // 실패 시에는 원본 텍스트를 그대로 반환하여 파일 구조가 깨지는 것을 방지
    return texts;
  }
}

/**
 * 한국어 번역 파일을 읽어서 대상 언어로 번역
 */
export async function translateUITexts(targetLanguage: string, forceUpdate: boolean = false): Promise<TranslationResult> {
  try {
    const koFilePath = path.join(__dirname, '../../..', 'frontend/public/locales/ko/translation.json');
    const targetFilePath = path.join(__dirname, '../../..', `frontend/public/locales/${targetLanguage}/translation.json`);
    
    // 캐시 체크 (강제 업데이트가 아닌 경우)
    if (!forceUpdate && !cacheManager.needsTranslation(targetLanguage)) {
      
      // 기존 번역 파일 정보 반환
      if (fs.existsSync(targetFilePath)) {
        const existingTranslation = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
        const existingTexts = extractTextsFromObject(existingTranslation);
        return {
          success: true,
          message: `${TRANSLATION_INSTRUCTIONS[targetLanguage]?.name} 번역이 이미 최신 상태입니다.`,
          translated: existingTexts.length,
          total: existingTexts.length,
          filePath: targetFilePath,
          fromCache: true
        };
      }
    }
    
    // 한국어 번역 파일 읽기
    if (!fs.existsSync(koFilePath)) {
      throw new Error(`한국어 번역 파일을 찾을 수 없습니다: ${koFilePath}`);
    }
    
    const koData = JSON.parse(fs.readFileSync(koFilePath, 'utf8'));
    
    // 텍스트 추출
    const textsToTranslate = extractTextsFromObject(koData);
    
    if (textsToTranslate.length === 0) {
      return { 
        success: true, 
        message: '번역할 텍스트가 없습니다.', 
        translated: 0, 
        total: 0,
        filePath: targetFilePath 
      };
    }
    
    // 번역 실행 (새로운 배치 함수 호출)
    const translatedTexts = await translateTextsInBatch(textsToTranslate, targetLanguage);
    
    // JSON 구조로 재구성
    const translatedData = reconstructObjectFromTexts(translatedTexts);
    
    // 대상 디렉토리 생성
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 번역 파일 저장
    fs.writeFileSync(targetFilePath, JSON.stringify(translatedData, null, 2), 'utf8');
    
    // 캐시 업데이트
    cacheManager.updateCacheAfterTranslation(targetLanguage, translatedTexts.length, textsToTranslate.length);
    
    return {
      success: true,
      message: `${TRANSLATION_INSTRUCTIONS[targetLanguage].name} 번역이 완료되었습니다.`,
      translated: translatedTexts.length,
      total: textsToTranslate.length,
      filePath: targetFilePath
    };
    
  } catch (_error: any) {
    throw _error;
  }
}

/**
 * 모든 지원 언어로 번역
 */
export async function translateAllLanguages(): Promise<TranslationResults> {
  const results: TranslationResults = {};
  const languages = Object.keys(TRANSLATION_INSTRUCTIONS);
  
  for (const language of languages) {
    try {
      results[language] = await translateUITexts(language);
    } catch (_error: any) {
      results[language] = {
        success: false,
        _error: _error.message
      };
    }
  }
  
  return results;
}

// 초기화 시 캐시 상태 확인 (선택사항)
// cacheManager.getCacheStatus();