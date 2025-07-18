import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react({
        // 프로덕션 빌드에서 개발 도구 제거
        babel: {
          plugins: isProd ? [
            ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
            ['babel-plugin-transform-remove-debugger']
          ] : []
        }
      }),
      
      // Bundle analyzer - 빌드 후 stats.html 생성
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
        sourcemap: !isProd, // 프로덕션에서는 소스맵 제거
        projectRoot: process.cwd(),
      })
    ],
    
    // 모듈 해석 최적화
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@utils': resolve(__dirname, './src/utils'),
        '@types': resolve(__dirname, './src/types'),
        '@context': resolve(__dirname, './src/context'),
        '@assets': resolve(__dirname, './src/assets'),
      }
    },
    
    // 최적화 설정
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'i18next',
        'react-i18next',
        'classnames'
      ],
      exclude: [
        // 개발 시에만 필요한 도구들
        '@tanstack/react-query-devtools'
      ]
    },
  server: {
    port: 5173,
    host: 'localhost',
    hmr: {
      port: 5173,
      host: 'localhost',
      clientPort: 5173
    },
    proxy: {
      // '/api'로 시작하는 모든 요청을 아래의 target 주소로 전달합니다.
      '/api': {
        target: 'http://localhost:4001', // 백엔드 서버 주소
        changeOrigin: true, // CORS 에러 방지를 위해 필요합니다.
      },
    },
  },
  build: {
    // 출력 디렉토리 설정
    outDir: 'dist',
    emptyOutDir: true,
    
    // 트리 셰이킹 최적화
    target: 'es2020',
    
    // 압축 설정
    minify: isProd ? 'terser' : false,
    
    // 소스맵 설정
    sourcemap: !isProd,
    
    // 청크 크기 경고 임계값
    chunkSizeWarningLimit: 500,
    
    // CSS 코드 분할 활성화
    cssCodeSplit: true,
    
    // 빌드 최적화 옵션
    reportCompressedSize: false, // 빌드 성능 향상
    
    rollupOptions: {
      // 외부 종속성 (CDN 사용 시)
      external: isProd ? [] : [],
      
      output: {
        // 파일 이름 형식 최적화
        entryFileNames: isProd ? '[name]-[hash].js' : '[name].js',
        chunkFileNames: isProd ? '[name]-[hash].js' : '[name].js',
        assetFileNames: isProd ? 'assets/[name]-[hash].[ext]' : 'assets/[name].[ext]',
        
        // 세밀한 코드 분할 전략
        manualChunks: (id) => {
          // 🚀 벤더 라이브러리 분리 (최적화된 분할)
          if (id.includes('node_modules')) {
            // React 코어 라이브러리 (항상 필요하므로 함께 번들)
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            
            // React Router (라우팅 관련)
            if (id.includes('react-router')) {
              return 'router';
            }
            
            // 드래그 앤 드롭 라이브러리 (DeckBuilder에서만 사용)
            if (id.includes('react-dnd')) {
              return 'dnd';
            }
            
            // 국제화 라이브러리 (모든 페이지에서 사용)
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }
            
            // React Query (데이터 패칭)
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            
            // HTTP 클라이언트
            if (id.includes('axios')) {
              return 'http';
            }
            
            // Chart 라이브러리 (통계 페이지에서 사용)
            if (id.includes('chart') || id.includes('d3')) {
              return 'charts';
            }
            
            // AI 관련 라이브러리 (AI 페이지에서 사용)
            if (id.includes('openai') || id.includes('ai')) {
              return 'ai-libs';
            }
            
            // 기타 유틸리티 라이브러리
            if (id.includes('classnames') || id.includes('clsx') || id.includes('lodash')) {
              return 'utils';
            }
            
            // 나머지 node_modules
            return 'vendor';
          }
          
          // 🚀 페이지별 코드 분할 (지연 로딩 최적화)
          if (id.includes('/pages/')) {
            if (id.includes('summoner') || id.includes('SummonerPage')) return 'page-summoner';
            if (id.includes('tierlist') || id.includes('TierListPage')) return 'page-tierlist';
            if (id.includes('ranking') || id.includes('RankingPage')) return 'page-ranking';
            if (id.includes('stats') || id.includes('StatsPage')) return 'page-stats';
            if (id.includes('Guide') || id.includes('guide')) return 'page-guides';
            if (id.includes('DeckBuilder') || id.includes('deckbuilder')) return 'page-deckbuilder';
            if (id.includes('AiQna') || id.includes('ai')) return 'page-ai';
            if (id.includes('AboutPage')) return 'page-about';
            return 'pages-common';
          }
          
          // 🚀 컴포넌트별 분할 (최적화된 분할)
          if (id.includes('/components/')) {
            // 스마트 로딩 컴포넌트들 별도 분리
            if (id.includes('ConditionalLoader') || id.includes('SmartLink') || id.includes('LazyComponentLoader')) {
              return 'smart-loading';
            }
            // 공통 컴포넌트 (자주 사용)
            if (id.includes('common')) return 'common-components';
            // 레이아웃 컴포넌트
            if (id.includes('layout')) return 'layout-components';
            // 라우팅 컴포넌트
            if (id.includes('routing')) return 'routing-components';
            // 애플리케이션 컴포넌트
            if (id.includes('app')) return 'app-components';
            return 'components';
          }
          
          // Context 및 Hook 분할
          if (id.includes('/context/') || id.includes('/hooks/')) {
            return 'context-hooks';
          }
          
          // Utils 및 Types 분할
          if (id.includes('/utils/') || id.includes('/types/')) {
            return 'utils-types';
          }
        },
      },
      
      // 압축 설정 (terser 사용 시)
      ...(isProd && {
        plugins: [
          // 프로덕션 빌드에서 압축 최적화
          require('rollup-plugin-terser')?.terser({
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log']
            },
            format: {
              comments: false
            }
          })
        ]
      })
    },
  },
    // 프로덕션 빌드 최적화
    define: {
      __DEV__: JSON.stringify(!isProd),
      'process.env.NODE_ENV': JSON.stringify(mode),
      // 글로벌 변수 최적화
      global: 'globalThis',
    },
    
    // 성능 최적화 설정
    esbuild: {
      target: 'es2020',
      // 프로덕션에서 console.log 제거
      drop: isProd ? ['console', 'debugger'] : [],
      // 트리 셰이킹 최적화
      treeShaking: true,
      // 최적화 수준
      minifyWhitespace: isProd,
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
    },
    
    // 실험적 기능 (성능 향상)
    experimental: {
      // 빌드 캐시 활성화
      buildCache: true,
      // 모듈 프리로딩 최적화
      renderBuiltUrl: (filename) => {
        // CDN 또는 정적 자원 서버 사용 시 커스터마이징
        return `/${filename}`;
      },
    },
    
    // 워커 설정 (다중 스레드 활용)
    worker: {
      format: 'es',
      plugins: [
        react()
      ]
    },
  };
});