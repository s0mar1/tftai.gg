// 입력 검증 유틸리티 함수들

/**
 * XSS 방지를 위한 HTML 이스케이프 함수
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 위험한 HTML 태그 제거
 */
export function sanitizeHtml(html: string): string {
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
  let sanitized = html;
  
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    
    // 자체 닫힌 태그도 제거
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });
  
  return sanitized;
}

/**
 * 소환사 이름 유효성 검증
 */
export function validateSummonerName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: '소환사 이름을 입력해주세요.' };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 1) {
    return { isValid: false, error: '소환사 이름을 입력해주세요.' };
  }
  
  if (trimmedName.length > 16) {
    return { isValid: false, error: '소환사 이름은 16자 이하여야 합니다.' };
  }
  
  // 특수 문자 제한 (라이엇 게임즈 규칙 기반)
  const validPattern = /^[a-zA-Z0-9\s\u3131-\u3163\u1100-\u11FF\uAC00-\uD7A3]+$/;
  if (!validPattern.test(trimmedName)) {
    return { isValid: false, error: '소환사 이름에 허용되지 않는 문자가 포함되어 있습니다.' };
  }
  
  return { isValid: true };
}

/**
 * 태그라인 유효성 검증
 */
export function validateTagLine(tagLine: string): { isValid: boolean; error?: string } {
  if (!tagLine || typeof tagLine !== 'string') {
    return { isValid: false, error: '태그라인을 입력해주세요.' };
  }
  
  const trimmedTagLine = tagLine.trim();
  
  if (trimmedTagLine.length < 1) {
    return { isValid: false, error: '태그라인을 입력해주세요.' };
  }
  
  if (trimmedTagLine.length > 5) {
    return { isValid: false, error: '태그라인은 5자 이하여야 합니다.' };
  }
  
  // 태그라인은 영숫자만 허용
  const validPattern = /^[a-zA-Z0-9]+$/;
  if (!validPattern.test(trimmedTagLine)) {
    return { isValid: false, error: '태그라인은 영문과 숫자만 사용할 수 있습니다.' };
  }
  
  return { isValid: true };
}

/**
 * URL 유효성 검증
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: '유효한 URL을 입력해주세요.' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // HTTP/HTTPS만 허용
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'HTTP 또는 HTTPS URL만 허용됩니다.' };
    }
    
    // 로컬 호스트 및 내부 IP 차단 (보안)
    const hostname = urlObj.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return { isValid: false, error: '로컬 또는 내부 네트워크 URL은 허용되지 않습니다.' };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: '유효하지 않은 URL입니다.' };
  }
}

/**
 * 채팅 메시지 유효성 검증
 */
export function validateChatMessage(message: string): { isValid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: '메시지를 입력해주세요.' };
  }
  
  const trimmedMessage = message.trim();
  
  if (trimmedMessage.length < 1) {
    return { isValid: false, error: '메시지를 입력해주세요.' };
  }
  
  if (trimmedMessage.length > 1000) {
    return { isValid: false, error: '메시지는 1000자 이하여야 합니다.' };
  }
  
  // 스팸 패턴 감지
  const spamPatterns = [
    /(.)\1{10,}/, // 같은 문자 10개 이상 반복
    /https?:\/\/[^\s]+/gi, // URL 패턴
    /\b(?:광고|홍보|마케팅|상품|판매|구매|문의|연락|전화|카톡|카카오톡|텔레그램|discordd?|디스코드)\b/gi, // 스팸 키워드
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(trimmedMessage)) {
      return { isValid: false, error: '스팸성 메시지는 허용되지 않습니다.' };
    }
  }
  
  return { isValid: true };
}

/**
 * 정수 유효성 검증
 */
export function validateInteger(value: any, min?: number, max?: number): { isValid: boolean; error?: string; value?: number } {
  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    return { isValid: false, error: '유효한 숫자를 입력해주세요.' };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `값은 ${min} 이상이어야 합니다.` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `값은 ${max} 이하여야 합니다.` };
  }
  
  return { isValid: true, value: num };
}

/**
 * 이메일 유효성 검증
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: '이메일을 입력해주세요.' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '유효한 이메일 주소를 입력해주세요.' };
  }
  
  return { isValid: true };
}

/**
 * 파일 확장자 유효성 검증
 */
export function validateFileExtension(fileName: string, allowedExtensions: string[]): { isValid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { isValid: false, error: '파일명이 유효하지 않습니다.' };
  }
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return { isValid: false, error: `허용되는 파일 확장자: ${allowedExtensions.join(', ')}` };
  }
  
  return { isValid: true };
}

/**
 * 파일 크기 유효성 검증
 */
export function validateFileSize(fileSize: number, maxSizeInMB: number): { isValid: boolean; error?: string } {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  if (fileSize > maxSizeInBytes) {
    return { isValid: false, error: `파일 크기는 ${maxSizeInMB}MB 이하여야 합니다.` };
  }
  
  return { isValid: true };
}