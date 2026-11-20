// Generates src/icons.ts: one tree-shakable export per icon, so a page bundles only the icons it imports.
// Stock icons are copied from lucide-static (ISC, licenses/Lucide.txt) at build time; consumers need no icon package.
// Domain icons the set lacks are drawn here on the same 24 px grid with the same 2 px round stroke.
//   node scripts/icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Each icon file is an <svg> wrapper around a few shape elements; keep the shapes as [tag, attributes] nodes.
async function lucide(source) {
  const svg = await readFile(resolve(root, 'node_modules/lucide-static/icons', source + '.svg'), 'utf8');
  const inner = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
  const shapes = [...inner.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*?)\/>/g)];
  if (!shapes.length || inner.replace(/<(path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*?\/>/g, '').trim()) throw new Error(`Unexpected markup in lucide icon "${source}"`);
  return shapes.map(([, tag, attrs]) => [tag, Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))]);
}
const version = JSON.parse(await readFile(resolve(root, 'node_modules/lucide-static/package.json'), 'utf8')).version;

// export name: lucide name
const LUCIDE = {
  check: 'check', x: 'x', plus: 'plus', minus: 'minus', warning: 'triangle-alert', error: 'circle-x', info: 'info', circleCheck: 'circle-check',
  clock: 'clock', history: 'history', timer: 'timer', hourglass: 'hourglass', calendar: 'calendar', offline: 'wifi-off', plug: 'plug', zap: 'zap',
  chevronDown: 'chevron-down', chevronRight: 'chevron-right', refresh: 'refresh-cw', rotate: 'rotate-cw', search: 'search', filter: 'funnel',
  settings: 'sliders-horizontal', wrench: 'wrench', dashboard: 'layout-dashboard', files: 'files', file: 'file-text', folder: 'folder', folderPlus: 'folder-plus',
  terminal: 'square-terminal', chart: 'chart-column', link: 'link', unlink: 'unlink', external: 'external-link', copy: 'copy', save: 'save',
  download: 'download', upload: 'upload', edit: 'pencil', trash: 'trash-2', archive: 'archive', undo: 'undo-2', more: 'ellipsis',
  pause: 'pause', play: 'play', stop: 'square', power: 'power', camera: 'camera', cameraOff: 'camera-off', video: 'video', eye: 'eye',
  thermometer: 'thermometer', flame: 'flame', fan: 'fan', wind: 'wind', light: 'lightbulb', speed: 'gauge', move: 'move', home: 'house',
  target: 'crosshair', ruler: 'ruler', tag: 'tag', rfid: 'nfc', drop: 'droplet', layers: 'layers', box: 'box', parcel: 'package',
  boxes: 'boxes', warehouse: 'warehouse', mapPin: 'map-pin', fill: 'grid-3x3', magnet: 'magnet', lock: 'lock', shieldCheck: 'shield-check',
  scale: 'scale', receipt: 'receipt', calculator: 'calculator', coins: 'coins', wallet: 'wallet', percent: 'percent', store: 'store',
  truck: 'truck', user: 'user', note: 'sticky-note', clipboard: 'clipboard-list', languages: 'languages', hand: 'hand',
};
// Drawn for the family: [tag, attributes][] in Lucide's node format.
const p = d => ['path', { d }];
const DOMAIN = {
  spool: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 12, r: 3 }], p('M12 3v3M4.2 16.5l2.6-1.5M19.8 16.5l-2.6-1.5')],
  spoolman: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 4 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1 }]],
  nozzle: [p('M8 3h8v5H8zM6 8h12v4H6zM9 12l3 5 3-5M12 20.5v.5')],
  toolhead: [['rect', { x: 5, y: 3, width: 14, height: 11, rx: 2 }], p('M9 7h6M9 14v2l3 4 3-4v-2')],
  bed: [p('M3 19h18M5 19v-3h14v3M8 12c0-1.5 1.5-1.5 1.5-3S8 7.5 8 6M12 12c0-1.5 1.5-1.5 1.5-3S12 7.5 12 6M16 12c0-1.5 1.5-1.5 1.5-3S16 7.5 16 6')],
  ace: [['rect', { x: 3, y: 7, width: 18, height: 12, rx: 2 }], ['circle', { cx: 7.5, cy: 13, r: 1.5 }], ['circle', { cx: 12, cy: 13, r: 1.5 }],
    ['circle', { cx: 16.5, cy: 13, r: 1.5 }], p('M7.5 7V4.5M12 7V4.5M16.5 7V4.5')],
  slot: [['rect', { x: 5, y: 5, width: 14, height: 15, rx: 2 }], ['circle', { cx: 12, cy: 12.5, r: 3 }], p('M12 5V2.5')],
  insert: [['ellipse', { cx: 12, cy: 8, rx: 7, ry: 3 }], p('M5 8v7c0 1.7 3.1 3 7 3s7-1.3 7-3V8')],
  plate: [p('M12 5l9 4.5-9 4.5-9-4.5L12 5zM3 9.5v4l9 4.5 9-4.5v-4')],
  arrange: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }], p('M3 12h9v9M12 3v9h9')],
  printer: [['rect', { x: 4, y: 3, width: 16, height: 18, rx: 2 }], p('M4 7.5h16M12 7.5V11M10 11h4l-2 3-2-3zM8 17.5h8')],
};
const entries = [...await Promise.all(Object.entries(LUCIDE).map(async ([name, source]) => [name, await lucide(source)])),
  ...Object.entries(DOMAIN)].sort(([a], [b]) => a.localeCompare(b));
const dupe = entries.map(([n]) => n).find((n, i, all) => all.indexOf(n) !== i);
if (dupe) throw new Error(`Duplicate icon name "${dupe}"`);
const body = entries.map(([name, node]) => `export const ${name}: OuiIconData = ${JSON.stringify(node)};`).join('\n');
await writeFile(resolve(root, 'src/icons.ts'), `// GENERATED by scripts/icons.mjs — do not edit. ${Object.keys(LUCIDE).length} icons from lucide-static ${version} (ISC, licenses/Lucide.txt)
// and ${Object.keys(DOMAIN).length} domain icons drawn for this family on the same grid. Import by name: unused icons are not bundled.
export type OuiIconData = [tag: string, attributes: Record<string, string | number>][];
${body}
`);
console.log(`src/icons.ts: ${entries.length} icons (${Object.keys(LUCIDE).length} Lucide ${version}, ${Object.keys(DOMAIN).length} domain)`);
