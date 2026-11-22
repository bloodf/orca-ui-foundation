import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'licenses'), { recursive: true });
for (const [name, path] of Object.entries({ PrimeVue: 'primevue/LICENSE.md', PrimeUIX: '@primeuix/themes/LICENSE.md', Vue: 'vue/LICENSE', Lucide: 'lucide-static/LICENSE' })) {
  await copyFile(resolve(root, 'node_modules', path), resolve(root, 'licenses', name + '.txt'));
}
const components = (await readdir(resolve(root, 'src/components'))).filter(name => /\.(vue|ts)$/.test(name)).sort().map(name => 'src/components/' + name);
const spoolArt = (await readdir(resolve(root, 'src/assets/spool'))).filter(name => name.endsWith('.webp')).sort().map(name => 'src/assets/spool/' + name);
const files = ['src/index.ts', 'src/license.ts', 'src/theme.ts', 'src/palette.json', 'src/base.css', 'src/fonts/Manrope.woff2', 'src/icons.ts', ...components, ...spoolArt, 'python/filmatch.py',
  'package.json', 'package-lock.json', 'scripts/check.mjs', 'scripts/vue-tsc.mjs',
  'README.md', 'DESIGN.md', 'MIGRATION-5.0.md', 'licenses/PrimeVue.txt', 'licenses/PrimeUIX.txt', 'licenses/Vue.txt', 'licenses/Lucide.txt', 'licenses/Manrope.txt'];
const hashes = {};
const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const file of files) hashes[file] = createHash('sha256').update(await readFile(resolve(root, file))).digest('hex');
await writeFile(resolve(root, 'manifest.json'), JSON.stringify({
  version: packageInfo.version, dependencies: packageInfo.peerDependencies, files: hashes,
}, null, 2) + '\n');
console.log(`Manifest: ${files.length} shared source files. Consumers compile these sources into their own offline Vue applications.`);
