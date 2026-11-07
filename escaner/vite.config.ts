import { defineConfig } from 'vite';

export default defineConfig({
  build: { outDir: 'dist', assetsDir: 'assets', target: 'es2020' },
});
