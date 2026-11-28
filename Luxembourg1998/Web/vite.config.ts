import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "single": alles in eine HTML-Datei (zum Teilen als Artifact). Standard: normale Dateien in dist/.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 8000,
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
  test: { include: ['tests/**/*.test.ts'] },
}));
