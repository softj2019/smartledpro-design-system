import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SmartLedProDesignSystem',
      formats: ['es', 'cjs'],
      fileName: (format) =>
          format === 'es' ? 'index.js' : 'index.cjs',
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom'],
      // ❌ input 절대 넣지 마라
    },
  },
});
