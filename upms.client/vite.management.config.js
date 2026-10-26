import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'management', base: '/management/', plugins: [react(),{
    name:'local-simple-v1',apply:'serve',
    transformIndexHtml:html=>html.replace('<html','<html data-upms-mode="simple-v1"'),
  }],
  server: {host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:3000'}}},
  build: { outDir: '../dist/management', emptyOutDir: true, sourcemap: false },
});
