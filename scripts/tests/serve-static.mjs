// A tiny static server that behaves like the static host (Render): /dir/ serves dir/index.html, /dir redirects to
// /dir/, and a missing address answers 404 with the site's /404.html. No fallback to index.html, so a broken link
// shows up as a 404 instead of being hidden. Usage: node scripts/tests/serve-static.mjs <dir> [port]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8' };

export function serveStatic(dir, port) {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    let path; try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
    let file = resolve(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
      file = join(file, 'index.html');
    }
    const found = existsSync(file) && statSync(file).isFile();
    const send = found ? file : join(root, '404.html');
    res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[extname(send)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD' || !existsSync(send)) { res.end(); return; }
    createReadStream(send).pipe(res);
  });
  return new Promise((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', () => ok(server)); });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [dir = 'dist-deploy', port = '5190'] = process.argv.slice(2);
  await serveStatic(dir, Number(port));
  console.log(`serving ${dir} at http://127.0.0.1:${port}/`);
}
