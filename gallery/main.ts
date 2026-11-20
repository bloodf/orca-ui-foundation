import { createApp } from 'vue';
import App from './App.vue';
import { installOrcaUI, applyOrcaTheme, type OrcaAccent } from '../src';
import { lang, param } from './i18n';

document.documentElement.lang = lang;
// ?font=system shows the page as it is without the optional brand face.
if (param('font', 'brand') === 'system') document.documentElement.style.setProperty('--oui-font', "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
document.body.classList.add('orca-ui');
// One accent hue per plugin: its tab is recognisable before anything is read.
export const ACCENTS: Record<string, OrcaAccent> = { kobra: 'violet', u1: 'cobalt', spooler: 'magenta', calc: 'lime', organizer: 'sky', embedder: 'teal' };
const app = createApp(App);
installOrcaUI(app, lang, ACCENTS[param('screen', 'kit').split('-')[0]] ?? 'teal');
applyOrcaTheme(param('theme', 'light') === 'dark' ? 'dark' : 'light');
app.mount('#app');
