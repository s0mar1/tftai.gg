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
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        wide: {
          name: 'Wide Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
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