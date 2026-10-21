import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'management', base: '/management/', plugins: [react()],
  build: { outDir: '../dist/management', emptyOutDir: true, sourcemap: false },
});
