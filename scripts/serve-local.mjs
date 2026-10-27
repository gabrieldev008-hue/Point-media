import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
const webRoot = fileURLToPath(new URL('../apps/web', import.meta.url));
if (!existsSync(new URL('../apps/web/dist/index.html', import.meta.url)) ||
    !existsSync(new URL('../apps/api/dist/main.js', import.meta.url))) {
  throw new Error('Build API and web before starting the local preview.');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('This combined preview is for local use only.');
}
require('../apps/api/dist/main.js');
const server = await preview({
  configFile: false,
  root: webRoot,
  preview: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
console.log('Point Media local: http://localhost:5173');
process.once('SIGINT', () => server.httpServer.close());
process.once('SIGTERM', () => server.httpServer.close());
