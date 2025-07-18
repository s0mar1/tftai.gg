import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// 커스텀 포맷 정의
const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  // 에러 스택 추가
  if (stack) {
    log += `\n${stack}`;
  }
  
  // 추가 메타데이터가 있으면 JSON으로 출력
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// 개발/운영 환경에 따른 로그 레벨 설정
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  // 개발 환경에서도 warn 레벨로 설정하여 불필요한 로그 줄이기
  return env === 'development' ? 'warn' : 'info';
};

// Morgan을 위한 stream 인터페이스 (winston.Logger와 분리)
interface StreamWriter {
  write: (message: string) => void;
}

const transports: winston.transport[] = [];

// 개발 환경에서는 콘솔에도 출력
if (process.env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      customFormat
    )
  }));
}

// 테스트 환경이 아닐 때만 파일 로그 사용
if (process.env.NODE_ENV !== 'test') {
  transports.push(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs/error.log'),
    level: 'error',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      json()
    )
  }));

  transports.push(new winston.transports.File({
    filename: path.join(process.cwd(), 'logs/combined.log'),
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      json()
    )
  }));
}

// Winston 로거 생성
const logger = winston.createLogger({
  level: getLogLevel(),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'tft-meta-analyzer' },
  transports,
});

// HTTP 요청 로깅을 위한 스트림 (별도 객체로 생성)
const loggerStream: StreamWriter = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// logger 객체에 stream 속성 추가
(logger as any).stream = loggerStream;

export default logger;