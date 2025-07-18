// backend/src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TFT Meta Analyzer API',
      version: '1.0.0',
      description: 'TFT Meta Analyzer의 백엔드 API 명세서입니다.',
      contact: {
        name: 'Jiseo Kim',
        url: 'https://github.com/jiseokk',
        email: 'jiseo@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: '개발 서버',
      },
      {
        url: 'https://api.tftai.gg',
        description: '프로덕션 서버',
      }
    ],
  },
  // API 파일들이 있는 경로
  apis: ['./src/routes/*.ts', './src/routes/*.js'], 
};

const specs = swaggerJsdoc(options);

export default specs;
