import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Determine public base path:
  // 1. Explicit BASE_PATH environment variable (if passed by workflow)
  // 2. In GitHub Actions, GITHUB_REPOSITORY is automatically provided as "owner/repo-name"
  // 3. In AI Studio dev/preview environment (APP_URL or APPLET_ID present), use '/'
  // 4. Default to repository path for GitHub Pages production deployment
  const base =
    process.env.BASE_PATH ||
    (process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
      : process.env.APPLET_ID || process.env.APP_URL
      ? '/'
      : '/tender-document-package-builder/');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || __dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
