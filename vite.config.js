import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the Khaylub.com Wanderer experience.
// Static assets (GLB models, Higgsfield video plates) live in /public and are
// served from the site root, e.g. /assets/models/wanderer-web.glb
export default defineConfig({
  plugins: [react()],
  server: { host: true, open: true },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
