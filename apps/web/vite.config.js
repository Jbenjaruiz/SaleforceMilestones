import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas: el sitio funciona en la raíz o en cualquier subruta del hosting.
  base: './',
  plugins: [react()],
  server: {
    // En desarrollo la API local responde bajo /api; así no hace falta configurar CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    // SheetJS aporta casi todo el peso del paquete y es necesario para leer el Excel.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
});
