import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// THEME_INIT_SCRIPT prevents FOUC (Flash Of Unstyled Content) for dark mode
const THEME_INIT_SCRIPT = `(function() {
  try {
    const storedTheme = localStorage.getItem('ui-theme') || 'system';
    const validTheme = ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system';
    if (validTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.add(systemTheme, 'system');
    } else {
      document.documentElement.classList.add(validTheme);
    }
  } catch (e) {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.add(systemTheme, 'system');
  }
})();`

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    THEME_INIT_SCRIPT,
  },
  plugins: [
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    devtools(),
  ],
})

export default config
