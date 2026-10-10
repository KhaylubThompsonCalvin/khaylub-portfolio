import { resolve, relative } from 'node:path';
import { existsSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';

const here = import.meta.dirname;

// Where the Summit lives. One source of truth: VITE_SUMMIT_URL (.env for dev and the plain build, .env.deploy for the
// combined deploy). Its path is the Summit's base: "/" on its own host, "/summit/" inside the combined site.
// In code the base is import.meta.env.BASE_URL; in HTML it is %BASE_URL%. Shared static files (/models/, /fonts/,
// /og/, /thumbs/, /favicon.svg) always stay at the site root, so they never take the base.
const summitBase = (mode) => new URL(loadEnv(mode, here, 'VITE_').VITE_SUMMIT_URL || '/', 'http://local').pathname;

const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(resolve(dir, f)).isDirectory() ? files(resolve(dir, f)) : [resolve(dir, f)]));

// ship only the props that are actually placed (the rest of the collection stays private, dev only). The plain build
// ships the Summit stations' props; the deploy build ships the Summit's and every Climb stage's, from one shared copy.
const shipUsedPropsOnly = (deploy) => ({
  name: 'ship-used-props-only',
  apply: 'build',
  closeBundle() {
    const dir = resolve(here, deploy ? 'dist-deploy/models/props' : 'dist/models/props');
    if (!existsSync(dir)) return;
    const sources = [resolve(here, 'src/world/stations.js'), ...(deploy ? files(resolve(here, 'src/climb')).filter((f) => f.endsWith('.js')) : [])]
      .map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const f of files(dir)) {
      const stem = relative(dir, f).replace(/\\/g, '/').replace(/\.glb$/, '');
      const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // referenced as 'props/<stem>', 'models/props/<stem>.glb', or a quoted bare '<stem>' (a list of names, { file: '<stem>' })
      const used = deploy ? new RegExp(`(?:props/|['"\`])${esc}(?:\\.glb)?['"\`]`).test(sources) : sources.includes(`'props/${stem}'`);
      if (!used) rmSync(f);
    }
    for (const d of readdirSync(dir)) { const p = resolve(dir, d); if (statSync(p).isDirectory() && readdirSync(p).length === 0) rmdirSync(p); }
  },
});

// the combined site's /404.html: the Summit's 404 page with a way back to the Climb (/) as well as to the Summit
const rootNotFound = (base) => ({
  name: 'root-not-found',
  apply: 'build',
  closeBundle() {
    const page = readFileSync(resolve(here, 'dist-deploy', base.slice(1), '404.html'), 'utf8');
    const out = page
      .replace(/<p class="actions">[\s\S]*?<\/p>/, `<p class="actions"><a class="btn primary" href="/">Back to the climb</a><a class="btn" href="${base}">Go to the summit</a></p>`)
      .replace('The page you were looking for is not on this summit. The four ways in are above, or start again from the top.',
        'The page you were looking for is not here. The ways in are above, or start the climb again from the bottom.');
    if (!out.includes('Back to the climb') || !out.includes('not here.')) throw new Error('root-not-found: 404.html changed shape; update vite.config.js');
    writeFileSync(resolve(here, 'dist-deploy/404.html'), out);
  },
});

// dev-only pages (any folder not listed in the inputs below) are deliberately not build inputs: they exist only under `npm run dev`.
// Deploy (`npm run build:deploy`, mode "deploy"): the Climb is built first into dist-deploy/ with the shared public
// files, then the Summit into dist-deploy/summit/ without copying them a second time.
export default defineConfig(({ mode }) => {
  const deploy = mode === 'deploy';
  const base = summitBase(mode);
  return {
    base,
    plugins: [shipUsedPropsOnly(deploy), ...(deploy ? [rootNotFound(base)] : [])],
    // shared static files keep their root address in every build (the base applies to the Summit's own pages and code)
    experimental: { renderBuiltUrl: (filename, { type }) => (type === 'public' ? '/' + filename : undefined) },
    build: {
      ...(deploy ? { outDir: resolve(here, 'dist-deploy', base.slice(1)), emptyOutDir: true, copyPublicDir: false } : {}),
      rollupOptions: {
        input: {
          home: resolve(here, 'index.html'),
          films: resolve(here, 'films/index.html'),
          questions: resolve(here, 'questions/index.html'),
          builds: resolve(here, 'builds/index.html'),
          notFound: resolve(here, '404.html'),   // hosts serve /404.html for any missing address
        },
      },
    },
  };
});
