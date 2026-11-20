import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'evidence-4.0.0/verify');
await mkdir(evidence, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'orca-ui4-verify-'));
const browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--use-mock-keychain', '--password-store=basic', '--disable-gpu',
  '--disable-background-networking', '--no-first-run', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let log = '';
browser.stderr.on('data', chunk => { log += chunk; });
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
let socket;
try {
  let port;
  for (let tries = 0; tries < 150; tries++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(20); }
  }
  assert(port, 'Owned headless browser did not start');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const item = pending.get(message.id);
    if (item) { pending.delete(message.id); message.error ? item.reject(message.error) : item.resolve(message.result); }
  };
  const call = (method, params = {}) => new Promise((resolveCall, reject) => {
    const id = ++nextId; pending.set(id, { resolve: resolveCall, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  await call('Page.enable');
  const results = [];
  for (const [theme, width, reduced = false] of [['light', 1280], ['dark', 1280], ['dark', 720], ['light', 1280, true], ['dark', 1280, true]]) {
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    // Headless Chrome on a busy machine sometimes stops producing frames; requestAnimationFrame then never fires and no
    // transition can finish. The page reports that case by name and it is retried, so it is not mistaken for a UI defect.
    let evaluation;
    for (let attempt = 1; ; attempt++) {
    await call('Page.navigate', { url: pathToFileURL(resolve(root, 'dist/index.html')).href + '?screen=kit&theme=' + theme });
    evaluation = await call('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
      const until = async (test) => { const deadline = performance.now() + 8000; while (!test()) { if (performance.now() > deadline) throw new Error('UI condition timed out'); await new Promise(r => setTimeout(r, 20)); } };
      const find = text => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
      await until(() => find('Link to T1'));
      await new Promise(r => setTimeout(r, 400)); // PrimeVue 5 eases the theme in on mount
      const button = find('Link to T1'), style = getComputedStyle(button);
      const result = { buttonBackground: style.backgroundColor, buttonColor: style.color, radius: style.borderRadius,
        font: style.fontSize, overflow: document.documentElement.scrollWidth > innerWidth,
        primeButtons: document.querySelectorAll('.p-button').length,
        // Every spool: its render level, the unknown flag, the "?" badge and whether the winding is drawn.
        spools: [...document.querySelectorAll('.oui-spool')].map(s => ({ level: s.dataset.level, unknown: s.hasAttribute('data-unknown'),
          badge: s.querySelector('.oui-spool-unknown')?.textContent ?? null, wind: !!s.querySelector('.oui-spool-wind'),
          slot: s.closest('.oui-slot')?.querySelector('.oui-slot-badge')?.textContent ?? null })) };
      button.click(); await until(() => document.querySelector('[role=dialog]'));
      result.dialogOpened = true;
      const dialog = document.querySelector('[role=dialog]');
      // Confirm once the dialog has finished opening, as a person would. Confirming in the same frame it appears
      // left it open in about 1 run in 9 under reduced motion (PrimeVue's enter and leave overlap); not root-caused.
      await new Promise(r => setTimeout(r, 300));
      [...dialog.querySelectorAll('button')].find(b => b.textContent.trim() === 'Link to T1').click();
      try { await until(() => !document.querySelector('[role=dialog]')); }
      catch { // Say what state the dialog was left in, so a stuck close can be diagnosed from the log.
        const d = document.querySelector('[role=dialog]'), mask = d.closest('.p-dialog-mask') ?? d.parentElement, cs = getComputedStyle(d);
        const frames = await Promise.race([new Promise(r => requestAnimationFrame(() => r(true))), new Promise(r => setTimeout(() => r(false), 1000))]);
        throw new Error((frames ? '' : 'FRAMES_STALLED ') + 'Dialog did not close: ' + JSON.stringify({ frames, confirmed: document.body.textContent.includes('Mock link done.'), hidden: document.hidden,
          dialog: [...d.attributes].map(a => a.name + '=' + a.value.slice(0, 50)), mask: [...mask.attributes].map(a => a.name + '=' + a.value.slice(0, 70)),
          animation: cs.animationName + ' ' + cs.animationDuration, transition: cs.transitionDuration, opacity: cs.opacity }));
      }
      result.dialogClosed = true;
      result.confirmationCompleted = document.body.textContent.includes('Mock link done.');
      await new Promise(r => setTimeout(r, 500));
      result.licenseBanner = !!document.getElementById('p-license-host');
      result.motion = [...document.querySelectorAll('.p-button, .p-progressbar-value, .oui-status-dot, .oui-empty-spin, .oui-appbar-tab')].flatMap(el =>
        [null, '::before', '::after'].map(pseudo => {
          const cs = getComputedStyle(el, pseudo);
          return { transition: cs.transitionDuration, animation: cs.animationDuration, iterations: cs.animationIterationCount };
        }));
      return result;
    })()` });
    if (attempt < 3 && /FRAMES_STALLED/.test(evaluation.exceptionDetails?.exception?.description ?? '')) { console.log(`retry ${theme} ${width}${reduced ? ' reduced' : ''}: headless Chrome produced no frames`); continue; }
    break;
    }
    assert(!evaluation.exceptionDetails, JSON.stringify(evaluation.exceptionDetails));
    const data = evaluation.result.value;
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const focused = await call('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
      const samples = [];
      for (const el of document.querySelectorAll('[data-focus-probe]')) {
        el.focus();
        // The ring's colour eases in; read it once it has settled (up to 2 s on a busy machine), not after a fixed wait.
        const cs = getComputedStyle(el);
        for (let waited = 0; waited < 2000 && (waited < 200 || cs.outlineColor === 'rgba(0, 0, 0, 0)'); waited += 50) await new Promise(r => setTimeout(r, 50));
        samples.push({ severity: el.dataset.focusProbe, visible: el.matches(':focus-visible'), outline: cs.outlineColor,
          width: cs.outlineWidth, style: cs.outlineStyle, background: getComputedStyle(document.body).backgroundColor });
      }
      return samples;
    })()` });
    assert(!focused.exceptionDetails, JSON.stringify(focused.exceptionDetails));
    data.focus = focused.result.value;
    results.push({ theme, width, reduced, ...data });
    assert(data.dialogOpened && data.dialogClosed && data.confirmationCompleted && !data.overflow);
    assert(!data.licenseBanner, 'PrimeUI license banner shown');
    assert.equal(data.font, '13px'); assert.equal(data.radius, '6px');
    // Unknown amount with a colour: the full reel in that colour plus the "?" badge; with no colour: the bare reel, no badge.
    const unknownSpools = data.spools.filter(s => s.unknown);
    assert(unknownSpools.length >= 3 && unknownSpools.some(s => s.slot === 'T2'), `Unknown spools missing: ${JSON.stringify(data.spools)}`);
    for (const s of data.spools) assert.equal(s.badge, s.unknown ? '?' : null, `Spool badge: ${JSON.stringify(s)}`);
    for (const s of unknownSpools) assert(s.level === '1' && s.wind, `Unknown spool not drawn full: ${JSON.stringify(s)}`);
    assert(data.spools.some(s => s.level === '8' && !s.unknown && !s.wind && s.slot === null), 'Bare reel for an unknown amount with no colour missing');
    assert(data.spools.filter(s => s.slot === 'A4').every(s => s.level === '8' && !s.unknown), 'Empty slot not the bare reel');
    const luminance = rgb => {
      const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    };
    for (const focus of data.focus) {
      const values = [luminance(focus.outline), luminance(focus.background)].sort((a, b) => a - b);
      assert(focus.visible && focus.outline !== 'rgba(0, 0, 0, 0)' && focus.style !== 'none' && parseFloat(focus.width) >= 2 && (values[1] + .05) / (values[0] + .05) >= 3,
        `Invisible focus: ${theme} ${JSON.stringify(focus)}`);
    }
    if (reduced) for (const motion of data.motion) {
      assert(motion.transition.split(',').every(t => parseFloat(t) === 0), `Motion transition: ${JSON.stringify(motion)}`);
      assert(motion.animation.split(',').every(t => parseFloat(t) <= .001), `Motion animation: ${JSON.stringify(motion)}`);
    }
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(evidence, `MOCK-kit-${theme}-${width}${reduced ? '-reduced' : ''}.png`), Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ theme, width, reduced, licenseBanner: data.licenseBanner, button: [data.buttonBackground, data.buttonColor], focus: data.focus.length }));
  }
  await writeFile(resolve(evidence, 'results.json'), JSON.stringify(results, null, 2) + '\n');
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await new Promise(resolveExit => browser.exitCode !== null ? resolveExit() : browser.once('exit', resolveExit));
  await writeFile(resolve(evidence, 'chrome.log'), log);
  await rm(profile, { recursive: true, force: true });
}
