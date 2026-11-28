// MOCK evidence: the built gallery (dist/index.html, under the plugins' strictest test CSP) in owned headless Chrome.
// Screenshots of every reference screen, with overflow, console-error and CSP-violation checks.
//   node scripts/shots.mjs [filter]      filter: substring of the screenshot name (e.g. kobra-dash, dark, 1900)
import { spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.OUT ? resolve(process.env.OUT) : resolve(root, 'evidence-5.0.7/after');
const filter = process.argv[2] ?? '';
const WIDE = [1900, 1000]; const TAB = [1280, 720]; const NARROW = [720, 1000];
const both = (screen, state, sizes, langs = ['en']) => ['dark', 'light'].flatMap(theme => sizes.flatMap(size => langs.map(lang => [screen, state, theme, lang, ...size])));
// 5.0: every reference screen. A trailing 'full' captures the whole page, not only the window.
export const SCENES = [
  ...both('tokens', '', [[1600, 1000]]),
  ...both('u1-dash', '', [WIDE, TAB]), ['u1-dash', '', 'dark', 'en', ...TAB, 'full'], ['u1-dash', '', 'light', 'en', ...NARROW, 'full'], ['u1-dash', '', 'dark', 'pt-BR', ...TAB, 'full'],
  ...both('u1-dash', 'loading', [WIDE]), ...both('u1-dash', 'refused', [TAB]), ['u1-dash', 'setup', 'dark', 'en', ...TAB], ['u1-dash', 'setup', 'light', 'en', ...TAB],
  ...both('kobra-dash', '', [WIDE, TAB]), ['kobra-dash', '', 'dark', 'en', ...TAB, 'full'], ['kobra-dash', '', 'dark', 'en', ...NARROW, 'full'], ['kobra-dash', '', 'light', 'pt-BR', ...WIDE],
  ...both('kobra-dash', 'offline', [WIDE]), ['kobra-dash', 'offline', 'dark', 'en', ...TAB],
  ...both('u1-stock', '', [WIDE, TAB]), ...both('kobra-stock', '', [WIDE]), ['u1-stock', '', 'dark', 'en', ...NARROW], ['u1-stock', '', 'dark', 'pt-BR', ...TAB],
  // u1-files: a storage with folders (tree, move, drag). kobra-files: one with none (no tree, no move).
  ...both('u1-files', '', [WIDE, TAB]), ...both('u1-files', 'multi', [WIDE]), ['u1-files', 'multi', 'light', 'en', ...TAB], ['u1-files', 'loading', 'dark', 'en', ...TAB], ['u1-files', 'empty', 'light', 'en', ...TAB],
  // 5.0.3: a window so short that the detail is taller than the browser: the picture keeps its place over the name.
  ...both('u1-files', '', [[1280, 440]]), ['kobra-files', '', 'dark', 'en', 1280, 440],
  // 5.0.7: stacked layouts in a short window: the detail goes under the table and leaves it room.
  ['u1-files', '', 'dark', 'en', 600, 720], ['u1-files', '', 'light', 'en', 900, 560], ['kobra-files', '', 'dark', 'en', 420, 560], ['kobra-files', '', 'light', 'pt-BR', 420, 900],
  ...both('u1-files', 'error', [TAB]), ['u1-files', 'slow', 'dark', 'en', ...TAB], ['u1-files', 'multi', 'dark', 'en', ...NARROW], ['u1-files', 'multi', 'dark', 'pt-BR', ...TAB],
  ...both('kobra-files', '', [WIDE, TAB]), ...both('kobra-files', 'multi', [WIDE]), ['kobra-files', 'multi', 'dark', 'en', ...NARROW], ['kobra-files', 'multi', 'light', 'pt-BR', ...TAB],
  ['kobra-files', 'empty', 'dark', 'en', ...TAB], ['kobra-files', 'error', 'light', 'en', ...TAB],
  ...both('spooler-spools', '', [WIDE, TAB]), ['spooler-spools', '', 'dark', 'en', ...NARROW, 'full'],
  ...both('kobra-settings', '', [WIDE, TAB]), ['kobra-settings', '', 'dark', 'en', ...NARROW], ['kobra-settings', '', 'dark', 'pt-BR', ...TAB],
  ...['dark', 'light'].flatMap(theme => [['kobra-settings', '', theme, 'en', 1280, 1000, 'resize']]), ['kobra-settings', '', 'dark', 'en', 380, 700], ['kobra-settings', '', 'light', 'pt-BR', 380, 700],
  ...both('calc-quote', '', [WIDE, TAB]), ...both('calc-quote', 'missing', [WIDE, TAB]), ['calc-quote', '', 'dark', 'en', ...NARROW], ['calc-quote', 'missing', 'dark', 'pt-BR', ...TAB],
  ...both('organizer-dock', '', [[280, 360], TAB]), ...both('organizer-dock', 'running', [[280, 360], TAB]), ...both('organizer-dock', 'done', [[280, 360]]),
  ['organizer-dock', 'running', 'dark', 'pt-BR', 280, 360], ['organizer-dock', '', 'dark', 'pt-BR', 280, 360], ['organizer-dock', 'running', 'dark', 'en', ...WIDE],
  ...['dark', 'light'].flatMap(theme => [['organizer-dock', '', theme, 'en', 1280, 1400, 'fill']]), ['calc-quote', '', 'light', 'en', 1280, 1400, 'fill'],
  // The "Pockets to add" panel has its (i) at the right edge of the page at 1280 and at 480: see the hint check below.
  ...both('embedder-main', '', [WIDE, TAB]), ['embedder-main', '', 'dark', 'en', ...NARROW], ['embedder-main', '', 'dark', 'pt-BR', ...TAB], ...both('embedder-main', '', [[480, 800]]),
  // 5.0.4: crowded module headers wrap inside their panel in a 380 px dock (and stay on one line where there is room).
  ...both('kit', 'heads', [[380, 700], TAB]), ['kit', 'heads', 'dark', 'pt-BR', 380, 700], ['kit', 'heads', 'dark', 'en', 280, 600],
  ...both('kit', '', [TAB]), ['kit', '', 'dark', 'en', ...WIDE], ...both('kit', 'colour', [[1600, 1000]]), ...both('kit', 'icons', [[1600, 1000]]), ...both('kit', 'art', [[1600, 1000]]), ['kit', '', 'dark', 'en', 1280, 720, 2],
  ['kobra-dash', '', 'dark', 'en', ...WIDE, 'system'], ['calc-quote', '', 'light', 'en', ...TAB, 'system'],
  // 5.13: the colour-first spool picker, and the dialog of one colour's spools.
  ...both('spool-pick', '', [TAB]), ...both('spool-pick', 'dialog', [TAB]), ['spool-pick', '', 'dark', 'pt-BR', 380, 700], ['spool-pick', 'dialog', 'light', 'pt-BR', 380, 700],
  ...['dark', 'light'].flatMap(theme => [['notices', '', theme, 'en', 1280, 720, 'toasts'], ['notices', '', theme, 'pt-BR', 380, 700, 'toasts']]),
  // 5.14: the dashboard packs each column on its own (a tall card does not stretch its neighbours); edit mode, a widget's
  // settings on the widget, the layout controls in the page header, and the one column of a narrow window in narrowOrder.
  ...both('kobra-layout', '', [WIDE, [1400, 1000]]), ['kobra-layout', '', 'dark', 'en', 1400, 1000, 'full'], ['kobra-layout', '', 'dark', 'pt-BR', ...NARROW, 'full'],
  ...both('kobra-layout', 'edit', [[1400, 1000]]), ...both('kobra-layout', 'settings', [[1400, 1000]]), ['kobra-layout', 'header', 'dark', 'en', 1400, 1000], ['kobra-layout', 'lost', 'dark', 'en', 1400, 1000],
  // 5.14: settings with nothing to save, as one stacked page, and under a banner that leaves; the picker past its named swatches.
  ...both('kobra-settings', 'clean', [TAB]), ...both('kobra-settings', 'stack', [WIDE, TAB]), ['kobra-settings', 'stack', 'dark', 'en', 380, 700], ['kobra-settings', 'banner', 'dark', 'en', ...TAB],
  ['spool-pick', 'many', 'dark', 'en', ...TAB],
  // 5.14: the whole kit sheet, for the parts under the fold (preset match, saved copy, rows, the plain table, empty slots).
  ...['dark', 'light'].map(theme => ['kit', '', theme, 'en', 1400, 1000, 'full']),
  // 5.14: the app bar never cuts a tab: between the widths where everything fits and where nothing does.
  ...[1100, 1000, 900, 761, 400].map(w => ['u1-dash', '', 'dark', 'en', w, 720]), ['calc-quote', '', 'light', 'en', 900, 720], ['calc-quote', '', 'dark', 'pt-BR', 1000, 720],
];
// A trailing 'system' renders without the optional brand face, for comparison.
export const sceneName = ([screen, state, theme, lang, w, h, zoom]) => `MOCK-${screen}${state ? '-' + state : ''}-${theme}-${lang}-${w}x${h}${zoom === 'system' ? '-systemfont' : typeof zoom === 'string' ? '-' + zoom : zoom ? '-zoom' + zoom * 100 : ''}.png`;

// The colour of one screenshot pixel: a 1x1 PNG (8-bit RGB or RGBA, one filter byte, then the pixel).
function pixel(png) {
  const idat = []; let at = 8;
  while (at < png.length) { const len = png.readUInt32BE(at); const type = png.toString('ascii', at + 4, at + 8); if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + len)); at += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)); return [raw[1], raw[2], raw[3]];
}
const rgb = css => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
const near = (a, b) => a.length === 3 && b.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= 2);
// The settings save bar is on screen and is what a click there reaches; one section shows; only the section scrolls.
const FOOT = `(() => { const f = document.querySelector('.oui-settings-foot'); if (!f) return 'no save bar'; const r = f.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 2, r.top + r.height / 2));
  const shown = [...document.querySelectorAll('.oui-settings-body .oui-formsection')].filter(e => e.offsetParent).length;
  // One section at a time; every one of them stacked (layout="stack"); none while a narrow page shows its list of pages.
  const all = document.querySelectorAll('.oui-settings-body .oui-formsection').length;
  const want = document.querySelector('.oui-settings-grid[data-layout="stack"]') ? all : document.querySelector('.oui-settings-body').offsetParent ? 1 : 0;
  return r.bottom > innerHeight + 0.5 || r.top < 0 ? 'save bar off screen ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + innerHeight
    : !(hit && f.contains(hit)) ? 'save bar covered' : document.documentElement.scrollHeight > innerHeight + 1 ? 'page scrolls as well as the section'
    : shown !== want ? shown + ' sections shown, not ' + want
    : [...document.querySelectorAll('.oui-toast')].some(t => t.getBoundingClientRect().bottom > r.top + 0.5) ? 'a toast under the save bar' : ''; })()`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(out, { recursive: true });
  const profile = await mkdtemp(join(tmpdir(), 'orca-ui5-shots-'));
  const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--use-mock-keychain', '--password-store=basic', '--disable-gpu', '--hide-scrollbars',
    '--disable-background-networking', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  const delay = ms => new Promise(r => setTimeout(r, ms));
  let socket; const problems = []; const metrics = [];
  try {
    let port;
    for (let tries = 0; tries < 2400 && !port; tries++) { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await delay(25); } }
    if (!port) throw new Error('Headless Chrome did not start');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
    let nextId = 0; const pending = new Map(); let events = [];
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === 'Runtime.exceptionThrown') events.push('exception: ' + (message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text));
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) events.push(message.params.type + ': ' + message.params.args.map(a => a.value ?? a.description).join(' '));
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') events.push('log: ' + message.params.entry.text);
      const item = pending.get(message.id);
      if (item) { pending.delete(message.id); message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result); }
    };
    const call = (method, params = {}) => new Promise((res, rej) => { const id = ++nextId; pending.set(id, { resolve: res, reject: rej }); socket.send(JSON.stringify({ id, method, params })); });
    await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable');
    const page = pathToFileURL(resolve(root, 'dist/index.html')).href;
    for (const scene of SCENES) {
      const name = sceneName(scene);
      if (!name.includes(filter)) continue;
      const [screen, state, theme, lang, width, height, option] = scene; const zoom = typeof option === 'number' ? option : 0;
      events = [];
      // "200 % zoom" is the same CSS viewport at half the size and twice the pixel density.
      await call('Emulation.setDeviceMetricsOverride', { width: zoom ? width / zoom : width, height: zoom ? height / zoom : height, deviceScaleFactor: zoom || 1, mobile: false });
      await call('Page.navigate', { url: `${page}?screen=${screen}&state=${state}&theme=${theme}&lang=${lang}${option === 'system' ? '&font=system' : ''}` });
      const result = await call('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
        const deadline = performance.now() + 8000;
        while (!document.querySelector('#app > *')) { if (performance.now() > deadline) throw new Error('page did not mount'); await new Promise(r => setTimeout(r, 20)); }
        await document.fonts.ready; await new Promise(r => setTimeout(r, 450));
        const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.p-datatable, [data-scroll-x], .oui-appbar-tabs, .oui-settings-nav, .oui-files-scroll, .oui-sr'); })
          .slice(0, 4).map(e => e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 50));
        const clipped = [...document.querySelectorAll('.p-button-label, .oui-appbar-tab, .oui-status-label, .oui-label')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis')
          .slice(0, 4).map(e => e.textContent.trim().slice(0, 30));
        return { font: getComputedStyle(document.body).fontFamily.split(',')[0], fontLoaded: document.fonts.check("13px Manrope"), overflowX: document.documentElement.scrollWidth > innerWidth + 1, over, clipped, pageHeight: document.documentElement.scrollHeight, license: !!document.getElementById('p-license-host') };
      })()` });
      if (result.exceptionDetails) { problems.push(`${name}: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`); continue; }
      const m = result.result.value;
      const clip = process.env.CLIP?.split(',').map(Number);   // CLIP=x,y,w,h[,scale]: a magnified detail, for inspection
      if (option === 'full' && m.pageHeight > height) { await call('Emulation.setDeviceMetricsOverride', { width, height: m.pageHeight, deviceScaleFactor: 1, mobile: false }); await delay(200); }
      const shot = await call('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3], scale: clip[4] ?? 2 } } : {}) });
      if (clip) { await writeFile(process.env.CLIP_OUT, Buffer.from(shot.data, 'base64')); continue; }
      await writeFile(join(out, name), Buffer.from(shot.data, 'base64'));
      metrics.push({ name, ...m, events });
      const bad = [m.overflowX && 'horizontal overflow ' + m.over.join(', '), m.clipped.length && 'clipped text ' + m.clipped.join(' | '), m.license && 'license banner', ...events].filter(Boolean);
      const evaluate = async expression => (await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression })).result.value;
      if (option === 'fill') {
        const page = rgb(await evaluate(`getComputedStyle(document.body).backgroundColor`));
        for (const x of [2, Math.round(width / 2), width - 3]) {
          const one = await call('Page.captureScreenshot', { format: 'png', clip: { x, y: height - 2, width: 1, height: 1, scale: 1 } });
          const got = pixel(Buffer.from(one.data, 'base64'));
          if (!near(got, page)) bad.push(`bottom of the tab at x=${x} is rgb(${got}), not the page colour rgb(${page})`);
        }
      }
      if (option === 'toasts') {
        // 5.14: the stack is bottom-right inside the window (4.2.0 to 5.13: bottom-left); every toast and dismissible banner has a named close button;
        // errors are alerts, the rest status.
        const t = await evaluate(`(() => { const host = document.querySelector('.oui-toasts'); const r = host && host.getBoundingClientRect(); const cards = [...document.querySelectorAll('.oui-toast')];
          const last = cards.at(-1)?.getBoundingClientRect();
          return { n: cards.length, left: r && Math.round(r.left), right: r && Math.round(r.right), bottom: last && Math.round(innerHeight - last.bottom),
            closes: cards.filter(c => c.querySelector('button.oui-toast-close[aria-label]')).length,
            roles: cards.map(c => c.dataset.toastTone + ':' + c.getAttribute('role')).join(','),
            banners: document.querySelectorAll('.oui-banner').length, bannerCloses: document.querySelectorAll('.oui-banner .oui-banner-close[aria-label]').length }; })()`);
        if (!t.n || t.left < 8 || t.right < width - 24 || t.right > width - 8 || t.bottom > 24 || t.bottom < 0) bad.push('toast stack not bottom-right: ' + JSON.stringify(t));
        if (t.closes !== t.n) bad.push('a toast without a close button: ' + JSON.stringify(t));
        if (!/error:alert/.test(t.roles) || /(info|success|warn):alert/.test(t.roles)) bad.push('toast roles: ' + t.roles);
        if (t.bannerCloses !== t.banners) bad.push('a banner without a close button');
        // 4.2.1: title and body read as two words; closing a focused toast puts focus back on the page at once.
        const words = await evaluate(`[...document.querySelectorAll('.oui-toast-text')].filter(p => p.querySelector('.oui-toast-body')).map(p => p.textContent.startsWith(p.querySelector('strong').textContent + ' ')).join()`);
        if (!words || words.includes('false')) bad.push('toast title and body run together in the text: ' + words);
        const focus = await evaluate(`(() => { const b = document.querySelector('.oui-toast-close'); b.focus(); b.click(); const a = document.activeElement; return a && a !== document.body && a.isConnected && !a.closest('.oui-toast') ? 'ok' : (a ? a.tagName + '.' + a.className : 'none'); })()`);
        if (focus !== 'ok') bad.push('focus after closing a toast: ' + focus);
        // 4.2.1: a toast counts down only while the page is visible and has focus, and resumes with the time it had
        // left; an error never leaves by itself. The page's focus and visibility are stubbed and their events sent.
        const clock = await evaluate(`(async () => {
          let focused = true, shown = 'visible';
          Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => focused });
          Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => shown });
          const sleep = ms => new Promise(r => setTimeout(r, ms));
          const set = (f, v) => { focused = f; shown = v; dispatchEvent(new Event(f ? 'focus' : 'blur')); document.dispatchEvent(new Event('visibilitychange')); };
          const n = window.__notices; n.toast.clear(); set(true, 'visible');
          const there = id => n.toast.list.list.some(t => t.id === id);
          const out = [];
          const a = n.toast.show({ tone: 'info', title: 'Clock', timeout: 2000 });
          const e = n.toast.show({ tone: 'error', title: 'Stays', timeout: 1500 });
          await sleep(1000); set(false, 'visible');                  // blurred after 1 s: 1 s left
          await sleep(2000); out.push(there(a) ? 'held-on-blur' : 'LOST-on-blur');
          set(true, 'hidden'); await sleep(800); out.push(there(a) ? 'held-when-hidden' : 'LOST-when-hidden');
          set(true, 'visible'); await sleep(600); out.push(there(a) ? 'resumed' : 'LOST-early');
          await sleep(900); out.push(there(a) ? 'NOT-gone' : 'gone-after-remaining');
          out.push(there(e) ? 'error-stays' : 'ERROR-LEFT');
          n.toast.clear();
          // A banner bound to its condition: closed, then the condition clears and returns, so it shows again.
          const b = () => document.querySelector('[data-test="banner-spoolman"]');
          b().querySelector('.oui-banner-close').click(); await sleep(50); out.push(b() ? 'BANNER-NOT-CLOSED' : 'banner-closed');
          n.spoolmanDown.value = false; await sleep(50); n.spoolmanDown.value = true; await sleep(50);
          out.push(b() ? 'banner-back' : 'BANNER-NOT-BACK');
          // 5.14: a banner with a delay never shows for a state that is over sooner, and shows for one that lasts.
          const w = () => document.querySelector('[data-test="banner-waiting"]');
          n.waiting.value = true; await sleep(120); out.push(w() ? 'FLASHED' : 'held-back'); n.waiting.value = false; await sleep(350); out.push(w() ? 'SHOWN-AFTER-OVER' : 'never-shown');
          n.waiting.value = true; await sleep(450); out.push(w() ? 'shown-when-lasting' : 'NOT-SHOWN'); n.waiting.value = false; await sleep(50); out.push(w() ? 'STAYED' : 'gone');
          // 5.14: raw error text is behind a closed disclosure, not in the sentence.
          const d = document.querySelector('[data-test="banner-details"] details');
          out.push(d && !d.open && !d.querySelector('.oui-details-text').checkVisibility() ? 'details-closed' : 'DETAILS-OPEN');
          d.querySelector('summary').click(); await sleep(50); out.push(d.open && /KeyError/.test(d.querySelector('.oui-details-text').textContent) && d.querySelector('.oui-details-text').checkVisibility() ? 'details-open' : 'DETAILS-NOT-SHOWN');
          return out.join(','); })()`);
        if (clock !== 'held-on-blur,held-when-hidden,resumed,gone-after-remaining,error-stays,banner-closed,banner-back,held-back,never-shown,shown-when-lasting,gone,details-closed,details-open') bad.push('toast clock / banner condition: ' + clock);
      }
      // 5.0.2: every (i) on the page, closed and then open. A closed bubble takes no room (the page is no wider than the
      // window); an open one is wholly inside the window, wherever its button is, and does not widen the page either.
      {
        const hints = await evaluate(`(async () => {
          const wide = () => document.documentElement.scrollWidth > document.documentElement.clientWidth ? 'page ' + document.documentElement.scrollWidth + ' wide in a ' + document.documentElement.clientWidth + ' window' : '';
          const bad = []; if (wide()) bad.push('closed: ' + wide());
          const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
          for (const hint of document.querySelectorAll('.oui-hint')) {
            if (!hint.offsetParent) continue;
            const name = hint.querySelector('button').getAttribute('aria-label');
            if (!hint.querySelector('button').getAttribute('aria-describedby') || !document.getElementById(hint.querySelector('button').getAttribute('aria-describedby'))?.textContent.trim()) bad.push(name + ': no description');
            hint.scrollIntoView({ block: 'center' });
            hint.dispatchEvent(new MouseEvent('mouseenter')); await new Promise(r => setTimeout(r, 60));
            const b = hint.querySelector('.oui-hint-bubble'); const r = b.getBoundingClientRect();
            if (!r.width || getComputedStyle(b).visibility !== 'visible') bad.push(name + ': did not open');
            else if (r.left < 0 || r.right > vw + 0.5 || r.top < 0 || r.bottom > vh + 0.5) bad.push(name + ': open bubble at ' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ' leaves the ' + vw + 'x' + vh + ' window');
            if (wide()) bad.push(name + ' open: ' + wide());
            hint.dispatchEvent(new MouseEvent('mouseleave')); await new Promise(r => setTimeout(r, 30));
            if (b.getBoundingClientRect().width) bad.push(name + ': closed bubble still takes room');
          }
          // The same for an (i) in each corner of the window: the bubble moves left, right, up or down as it must.
          const first = [...document.querySelectorAll('.oui-hint')].find(h => h.offsetParent);
          if (first) { scrollTo(0, 0); const at = first.getBoundingClientRect(); const b = first.querySelector('.oui-hint-bubble');
            for (const [x, y] of [[2, 2], [vw - 24, 2], [2, vh - 24], [vw - 24, vh - 24]]) {
              first.style.transform = 'translate(' + (x - at.left) + 'px,' + (y - at.top) + 'px)';
              first.dispatchEvent(new MouseEvent('mouseenter')); await new Promise(r => setTimeout(r, 60));
              const r = b.getBoundingClientRect();
              if (!r.width || r.left < 0 || r.right > vw + 0.5 || r.top < 0 || r.bottom > vh + 0.5) bad.push('corner ' + x + ',' + y + ': bubble at ' + [r.left, r.top, r.right, r.bottom].map(Math.round));
              if (wide()) bad.push('corner ' + x + ',' + y + ': ' + wide());
              first.dispatchEvent(new MouseEvent('mouseleave')); await new Promise(r => setTimeout(r, 30));
            }
            first.style.transform = ''; }
          scrollTo(0, 0); return bad.join('; '); })()`);
        if (hints) bad.push('hints: ' + hints);
      }
      if (screen.endsWith('-files')) {
        // The detail's picture has its own row: it never shrinks under, or is drawn over, the name and facts.
        const got = await evaluate(`(() => { const p = document.querySelector('.oui-files-preview'), n = document.querySelector('.oui-files-detailname'); if (!p || !n) return '';
          const a = p.getBoundingClientRect(), b = n.getBoundingClientRect(); return a.height < 40 ? 'picture ' + Math.round(a.height) + ' px high' : a.bottom > b.top + 0.5 && a.right > b.left + 0.5 && a.top < b.bottom ? 'picture over the name' : ''; })()`);
        if (got) bad.push('file detail: ' + got);
        // 5.0.7: with a file selected the table keeps room for at least two rows, however tall the detail is and wherever it sits.
        const rowsArea = await evaluate(`(() => { const a = document.querySelector('.oui-files-scroll'); return document.querySelector('.oui-files-row') && a ? Math.round(a.getBoundingClientRect().height) : 999; })()`);
        if (rowsArea < 118) bad.push('file table squeezed to ' + rowsArea + ' px');
        // and nothing of the toolbar over the table is cut off when it wraps.
        const clipped = await evaluate(`(() => { const bar = document.querySelector('.oui-files-toolbar'); if (!bar) return ''; const b = bar.getBoundingClientRect();
          return [...bar.querySelectorAll('input, button')].some(e => { const r = e.getBoundingClientRect(); return r.height && r.bottom > b.bottom + 0.5; }) ? 'toolbar cut off' : ''; })()`);
        if (clipped) bad.push(clipped);
        // 5.0.7: with no folders the toolbar slot is as wide as the bar and starts at its left.
        const bar = await evaluate(`(() => { if (document.querySelector('.oui-files-path')) return ''; const t = document.querySelector('.oui-files-tools')?.getBoundingClientRect(), b = document.querySelector('.oui-files-toolbar')?.getBoundingClientRect(); if (!t || !b) return '';
          return t.left - b.left > 20 || b.right - t.right > 20 ? 'toolbar slot at ' + Math.round(t.left - b.left) + '..' + Math.round(b.right - t.right) + ' from the ends' : ''; })()`);
        if (bar) bad.push(bar);
        // 5.0.3: the last column holds a short date and time in the page's language without cutting it.
        const cut = await evaluate(`[...document.querySelectorAll('.oui-files-row > td.oui-files-col-modified')].filter(td => td.scrollWidth > td.clientWidth).map(td => td.textContent.trim()).slice(0, 2).join(' | ')`);
        if (cut && width >= 700) bad.push('date cut off: ' + cut);
      }
      if (screen === 'u1-dash' && (!state || state === 'refused')) {
        // 5.0.3, OuiCamera: fit="contain" shows a 4:3 picture whole in the 16:9 box; `frame` fires for the picture and for nothing else.
        const cam = await evaluate(`(() => { const box = document.querySelector('.oui-camera'), img = box.querySelector('img.oui-camera-picture'); const a = box.getBoundingClientRect(), b = img.getBoundingClientRect();
          return [getComputedStyle(img).objectFit, Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1 ? 'fills' : 'SIZE', Math.abs(a.width / a.height - 16 / 9) < 0.02 ? '16:9' : 'RATIO', 'frames' + box.dataset.frames].join(); })()`);
        if (cam !== 'contain,fills,16:9,frames1') bad.push('camera: ' + cam);
        // OuiPanel hintId: a control points at the hint's text, and the text is there while the bubble is closed.
        const hint = await evaluate(`(() => { const text = document.getElementById('u1-camera-rate'); const by = document.querySelector('[data-test="fps"]')?.getAttribute('aria-describedby');
          return [text && text.textContent.trim().length > 20 ? 'text' : 'NO-TEXT', text && !text.getBoundingClientRect().width ? 'closed' : 'OPEN', by === 'u1-camera-rate' ? 'described' : 'BY-' + by,
            text?.closest('.oui-hint')?.querySelector('button').getAttribute('aria-describedby') === 'u1-camera-rate' ? 'button' : 'BUTTON'].join(); })()`);
        if (hint !== 'text,closed,described,button') bad.push('hint id: ' + hint);
      }
      if (screen === 'u1-dash' && state === 'refused') {
        const got = await evaluate(`(() => { const row = document.querySelector('[data-heater-row="bed"]'), line = row.querySelector('.oui-setpoint-error[role="alert"]'), input = document.getElementById('u1-bed');
          return [line && /105/.test(line.textContent) ? 'line' : 'NO-LINE', input.getAttribute('aria-invalid') === 'true' ? 'invalid' : 'VALID', line && input.getAttribute('aria-describedby')?.includes(line.id) ? 'described' : 'NOT-DESCRIBED'].join(); })()`);
        if (got !== 'line,invalid,described') bad.push('setpoint error prop: ' + got);
      }
      if (screen === 'u1-dash' && !state && width >= 1200) {
        // OuiSetpoint, driven with real key and mouse events. The bed row has the opt-in props (validate, inputId, offAlways,
        // maxFractionDigits, locale, accessible names); T2 is a plain row. 5.0.6: Set is enabled as soon as something is typed,
        // a status tick while typing leaves the field alone, a click on Set that does not take focus still sends what was
        // typed, decimals are typed in the page's language, and a plain row never sends more than its maximum.
        await evaluate(`document.querySelector('[data-heater-row="bed"]').scrollIntoView({ block: 'center' })`);
        const mouse = async selector => { const at = await evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
          for (const kind of ['mouseMoved', 'mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type: kind, x: at[0], y: at[1], button: kind === 'mouseMoved' ? 'none' : 'left', clickCount: kind === 'mouseMoved' ? 0 : 1 });
          await delay(150); };
        const dec = lang === 'pt-BR' ? ',' : '.';
        const keyOf = ch => (ch === '.' ? { key: '.', code: 'Period', windowsVirtualKeyCode: 190 } : ch === ',' ? { key: ',', code: 'Comma', windowsVirtualKeyCode: 188 } : { key: ch, code: 'Digit' + ch, windowsVirtualKeyCode: 48 + Number(ch) });
        const keys = async text => { for (const ch of text) { const key = keyOf(ch);
          await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...key }); await call('Input.dispatchKeyEvent', { type: 'char', text: ch, ...key }); await call('Input.dispatchKeyEvent', { type: 'keyUp', ...key }); } await delay(60); };
        const type = async (text, selector = '#u1-bed') => { await mouse(selector); await evaluate(`document.querySelector('${selector}').select()`); await keys(text); };
        const tick = async () => { await evaluate(`window.__u1.tick()`); await delay(80); };
        const read = (name = 'bed') => evaluate(`(() => { const row = document.querySelector('[data-heater-row="${name}"]'), input = row.querySelector('input'), line = row.querySelector('.oui-setpoint-error');
          return [input.value, line ? 'refused' : 'clear', input.getAttribute('aria-invalid') === 'true' ? 'invalid' : 'valid', row.querySelector('[data-set]').disabled ? 'set-off' : 'set-on', 'sent[' + row.dataset.sets + ']'].join(' '); })()`);
        const out = [await evaluate(`[document.querySelector('label[for="u1-bed"]') ? 'label' : 'NO-LABEL', document.querySelector('[data-heater-row="T1"] label') ? 'PLAIN-HAS-LABEL' : 'plain-span',
          document.querySelector('[data-off="T2"]').disabled ? 'T2-OFF-DISABLED' : 'T2-off-on', document.querySelector('[data-off="T3"]').disabled ? 'T3-off-disabled' : 'T3-OFF-ON',
          /bed|mesa/i.test(document.querySelector('[data-set="bed"]').getAttribute('aria-label') ?? '') && /bed|mesa/i.test(document.querySelector('[data-off="bed"]').getAttribute('aria-label') ?? '') ? 'named' : 'UNNAMED',
          document.querySelector('[data-heater-row="bed"] [data-test="bed-field"]') ? 'passed-through' : 'NOT-PASSED', document.querySelector('[data-set="bed"]').disabled ? 'blank-set-off' : 'BLANK-SET-ON'].join()`)];
        const focus = () => evaluate(`document.activeElement === document.getElementById('u1-bed') ? ' focused' : ' BLURRED'`);
        await type('150'); out.push(await read()); await tick(); out.push('tick ' + await read() + await focus()); await mouse('[data-set="bed"]'); out.push(await read());
        // Straight after a refusal, a decimal typed at the end stays.
        await evaluate(`(() => { const i = document.getElementById('u1-bed'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); })()`); await keys(dec + '5'); out.push(await read());
        await type('62' + dec + '5'); await tick(); out.push('tick ' + await read() + await focus()); await evaluate(`document.querySelector('[data-set="bed"]').click()`); await delay(120); out.push('click ' + await read());
        await type('999', '[data-heater-row="T2"] input'); await tick(); out.push('plain tick ' + await read('T2')); await evaluate(`document.querySelector('[data-set="T2"]').click()`); await delay(120); out.push('plain click ' + await read('T2'));
        // Judged while typed (T3: v-model:draft, invalid, error, errorId): 999 disables Set and shows the reason with no press of
        // Set; a blank field disables Set; a typed 0 enables it.
        const t3 = () => evaluate(`(() => { const row = document.querySelector('[data-heater-row="T3"]'), why = document.getElementById('temp-why-T3');
          return [row.querySelector('input').value || 'blank', row.querySelector('[data-set]').disabled ? 'set-off' : 'set-on', why ? (/320/.test(why.textContent) ? 'why-320' : 'WHY-TEXT') : 'no-why', document.activeElement === row.querySelector('input') ? 'focused' : 'BLURRED'].join(' '); })()`);
        await type('999', '[data-heater-row="T3"] input'); out.push('typed ' + await t3());
        await evaluate(`document.querySelector('[data-heater-row="T3"] input').select()`); const back = { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 };
        await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...back }); await call('Input.dispatchKeyEvent', { type: 'keyUp', ...back }); await delay(80); out.push(await t3());
        await keys('0'); out.push(await t3());
        await evaluate(`scrollTo(0, 0)`);
        const got = out.join(' / ');
        const want = `label,plain-span,T2-off-on,T3-off-disabled,named,passed-through,blank-set-off / 150 clear valid set-on sent[] / tick 150 clear valid set-on sent[] focused / 150 refused invalid set-on sent[] / 150${dec}5 clear valid set-on sent[] / tick 62${dec}5 clear valid set-on sent[] focused / click 62${dec}5 clear valid set-on sent[62.5] / plain tick 999 clear valid set-on sent[] / plain click 320 clear valid set-on sent[320] / typed 999 set-off why-320 focused / blank set-off no-why focused / 0 set-on no-why focused`;
        if (got !== want) bad.push('setpoint: ' + got);
      }
      if (screen === 'u1-files' && state === 'slow') {
        // A delete that takes a while, as on a real printer (5.0.6). Two rows are selected and the focused one is among
        // them: that is the case that lost focus up to 5.0.5 (the selection the gone rows leave updates the browser a second
        // time in the same flush, after the focused row has been removed). The question closes and gives focus back to the
        // row before the rows go; when they go, focus ends on a row that is still there, not on the page.
        const got = await evaluate(`(async () => { const wait = ms => new Promise(r => setTimeout(r, ms)); const rows = () => [...document.querySelectorAll('.oui-files-row')]; const out = [];
          const click = (el, o = {}) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, ...o }));
          const a = rows()[1], b = rows()[2]; click(a); await wait(60); click(b, { ctrlKey: true }); await wait(60); b.focus();
          out.push(document.querySelectorAll('.oui-files-row[aria-selected="true"]').length + '-selected');
          b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await wait(450);
          document.querySelector('[data-dlg="confirm"]')?.click(); await wait(350); out.push(document.activeElement === b ? 'back-on-row' : 'not-on-row:' + document.activeElement.tagName); out.push(rows().length);
          await wait(900); out.push(rows().length); const at = document.activeElement;
          out.push(at.classList.contains('oui-files-row') && at.isConnected && at !== a && at !== b ? 'focus-on-a-remaining-row' : 'FOCUS-' + at.tagName); return out.join(','); })()`);
        if (got !== '2-selected,back-on-row,10,8,focus-on-a-remaining-row') bad.push('file browser, slow delete: ' + got);
      }
      if (screen === 'u1-files' && !state && width >= 1200) {
        // OuiFileBrowser: click, Shift-click, Ctrl-click, select all, arrows with Shift, Space, Ctrl+A, Escape, drag onto a folder, Delete with its confirmation.
        const got = await evaluate(`(async () => {
          const tick = () => new Promise(r => setTimeout(r, 60)); const out = [];
          // 5.14: a row that is only looked at (a plain click) is aria-current, not aria-selected: count() is the ticked rows.
          const rows = () => [...document.querySelectorAll('.oui-files-row')]; const count = () => document.querySelectorAll('.oui-files-row[aria-selected="true"]').length;
          const seen = () => document.querySelectorAll('.oui-files-row[aria-current]').length;
          const click = (el, o = {}) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, ...o }));
          const key = (el, k, o = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...o }));
          click(rows()[0]); await tick(); out.push(count() + 'look' + seen());
          click(rows()[3], { shiftKey: true }); await tick(); out.push(count());
          click(rows()[1], { ctrlKey: true }); await tick(); out.push(count());
          const head = document.querySelector('.oui-files-table thead input'); head.click(); await tick(); out.push(count()); head.click(); await tick(); out.push(count());
          rows()[0].focus(); key(rows()[0], 'ArrowDown'); await tick(); key(document.activeElement, 'ArrowDown', { shiftKey: true }); await tick(); key(document.activeElement, 'ArrowDown', { shiftKey: true }); await tick(); out.push(count());
          key(document.activeElement, ' '); await tick(); out.push(count());
          key(document.activeElement, 'a', { ctrlKey: true }); await tick(); out.push(count()); key(document.activeElement, 'Escape'); await tick(); out.push(count());
          // 5.1.0: the drag is pointer events (OrcaSlicer's macOS web view never delivers HTML5 drops).
          click(rows()[2]); await tick(); const to = document.querySelector('[data-folder="local/gifts"]');
          const pointer = (target, type, over) => { const r = over.getBoundingClientRect(); target.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, button: 0, buttons: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); };
          pointer(rows()[5], 'pointerdown', rows()[5]); pointer(window, 'pointermove', to); await tick(); out.push('drag' + count());
          out.push(to.dataset.drop ? 'lit' : 'DARK'); pointer(window, 'pointerup', to); await tick(); out.push(rows().length);
          click(rows()[0]); await tick(); rows()[0].focus(); key(rows()[0], 'Delete'); await new Promise(r => setTimeout(r, 400));
          const yes = document.querySelector('[data-dlg="confirm"]'); out.push(yes ? 'asked' : 'NOT-ASKED'); out.push(rows().length); yes?.click(); await new Promise(r => setTimeout(r, 400)); out.push(rows().length);
          const tree = document.querySelector('[data-folder="local/chroma"]'); tree.focus(); key(tree, 'ArrowRight'); await tick(); key(tree, 'ArrowDown'); await tick(); out.push(document.activeElement.dataset.folder);
          // 5.0.3: Delete on a focused row with nothing selected asks at the first press; Keep puts focus back on that row;
          // after the delete, focus is still in the file list (not lost to the page).
          const wait = () => new Promise(r => setTimeout(r, 450)); const list = document.querySelector('.oui-files-list');
          key(rows()[0], 'Escape'); await tick(); out.push(count()); const row = rows()[0]; row.focus(); key(row, 'Delete'); await wait();
          out.push(document.querySelector('[data-dlg="confirm"]') ? 'asked-at-once' : 'NOT-ASKED'); document.querySelector('[data-dlg="cancel"]')?.click(); await wait();
          out.push(document.activeElement === row ? 'focus-back' : 'FOCUS-' + document.activeElement.tagName); out.push(rows().length);
          row.focus(); key(row, 'Delete'); await wait(); document.querySelector('[data-dlg="confirm"]')?.click(); await wait();
          out.push(rows().length); out.push(list.contains(document.activeElement) ? 'focus-in-list' : 'FOCUS-' + document.activeElement.tagName);
          // 5.0.3: the open folder's own actions sit beside the path (#folder); a read-only folder shows its files and
          // offers neither delete nor move, is not a place to move to, and its rows cannot be dragged.
          const actions = document.querySelector('.oui-files-toolbar > .oui-files-path + .oui-files-folderactions'); out.push(actions ? 'folder-actions' + actions.querySelectorAll('button').length : 'NO-FOLDER-ACTIONS');
          click(rows()[0], { ctrlKey: true }); await tick(); const move = document.querySelector('.oui-files-move'); out.push(move ? 'move-offered' : 'NO-MOVE'); move?.click(); await wait();
          out.push([...document.querySelectorAll('.p-select-option')].some(o => /Timelapses/.test(o.textContent)) ? 'READONLY-IS-A-TARGET' : 'not-a-target'); document.body.click(); await tick();
          click(document.querySelector('[data-folder="camera"]')); await wait(); out.push(rows().length); click(rows()[0]); await tick(); out.push(count());
          // 5.14: looking at a file (a plain click) arms nothing: its box is not ticked and the bar offers no Delete. Ticking it selects it.
          out.push(document.querySelector('.oui-files-bar .p-button-danger') || rows()[0].querySelector('input').checked ? 'LOOK-ARMS' : 'look-only');
          rows()[0].querySelector('input').click(); await tick(); out.push(count() + (rows()[0].querySelector('input').checked ? '-ticked' : '-UNTICKED'));
          out.push(document.querySelector('.oui-files-bar .p-button-danger')?.disabled ? 'no-delete' : 'DELETE-ON'); out.push(rows()[0].draggable ? 'DRAGGABLE' : 'fixed');
          out.push(document.querySelector('.oui-files-move')?.classList.contains('p-disabled') === false ? 'MOVE-ON' : 'no-move');
          key(rows()[0], 'Delete'); await wait(); out.push(document.querySelector('[data-dlg="confirm"]') ? 'ASKED' : 'not-asked');
          // 5.14: with one file looked at and focus moved to another row, Delete asks about the row that has focus.
          click(document.querySelector('[data-folder="local/gifts"]')); await wait(); click(rows()[0]); await tick(); const other = rows()[1]; other.focus(); key(other, 'ArrowDown'); await tick();
          const focused = document.activeElement.querySelector('[title]')?.title, lookedAt = rows()[0].querySelector('[title]')?.title; key(document.activeElement, 'Delete'); await wait();
          const named = [...document.querySelectorAll('.p-dialog .oui-files-names li')].map(li => li.textContent.trim());
          out.push(named.length === 1 && named[0] === focused && focused !== lookedAt ? 'delete-is-for-the-focused-row' : 'DELETE-FOR ' + named.join('+') + ' focus ' + focused);
          document.querySelector('[data-dlg="cancel"]')?.click(); await wait(); click(document.querySelector('[data-folder="camera"]')); await wait();
          return out.join(','); })()`);
        if (got !== '0look1,4,3,10,0,3,2,10,0,drag1,lit,9,asked,9,8,local/chroma/trays,0,asked-at-once,focus-back,8,7,focus-in-list,folder-actions3,move-offered,not-a-target,3,0,look-only,1-ticked,no-delete,fixed,no-move,not-asked,delete-is-for-the-focused-row') bad.push('file browser interactions: ' + got);
      }
      if (screen === 'u1-files' && !state && width >= 1200 && lang === 'en') {
        // 5.2.0: "New folder" beside the path makes one in the open folder, named at the top of the list: a name that is refused says why
        // and stays; Enter makes it and opens it; a folder's context menu makes one in that folder; Escape leaves.
        const got = await evaluate(`(async () => {
          const tick = () => new Promise(r => setTimeout(r, 120)); const out = []; try {
          const field = () => document.querySelector('[data-files-newname]');
          const typeName = async (v, key = 'Enter') => { const f = field(); f.value = v; f.dispatchEvent(new Event('input', { bubbles: true })); await tick(); f.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); await tick(); };
          out.push(document.querySelector('[data-files-mkdir]') ? 'MKDIR-IN-READ-ONLY' : 'none-in-read-only');
          document.querySelector('[data-folder="local/chroma"]').click(); await tick(); await tick();
          document.querySelector('[data-files-mkdir]').click(); await tick();
          out.push(field() === document.activeElement ? 'field-focused' : 'NOT-FOCUSED'); out.push(field().value);
          out.push(field().closest('.oui-files-newrow') ? 'in-list' : 'NOT-IN-LIST');
          await typeName('a/b'); out.push(document.querySelector('.oui-files-nameerror')?.textContent.includes('/') ? 'slash-refused' : 'SLASH-OK');
          await typeName(' x'); out.push(field()?.getAttribute('aria-invalid') === 'true' ? 'spaces-refused' : 'SPACES-OK');
          const sibling = document.querySelector('[data-folder^="local/chroma/"] .oui-files-foldername')?.textContent;
          await typeName(sibling.toUpperCase()); out.push(document.querySelector('.oui-files-nameerror')?.textContent.includes('already') ? 'taken-refused' : 'TAKEN-OK');
          await typeName('Prints'); await new Promise(r => setTimeout(r, 400));
          out.push(field() ? 'STILL-OPEN' : 'closed'); out.push(document.querySelector('[aria-current="true"][data-folder]')?.dataset.folder);
          const gifts = document.querySelector('[data-folder="local/gifts"]'); const r = gifts.getBoundingClientRect();
          gifts.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 20, clientY: r.top + 10, pageX: r.left + 20, pageY: r.top + 10 })); await tick();
          const item = [...document.querySelectorAll('.oui-menu [role=menuitem]')].find(i => i.textContent.includes('New folder'));
          out.push(item && document.activeElement === item ? 'menu' : 'NO-MENU'); item?.click(); await tick();
          out.push(field()?.closest('[role=treeitem]')?.previousElementSibling?.dataset.folder ?? 'NO-FIELD'); out.push(field()?.value);
          await typeName(field().value, 'Escape'); out.push(field() ? 'STILL-OPEN' : 'left');
          } catch (e) { out.push('THREW ' + e.message); } return out.join(','); })()`);
        if (got !== 'none-in-read-only,field-focused,New folder,in-list,slash-refused,spaces-refused,taken-refused,closed,local/chroma/Prints,menu,local/gifts,New folder,left') bad.push('file browser, new folder: ' + got);
      }
      if (screen === 'kobra-files' && !state && width >= 1200) {
        // The same component over a storage with no folders: no tree, no path, no "Move to", rows cannot be dragged;
        // multi-select and delete with its confirmation work as they do with folders.
        const got = await evaluate(`(async () => {
          const tick = () => new Promise(r => setTimeout(r, 60)); const out = [];
          const rows = () => [...document.querySelectorAll('.oui-files-row')]; const count = () => document.querySelectorAll('.oui-files-row[aria-selected="true"]').length;
          const click = (el, o = {}) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, ...o }));
          const key = (el, k, o = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...o }));
          out.push(document.querySelector('.oui-files-rail, .oui-files-tree, .oui-files-path, .oui-files-folderactions') ? 'TREE' : 'no-tree');
          out.push(rows()[0].dataset.file.startsWith('CHROMA_V8_50') && document.querySelector('th[aria-sort="descending"]') ? 'newest-first' : 'ORDER-' + rows()[0].dataset.file.slice(0, 12));
          click(rows()[0]); await tick(); click(rows()[3], { shiftKey: true }); await tick(); click(rows()[6], { ctrlKey: true }); await tick(); out.push(count());
          out.push(document.querySelector('.oui-files-move') ? 'MOVE' : 'no-move'); out.push(rows()[0].draggable ? 'DRAGGABLE' : 'fixed');
          const head = document.querySelector('.oui-files-table thead input'); head.click(); await tick(); out.push(count()); key(rows()[0], 'Escape'); await tick(); out.push(count());
          click(rows()[1]); await tick(); click(rows()[2], { ctrlKey: true }); await tick(); document.querySelector('.oui-files-bar .p-button-danger').click(); await new Promise(r => setTimeout(r, 400));
          const yes = document.querySelector('[data-dlg="confirm"]'); out.push(yes ? 'asked' : 'NOT-ASKED'); yes?.click(); await new Promise(r => setTimeout(r, 400)); out.push(rows().length); out.push(count());
          return out.join(','); })()`);
        if (got !== 'no-tree,newest-first,5,no-move,fixed,10,0,asked,8,0') bad.push('file browser without folders: ' + got);
      }
      if (screen.endsWith('-files') && state === 'error') {
        const got = await evaluate(`[document.querySelector('.oui-files-scroll .oui-empty[role="alert"]') ? 'alert' : 'NO-ALERT', document.querySelector('[data-files-retry]') ? 'retry' : 'NO-RETRY', document.querySelectorAll('.oui-files-row').length].join()`);
        if (got !== 'alert,retry,0') bad.push('file browser error state: ' + got);
      }
      if (screen === 'kobra-dash' && !state) {
        // 5.0.3: OuiCamera with the page's own player in #picture fills the 16:9 box, with the overlay over it.
        const got = await evaluate(`(() => { const box = document.querySelector('.oui-camera'), own = box?.querySelector('[data-test="own-player"]'); if (!own) return 'no player in #picture';
          const a = box.getBoundingClientRect(), b = own.getBoundingClientRect(); return Math.abs(a.width - b.width) > 1 || Math.abs(a.height - b.height) > 1 ? 'player ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' in a ' + Math.round(a.width) + 'x' + Math.round(a.height) + ' box'
            : Math.abs(a.width / a.height - 16 / 9) > 0.02 ? 'box is not 16:9' : box.dataset.state !== 'live' ? 'state ' + box.dataset.state : box.querySelector('.oui-camera-overlay') ? '' : 'no overlay'; })()`);
        if (got) bad.push('camera: ' + got);
      }
      if (screen === 'kit' && !state) {
        // 5.14, OuiPresetMatch: no score, no reasons, no tags; names without the plugin's prefix and the printer; a warning mark
        // only on the pick that is not a sure one; the list is names only and picking gives the real name back.
        const got = await evaluate(`(async () => { const tick = () => new Promise(r => setTimeout(r, 60)); const sure = document.querySelector('[data-test="match-sure"]'), unsure = document.querySelector('[data-test="match-unsure"]'); const out = [];
          out.push(sure.querySelector('.oui-match-name').textContent.trim() === 'Polymaker PLA Matte' ? 'clean-name' : 'NAME ' + sure.querySelector('.oui-match-name').textContent.trim());
          out.push(sure.querySelector('.oui-match-unsure') ? 'SURE-MARKED' : 'sure-plain'); out.push(unsure.querySelector('.oui-match-unsure[aria-label]') ? 'unsure-marked' : 'UNSURE-PLAIN');
          out.push(document.querySelector('.oui-match .oui-chip, .oui-match .oui-status') || /Score|score|Nota|@|_local|Spooler\\//.test(sure.textContent + unsure.querySelector('.oui-match-head').textContent) ? 'LEAK' : 'no-score-no-tags');
          unsure.querySelector('.oui-match-change').click(); await tick();
          const names = [...unsure.querySelectorAll('.oui-match-option-name')].map(n => n.textContent.trim()); out.push(names.join('|'));
          out.push(unsure.querySelectorAll('.oui-match-option .oui-meta').length > 1 || unsure.querySelector('.oui-match-option .oui-chip') ? 'LIST-LEAK' : 'names-only');
          [...unsure.querySelectorAll('.oui-match-option')].find(o => o.textContent.includes('Silk')).click(); await tick();
          out.push(unsure.querySelector('.oui-match-name').textContent.trim()); out.push(unsure.querySelector('.oui-match-list') ? 'LIST-OPEN' : 'closed');
          return out.join(','); })()`);
        const auto = lang === 'pt-BR' ? 'Automático' : 'Automatic';
        if (got !== `clean-name,sure-plain,unsure-marked,no-score-no-tags,${auto}|Generic PLA @Snapmaker U1|Generic PLA Silk|Generic PLA @BBL X1C|Generic PLA @Snapmaker U1|Polymaker PLA Matte,names-only,Generic PLA Silk,closed`) bad.push('preset match: ' + got);
        // An empty slot is one light row without a drawn spool; the saved-copy card shows its path only when opening failed.
        const parts = await evaluate(`[(() => { const e = document.querySelector('.oui-slot[data-empty]'); return e && !e.querySelector('.oui-spool') && e.getBoundingClientRect().height < 64 ? 'empty-row' : 'EMPTY-TALL'; })(),
          document.querySelector('[data-test="saved-ok"] [data-test="saved-path"]') ? 'PATH-SHOWN' : 'no-path', document.querySelector('[data-test="saved-failed"] [data-test="saved-path"]') ? 'path-on-failure' : 'NO-PATH',
          document.querySelector('[data-test="rows"] .oui-listrow[data-selected] [aria-pressed="true"]') ? 'row-pressed' : 'ROW'].join()`);
        if (parts !== 'empty-row,no-path,path-on-failure,row-pressed') bad.push('5.14 parts: ' + parts);
      }
      if (screen === 'notices') {
        // 5.14: one "Check again" for the list of requirements, none on its rows; details in the normal font.
        const got = await evaluate(`[document.querySelectorAll('.oui-reqs .oui-req').length, document.querySelectorAll('.oui-req .oui-req-check').length, document.querySelectorAll('.oui-reqs-foot .oui-req-check').length,
          /mono/i.test(getComputedStyle(document.querySelector('.oui-req-detail')).fontFamily) ? 'MONO' : 'plain'].join()`);
        if (got !== '3,0,1,plain') bad.push('requirements: ' + got);
      }
      if (screen === 'kobra-layout' && !state && width >= 1200) {
        // 5.14, OuiDashboard outside edit mode: every widget that is not `fill` is exactly as tall as its content, a `fill`
        // one as tall as its rows; none overlaps another; each sits 12 px under the one above it in its columns.
        const got = await evaluate(`(() => { const cells = [...document.querySelectorAll('.oui-dash-cell')].map(c => ({ id: c.dataset.widget, fill: 'fill' in c.dataset, r: c.getBoundingClientRect(), p: c.querySelector('.oui-panel').getBoundingClientRect(), body: c.querySelector('.oui-panel-body') }));
          const bad = [];
          for (const c of cells) { if (Math.abs(c.r.height - c.p.height) > 1) bad.push(c.id + ' cell ' + Math.round(c.r.height) + ' vs panel ' + Math.round(c.p.height));
            if (!c.fill && c.body.scrollHeight > c.body.clientHeight + 1) bad.push(c.id + ' clipped'); }
          for (const a of cells) for (const b of cells) if (a !== b && a.r.left < b.r.right - 1 && b.r.left < a.r.right - 1 && a.r.top < b.r.bottom - 1 && b.r.top < a.r.bottom - 1) bad.push(a.id + ' over ' + b.id);
          const temps = cells.find(c => c.id === 'temps'), filament = cells.find(c => c.id === 'filament'), camera = cells.find(c => c.id === 'camera');
          if (temps.r.height > filament.r.height / 2) bad.push('temps stretched to ' + Math.round(temps.r.height));
          if (Math.abs(camera.r.top - temps.r.bottom - 12) > 1.5 && Math.abs(camera.r.top - cells.find(c => c.id === 'controls').r.bottom - 12) > 1.5) bad.push('camera not under its column: ' + Math.round(camera.r.top));
          return bad.join('; '); })()`);
        if (got) bad.push('dashboard packing: ' + got);
      }
      if (screen === 'kobra-layout' && (state === 'header' || state === 'lost')) {
        // 5.14, editTo: the layout controls sit in the page header's actions; a target that is not on the page leaves them over the grid.
        const got = await evaluate(`[document.querySelector('.oui-pagehead-actions [data-test="dash-edit"]') ? 'in-header' : 'not-in-header', document.querySelector('.oui-dash-board [data-test="dash-edit"]') ? 'over-grid' : 'not-over-grid'].join()`);
        if (got !== (state === 'header' ? 'in-header,not-over-grid' : 'not-in-header,over-grid')) bad.push('dashboard editTo: ' + got);
      }
      if (screen === 'kobra-layout' && state === 'edit') {
        // 5.14: the layout menu is a menu button (it opens, names its items, and its own click closes it again); a widget's
        // content growing outside edit mode moves what is under it without a ResizeObserver loop.
        const got = await evaluate(`(async () => { const tick = ms => new Promise(r => setTimeout(r, ms)); const out = []; const errors = []; addEventListener('error', e => errors.push(e.message));
          const b = document.querySelector('[data-test="dash-menu"]'); b.click(); await tick(80);
          out.push(b.getAttribute('aria-expanded') === 'true' && document.querySelector('.oui-menu[aria-label]') ? 'open' : 'NOT-OPEN'); out.push(document.querySelectorAll('.oui-menu [role=menuitem]').length);
          b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); await tick(80); out.push(!document.querySelector('.oui-menu') && b.getAttribute('aria-expanded') === 'false' ? 'closed-by-its-button' : 'STILL-OPEN');
          document.querySelector('[data-test="dash-cancel"]').click(); await tick(300);
          const box = id => document.querySelector('.oui-dash-cell[data-widget="' + id + '"]').getBoundingClientRect();
          const before = box('camera').top; const body = document.querySelector('.oui-dash-cell[data-widget="controls"] .oui-panel-body'); const more = document.createElement('p'); more.style.height = '90px'; body.append(more); await tick(300);
          // The camera is under Temperatures and Controls: it sits 12 px under the taller of the two, now Controls.
          const under = Math.max(box('temps').bottom, box('controls').bottom) + 12;
          out.push(box('camera').top > before + 1 && Math.abs(box('camera').top - under) < 1.5 ? 'neighbour-follows' : 'CAMERA at ' + Math.round(box('camera').top) + ', not ' + Math.round(under)); out.push(errors.length ? 'ERRORS ' + errors.join(' / ') : 'no-loop');
          return out.join(','); })()`);
        if (got !== 'open,3,closed-by-its-button,neighbour-follows,no-loop') bad.push('dashboard edit: ' + got);
      }
      if (screen.endsWith('-dash') || screen === 'calc-quote') {
        // 5.14, OuiAppBar: no tab is ever cut or scrolled out of reach, at any width.
        const got = await evaluate(`(() => { const tabs = [...document.querySelectorAll('.oui-appbar-tab')]; const vw = document.documentElement.clientWidth;
          const cut = tabs.filter(t => { const r = t.getBoundingClientRect(); return r.left < -0.5 || r.right > vw + 0.5 || t.scrollWidth > t.clientWidth + 1; }).map(t => t.textContent.trim());
          return cut.length ? 'tabs cut: ' + cut.join(' | ') : ''; })()`);
        if (got) bad.push(got);
      }
      if (screen === 'kit' && state === 'heads') {
        // No header is wider than its panel, nothing in it sticks out of it or is cut off; where there is room it is one line.
        const got = await evaluate(`[...document.querySelectorAll('[data-test="head"]')].map((panel, n) => { const head = panel.querySelector('.oui-panel-head'); const p = panel.getBoundingClientRect(), h = head.getBoundingClientRect(); const bad = [];
          if (p.right > document.documentElement.clientWidth + 0.5) bad.push('panel ' + Math.round(p.width) + ' wide');
          if (head.scrollWidth > head.clientWidth + 1) bad.push('header content ' + head.scrollWidth + ' in ' + head.clientWidth);
          for (const el of head.querySelectorAll('.p-button, .p-select, .oui-status, .oui-panel-title')) { const r = el.getBoundingClientRect(); if (r.left < h.left - 0.5 || r.right > h.right + 0.5) bad.push(el.className.split(' ')[0] + ' outside'); }
          if (${width} >= 1200 && h.height > 41) bad.push('wrapped at ' + ${width});
          // 5.0.5: a state chip in a header keeps its word.
          for (const label of head.querySelectorAll('.oui-status-label')) if (label.scrollWidth > label.clientWidth + 1 || label.clientWidth < 8) bad.push('state chip cut to ' + Math.round(label.closest('.oui-status').getBoundingClientRect().width) + ' px');
          return bad.length ? 'header ' + (n + 1) + ': ' + bad.join(', ') : ''; }).filter(Boolean).join('; ')`);
        if (got) bad.push(got);
      }
      if (screen === 'kobra-settings') {
        const foot = await evaluate(FOOT); if (foot) bad.push(foot);
        if (option === 'resize') {
          // The window made shorter after the page opened, as OrcaSlicer does: the same page re-lays out to the new height.
          await call('Emulation.setDeviceMetricsOverride', { width, height: 600, deviceScaleFactor: 1, mobile: false });
          await delay(350);
          const after = await evaluate(FOOT); if (after) bad.push('after resize to 600: ' + after);
          const small = await call('Page.captureScreenshot', { format: 'png' });
          await writeFile(join(out, name.replace('.png', '-to-1280x600.png')), Buffer.from(small.data, 'base64'));
        }
      }
      if (bad.length) problems.push(`${name}: ${bad.join('; ')}`);
      console.log(name, `page ${m.pageHeight}px`, bad.length ? 'PROBLEM' : 'ok');
    }
    if (!filter) await writeFile(join(out, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  } finally {
    socket?.close(); browser.kill('SIGTERM');
    await new Promise(r => (browser.exitCode !== null ? r() : browser.once('exit', r)));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
  if (problems.length) { console.log('PROBLEMS\n' + problems.join('\n')); process.exit(1); }
  console.log('OK');
}
