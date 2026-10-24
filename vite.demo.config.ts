import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify('1') },
  build: { outDir: 'dist-demo', assetsInlineLimit: 100000000 },
})
