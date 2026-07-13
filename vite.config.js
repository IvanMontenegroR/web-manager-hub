import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El repo se sirve en GitHub Pages bajo /web-manager-hub/.
// En dev usamos '/'. Se puede sobreescribir con VITE_BASE.
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === 'build' ? '/web-manager-hub/' : '/'),
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          exceljs: ['exceljs'],
        },
      },
    },
  },
}))
