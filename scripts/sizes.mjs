// Built size of each shared component: one library build per component (minified, the plugins' build target), with Vue
// and PrimeVue left out, since a page pays for those once. A component's figure includes what it imports from this
// package (OuiIcon, its icons, the components it wraps), so the figures overlap and do not add up to a page.
//   node scripts/sizes.mjs [root]      root: another copy of the foundation to measure (default: this one)
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import { gzipSync } from 'node:zlib';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const entries = [['(core) index.ts + base.css + preset', 'src/index.ts'], ['useFileBackend', 'src/components/fileBackend.ts'], ...readdirSync(resolve(root, 'src/components')).filter(n => n.endsWith('.vue')).sort().map(n => [n.replace('.vue', ''), 'src/components/' + n])];
const rows = [];
for (const [name, entry] of entries) {
  const result = await build({ configFile: false, root, logLevel: 'silent', plugins: [vue()], define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false },
    build: { write: false, target: 'safari14', minify: true, cssCodeSplit: false, assetsInlineLimit: 1e9, lib: { entry: resolve(root, entry), formats: ['es'], fileName: 'x' },
      rollupOptions: { external: [/^vue($|\/)/, /^primevue($|\/)/, /^@primeuix\//] } } });
  const files = (Array.isArray(result) ? result : [result]).flatMap(r => r.output).map(o => Buffer.from(o.type === 'chunk' ? o.code : o.source));
  const all = Buffer.concat(files);
  rows.push([name, all.length, gzipSync(all, { level: 9 }).length]);
}
const kb = n => (n / 1024).toFixed(1).padStart(7);
console.log('component'.padEnd(40) + '  raw kB  gzip kB');
for (const [name, raw, gz] of rows) console.log(name.padEnd(40) + kb(raw) + '  ' + kb(gz));
