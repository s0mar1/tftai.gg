import baseConfig from '../jest.config.base.js';

export default {
  ...baseConfig,
  // Frontend-specific overrides
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy'
  },
  
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx}'
  ],
  
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!**/node_modules/**'
  ]
};