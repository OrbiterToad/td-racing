// Local test server: deliberately mount the deployment at the Pages subpath.
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '../dist');
const prefix = '/td-racing/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    if (!pathname.startsWith(prefix)) throw new Error('Outside site');
    const file = path.resolve(
      root,
      pathname.slice(prefix.length) || 'index.html',
    );
    if (!file.startsWith(root + path.sep)) throw new Error('Outside site');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(Number(process.env.PLAYWRIGHT_PORT || 4173), '127.0.0.1');
