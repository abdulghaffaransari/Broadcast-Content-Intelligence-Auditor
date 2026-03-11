import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        },
        accent: {
          pass: '#22c55e',
          fail: '#ef4444',
          warn: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
