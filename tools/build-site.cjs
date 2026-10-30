const { cpSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const entry of ['index.html', 'main.js', 'assets', 'ASSETS.txt']) {
  cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}
writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Static site prepared in dist/');
