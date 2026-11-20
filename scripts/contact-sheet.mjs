// Builds evidence-4.0.0/index.html: one self-contained page (images embedded) that puts each current plugin page
// (before/, real built pages under their own fakes) next to the 4.0.0 reference screen (after/, MOCK data).
//   node scripts/shots.mjs && node scripts/contact-sheet.mjs
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../evidence-4.0.0');
const all = JSON.parse(await readFile(resolve(dir, '../src/palette.json'), 'utf8')).dark;
const palette = { ...all, background: all.tealBackground, surface: all.tealSurface, raised: all.tealRaised, border: all.tealBorder, primary: all.teal };
const PAIRS = [
  ['Kobra Control', [
    ['Dashboard, printing · dark · 1900×1000', 'kobracontrol-dash-dark-en-1900x1000', 'kobra-dash-dark-en-1900x1000',
      'Violet is Kobra Control: the band, the page and panels tinted in it, and the print as a filled hero with the printer drawing (its four spools in their filament colours), 37 % at 56 px and a thick bar. Module headers are strips in the hue of their subject; heater readings are green at target with their last ten minutes drawn against the target; each slot opens with a sample of its filament. The warning table that opened the page is one line with one action.'],
    ['Dashboard, printing · light · 1280×720', 'kobracontrol-dash-light-en-1280x720', 'kobra-dash-light-en-1280x720',
      'Same page on a laptop tab, in light: a tinted page, white panels, tinted headers. Pause and Resume are tinted keys, Stop is solid red, and heaters show the reading large with the target under it instead of two stretched buttons.'],
    ['Printer not answering · dark · 1900×1000', 'kobracontrol-offline-dark-en-1900x1000', 'kobra-dash-offline-dark-en-1900x1000',
      'One state, said once, and it costs the page its colour: the hero turns grey with Last known · 4 min ago, heater readings lose their green, one banner says why and how old the data is, and every disabled control points at that banner. Before, the pill said Offline while Status still said Printing 37 %.'],
    ['Printer not answering · light · 1280×720', 'kobracontrol-unreachable-light-en-1280x720', 'kobra-dash-offline-light-en-1280x720',
      'The same rule in light. The last job stays visible but grey, with its age; nothing that looks live or successful is left on the page.'],
    ['No printer found yet · dark · 1900×1000', 'kobracontrol-main-unreachable-dark-en-1900x1000', 'kobra-dash-setup-dark-en-1900x1000',
      'Before there is a printer, the page is one card: the bar says Searching, the illustration shows what is being looked for, and the two ways forward are Open settings and Search again. (Added in round 3; the left image is the closest current state, an unreachable printer.)'],
    ['Settings · dark · 1900×1000', 'kobracontrol-settings-dark-en-1900x1000', 'kobra-settings-dark-en-1900x1000',
      'Seven stacked cards in the left half became a section index, two columns of sections and one save bar that names what changed. Each section says its own state (Answering, Found, ffmpeg not found) in its header.'],
    ['Settings · light · 1280×720', 'kobracontrol-settings-light-en-1280x720', 'kobra-settings-light-en-1280x720',
      'Labels share one column so controls line up; a hint is at most one short line; an invalid field explains itself in place.'],
    ['Dashboard · dark · 720 wide', 'kobracontrol-dash-dark-en-720x1000', 'kobra-dash-dark-en-720x1000',
      'Narrow: the tabs drop to their own line and the page becomes one column in the order job, heat, move, camera, filament, stock.'],
  ]],
  ['U1 Control', [
    ['Dashboard, printer busy · dark · 1900×1000', 'u1control-main-dash-dark-en-1900x1000', 'u1-dash-dark-en-1900x1000',
      'Cobalt is U1 Control. The busy reason was under every toolhead and again over the stock; it is now one banner. A toolhead is one object: a sample of its filament across the top with its T badge and state chip, the drawn spool, weight and level, its own heater (green at target, blue when off) and its actions. Emergency stop is solid red with a white ring on the band, on every tab.'],
    ['Dashboard · light · 1280×720', 'u1control-dash-light-en-1280x720', 'u1-dash-light-en-1280x720',
      'Toolheads go 4, 2 or 1 across, never 3 + 1. Stock that was read five minutes ago says so in its header instead of looking current.'],
    ['No printer chosen · dark · 1900×1000', 'u1control-notarget-dark-en-1900x1000', 'u1-dash-setup-dark-en-1900x1000',
      'First run is a designed state: the bar says No printer, and the page is one card with the plugin\'s illustration, one sentence and the way forward. (Added in round 3; no round-2 image.)'],
    ['Dashboard · dark · 720 wide', 'u1control-dash-dark-en-720x1000', 'u1-dash-dark-en-720x1000',
      'One column; each toolhead keeps every control it had.'],
  ]],
  ['Spooler', [
    ['Stock and spool detail · dark · 1900×1000', 'spooler-detail-dark-en-1900x1000', 'spooler-stock-dark-en-1900x1000',
      'Magenta is Spooler. Full-width cards with 1,750 px level bars became a dense list (material chip, location pin, solid state chip, level bar green, amber or red) with the selected spool beside it as the hero: a large spool on a white reel in the filament colour, what is left and how long it lasts in white on magenta, then one primary action and use per week as bars.'],
    ['Stock · light · 1280×720', 'spooler-spools-light-en-1280x720', 'spooler-stock-light-en-1280x720',
      'About three times as many spools per screen. Low and almost-empty are a state with a mark and a word, not a tinted caps pill.'],
    ['Stock · dark · 720 wide', 'spooler-spools-dark-en-720x1000', 'spooler-stock-dark-en-720x1000',
      'Narrow: the location column goes first, the detail moves under the list.'],
  ]],
  ['Print Calculator', [
    ['Quote · dark · 1900×1000', 'calculator-calc-ok-dark-en-1900x1000', 'calc-quote-dark-en-1900x1000',
      'Green is the Calculator, and the suggested price is its hero: white on a filled block, with profit, margin and break-even under it. Plates, costs, price read left to right; each cost section has its own coloured tile and amount; where the price goes is one coloured bar with its legend, profit included.'],
    ['Quote with missing information · dark · 1280×720', 'calculator-calc-missing-dark-en-1280x720', 'calc-quote-missing-dark-en-1280x720',
      'An incomplete price does not get the hero: its block is warning-tinted, the figure grey and underlined. Every gap says what is unknown, in the warning colour, where it occurs; the reason and the fix are in one banner, and saving is off with that banner as its explanation.'],
    ['Quote · light · 1280×720', 'calculator-calc-ok-light-en-1280x720', 'calc-quote-light-en-1280x720',
      'The product has a name in its bar; the project is no longer mistaken for a fifth tab.'],
  ]],
  ['Organizer', [
    ['Dock, ready · dark · 280×360 (real dock size)', 'organizer-idle-dark-en-280x360', 'organizer-dock-dark-en-280x360',
      'Both main actions now fit the dock without scrolling: Arrange is primary, Fill is second, the rest is behind Advanced. Three blocks of intro text became one line.'],
    ['Dock, job running · dark · 280×360', 'organizer-running-dark-en-280x360', 'organizer-dock-running-dark-en-280x360',
      'While a job runs the dock shows the job as a filled block: the count is the large figure, the phase is its state chip, the bar is thick, and Cancel is right under it and on screen.'],
    ['Dock, result · light · 280×360', 'organizer-done-light-en-280x360', 'organizer-dock-done-light-en-280x360',
      'What happened and what did not fit are two different colours and marks; opening the saved copy is the primary action.'],
    ['In a tab, job running · dark · 1280×720', 'organizer-running-dark-en-1280x720', 'organizer-dock-running-dark-en-1280x720',
      'In a tab the same parts sit side by side under the family bar instead of a 560 px column in an empty window.'],
  ]],
  ['Embedder', [
    ['Main page · dark · 1900×1000', 'embedder-main-dark-en-1900x1000', 'embedder-main-dark-en-1900x1000',
      'Place, see, apply: form, part and list are three columns and Apply is always on screen (it started below the fold). The part gets the height of the window. The brand mark and the kit\'s magnet colour are used. The drawing stands in for the real 3D view.'],
    ['Main page · light · 1280×720', 'embedder-main-light-en-1280x720', 'embedder-main-light-en-1280x720',
      'The pocket being placed is a preview block inside the form; the list on the right is only what will be applied, with what to have ready and where the print pauses.'],
  ]],
];
const EXTRA = [
  ['Colour system · dark', 'kit-colour-dark-en-1600x1000', 'Six plugins, six accents: each has its own band and its own four tinted surface levels. Below: the seven hues with tint, hover and on-colour, state colours, the hue of each domain, material and toolhead colours.'],
  ['Colour system · light', 'kit-colour-light-en-1600x1000', 'The same roles in light: tinted page, white panels, tinted headers. scripts/check.mjs measures 475 pairs per theme.'],
  ['Icon set · dark', 'kit-icons-dark-en-1600x1000', '97 icons on one grid: 86 from Lucide (ISC) and 11 drawn for the family (spool, nozzle, toolhead, bed, ACE, slot, insert, plate, arrange, printer, Spoolman). Mono, toned, or in a tinted tile.'],
  ['Icon set · light', 'kit-icons-light-en-1600x1000', ''],
  ['Illustrations and marks · dark', 'kit-art-dark-en-1600x1000', 'Six generated empty-state illustrations (one per plugin, 43.6 kB for all six, each plugin ships one) and the identity marks at three sizes. The Organizer and Spooler marks were generated and redrawn as vector.'],
  ['Illustrations and marks · light', 'kit-art-light-en-1600x1000', ''],
  ['Parts and states · dark', 'kit-dark-en-1900x1000', 'Type scale, action hierarchy (solid primary, tinted secondary, solid red destructive), every state as a solid chip, the drawn objects, sparklines and empty states.'],
  ['System font, for comparison · Kobra Control', 'kobra-dash-dark-en-1900x1000-systemfont', 'The same page in the system font, which is also the fallback. Every other round-3 screen uses the embedded Manrope subset (21,476 B; about 28.7 kB in the page; needs font-src data: in the page policy).'],
  ['System font, for comparison · Calculator', 'calc-quote-light-en-1280x720-systemfont', ''],
  ['200 % zoom · kit', 'kit-dark-en-1280x720-zoom200', 'Same viewport at twice the scale: nothing clips or overlaps.'],
  ['pt-BR · U1 Control', 'u1-dash-dark-pt-BR-1280x720', 'Long Portuguese labels wrap or fit; none is cut.'],
  ['pt-BR · Calculator, missing information', 'calc-quote-missing-dark-pt-BR-1280x720', ''],
  ['pt-BR · Organizer dock, running', 'organizer-dock-running-dark-pt-BR-280x360', ''],
];
const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const img = async (sub, name) => `data:image/png;base64,${(await readFile(resolve(dir, sub, name + '.png'))).toString('base64')}`;
let body = ''; let count = 0;
for (const [plugin, pairs] of PAIRS) {
  body += `<section><h2>${esc(plugin)}</h2>`;
  for (const [title, before, after, why] of pairs) {
    count++;
    body += `<article><h3>${esc(title)}</h3><p>${esc(why)}</p><div class="pair">`
      + `<figure><img alt="Before: ${esc(title)}" src="${await img('before', 'before-' + before)}"><figcaption><b>Before</b> real built page, plugin fakes · <a href="before/before-${before}.png">before-${before}.png</a></figcaption></figure>`
      + (existsSync(resolve(dir, 'round2', 'MOCK-' + after + '.png')) ? `<figure><img alt="Round 2: ${esc(title)}" src="${await img('round2', 'MOCK-' + after)}"><figcaption><b>Round 2</b> neutral surfaces, colour in details · <a href="round2/MOCK-${after}.png">round2/MOCK-${after}.png</a></figcaption></figure>` : '')
      + `<figure><img alt="Round 3: ${esc(title)}" src="${await img('after', 'MOCK-' + after)}"><figcaption><b>Round 3</b> colour as structure, MOCK data · <a href="after/MOCK-${after}.png">after/MOCK-${after}.png</a></figcaption></figure>`
      + '</div></article>';
  }
  body += '</section>';
}
body += '<section><h2>Colour system, icon set, zoom and pt-BR</h2><div class="extras">';
for (const [title, name, why] of EXTRA) body += `<figure><img alt="${esc(title)}" src="${await img('after', 'MOCK-' + name)}"><figcaption><b>${esc(title)}</b> ${esc(why)} <a href="after/MOCK-${name}.png">MOCK-${name}.png</a></figcaption></figure>`;
body += '</div></section>';
const p = palette;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orca UI foundation 4.0.0 — before and after</title><style>
:root{color-scheme:dark}body{margin:0;padding:32px clamp(16px,3vw,48px) 64px;background:${p.background};color:${p.text};font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}
header{max-width:1100px;margin-bottom:40px}h1{font-size:28px;line-height:1.2;letter-spacing:-.015em;margin:0 0 12px}h2{font-size:20px;margin:48px 0 4px;padding-top:24px;border-top:1px solid ${p.border}}
h3{font-size:14px;margin:28px 0 4px}p{margin:0 0 12px;max-width:110ch;color:${p.muted}}header p{font-size:15px}a{color:${p.primary}}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px;align-items:start}.extras{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:16px;align-items:start;margin-top:16px}
figure{margin:0;padding:8px;border-radius:8px;background:${p.surface};box-shadow:inset 0 0 0 1px ${p.border}}img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:4px}
figcaption{padding:8px 4px 2px;font-size:12px;color:${p.muted}}figcaption b{display:inline-block;margin-right:6px;padding:1px 6px;border-radius:4px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:${p.text};background:${p.raised}}
figure:last-child figcaption b{color:${p.onTeal};background:${p.teal}}.extras figcaption b{color:${p.text};background:${p.raised}}
</style></head><body><header><h1>Orca UI foundation 4.0.0 — before and after</h1>
<p>${count} sets of three. Left: the plugin's current built page, rendered with its own page-test fakes. Middle: round 2 (new layout and components, neutral surfaces). Right: round 3, where colour is structural: a branded band and tinted surfaces in each plugin's accent, module headers in the hue of their subject, one strongly coloured hero block per page, filament colour shown at size, solid state chips, and Manrope embedded.</p>
<p>Middle and right are MOCK data in the foundation gallery, not migrated plugins; migration is phase 2. Before captures are in <a href="before/">before/</a>, round 2 in <a href="round2/">round2/</a>, round 3 in <a href="after/">after/</a>.</p></header>${body}</body></html>`;
await writeFile(resolve(dir, 'index.html'), html);
console.log(`evidence-4.0.0/index.html: ${count} pairs, ${EXTRA.length} extras, ${(html.length / 1048576).toFixed(1)} MB`);
