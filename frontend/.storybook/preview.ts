import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#FAFFFF',
        },
        {
          name: 'dark',
          value: '#121212',
        },
      ],
    },
    viewport: {
      viewports: {
        // 모바일 기본
        mobile: {
          name: '📱 Mobile (375px)',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        // PC 환경 최적화 뷰포트
        smallDesktop: {
          name: '🖥️ 작은 데스크톱 (1024px)',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        hdDesktop: {
          name: '🖥️ HD 데스크톱 (1280px)',
          styles: {
            width: '1280px',
            height: '720px',
          },
        },
        laptop: {
          name: '💻 노트북 표준 (1366px)',
          styles: {
            width: '1366px',
            height: '768px',
          },
        },
        largeLaptop: {
          name: '💻 대형 노트북 (1536px)',
          styles: {
            width: '1536px',
            height: '864px',
          },
        },
        fullHD: {
          name: '🖥️ Full HD (1920px)',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
        qhd: {
          name: '🖥️ QHD (2560px)',
          styles: {
            width: '2560px',
            height: '1440px',
          },
        },
        ultrawide: {
          name: '🖥️ 울트라와이드 (3440px)',
          styles: {
            width: '3440px',
            height: '1440px',
          },
        },
        // 테스트용 중간 크기들
        tablet: {
          name: '📱 태블릿 (768px)',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        tabletLandscape: {
          name: '📱 태블릿 가로 (1024x768)',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
      },
      defaultViewport: 'fullHD', // 기본 뷰포트를 Full HD로 설정
    },
    docs: {
      story: {
        inline: true,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'circlehollow', title: 'Light' },
          { value: 'dark', icon: 'circle', title: 'Dark' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || context.parameters.theme || 'light';
      
      // Apply theme class to html element
      if (typeof document !== 'undefined') {
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        html.classList.add(theme);
      }

      return (
        <div className={`${theme} min-h-screen transition-colors duration-200`}>
          <div className="bg-background-base text-text-primary dark:bg-dark-background-base dark:text-dark-text-primary p-4">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;