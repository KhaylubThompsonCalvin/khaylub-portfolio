import { resolve } from 'node:path';
import { defineConfig } from 'vite';
// The Climb: built from climb/ into dist-climb/, sharing src/ and public/ with the Summit.
// Deploy (mode "deploy", run first by `npm run build:deploy`): built into dist-deploy/ at the site root, with the
// shared public files; .env.deploy turns its hand-off links (%VITE_SUMMIT_URL%) into same-site /summit/ links.
export default defineConfig(({ mode }) => ({
  root: resolve(import.meta.dirname, 'climb'),
  publicDir: resolve(import.meta.dirname, 'public'),
  envDir: import.meta.dirname,
  // the page lives in climb/ but its scripts live in the shared src/: "../src/..." becomes "/src/..." in the browser
  resolve: { alias: [{ find: /^\/src\//, replacement: resolve(import.meta.dirname, 'src') + '/' }] },
  server: { port: 5174, strictPort: true, host: '127.0.0.1' },
  build: { outDir: resolve(import.meta.dirname, mode === 'deploy' ? 'dist-deploy' : 'dist-climb'), emptyOutDir: true },
}));
