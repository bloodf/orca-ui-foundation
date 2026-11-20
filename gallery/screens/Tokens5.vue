<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { OuiAppBar, OuiIcon, OuiPageHeader, OuiPanel, OuiStatus } from '../../src/components';
import { palette } from '../../src';
import * as I from '../../src/icons';
import { MARKS } from '../marks';
// MOCK — 5.0 colour reference: OrcaSlicer's own colours (src/slic3r/GUI/Widgets/StateColor.cpp, Button.cpp, TextInput.cpp,
// SwitchButton.cpp and resources/web/include/global.css, read at commit 7932cd2) beside the tokens that take them.
defineProps<{ state: string }>();
type Row = [role: string, source: string, orcaLight: string, orcaDark: string, token: keyof typeof palette.light, note: string];
const ROWS: Row[] = [
  ['Page behind panels', '--bg-color-alt · side tab bar', '#F0F0F0', '#242428', 'background', ''],
  ['Window, panel, field', 'wxWHITE map · --bg-color', '#FFFFFF', '#2D2D31', 'surface', ''],
  ['Title bars, table heads, cards', '--bg-color-secondary', '#F4F4F4', '#36363B', 'raised', ''],
  ['Wells and tracks', 'separator line · switch track', '#EEEEEE', '#27272A', 'inset', ''],
  ['Regular button', 'btn_regular normal', '#DFDFDF', '#3E3E45', 'control', ''],
  ['Regular button, hover', 'btn_regular hover', '#D4D4D4', '#4D4D54', 'controlHover', ''],
  ['Hairlines', '--border-color', '#DBDBDB', '#4A4A51', 'border', ''],
  ['Text', '--fg-color-text', '#262E30', '#EFEFF0', 'text', ''],
  ['Labels, secondary text', '--fg-color-label · dimmed text', '#6B6B6B', '#B2B3B5', 'muted', 'Light is darker than #6B6B6B: 4.5:1 on every surface and tint'],
  ['Field outline (3:1)', '--icon-color · disabled text', '#7C8282', '#818183', 'controlBorder', 'OrcaSlicer outlines fields with the hairline; ours must be found at 3:1'],
  ['OrcaSlicer teal: marks', '--main-color-fixed', '#009688', '#009688', 'primaryMark', 'Focus ring, checked box and switch, progress, selection'],
  ['Confirm button', 'btn_confirm normal', '#009688', '#00675B', 'primary', 'Light uses #008172: white on #009688 is 3.7:1, on #008172 4.8:1'],
  ['Confirm button, hover', 'btn_confirm hover', '#26A69A', '#008172', 'primaryHover', 'Light goes darker on hover, to keep the label at 4.5:1'],
  ['Checked item', 'dropdown checked item', '#BFE1DE', '#223C3C', 'primarySoft', ''],
  ['Teal text, links', '--main-color · plugin link text', '#009688', '#5EEAD4', 'primaryText', 'Light uses #00675B: #009688 text on white is 3.7:1'],
  ['Alert', '--button-bg-alert', '#E14747', '#E14747', 'dangerSolid', 'White on #E14747 is 4.0:1; ours holds 4.5:1'],
];
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const on = ref(true); const box = ref(true); const text = ref('0.20'); const pick = ref('Generic PLA');
const tabs = [{ value: 'a', label: 'Dashboard', icon: I.dashboard }, { value: 'b', label: 'Stock', icon: I.spool }, { value: 'c', label: 'Files', icon: I.files }];
const tab = ref('a');
const PLUGINS: [string, keyof typeof MARKS, keyof typeof palette.light][] = [['Kobra Control', 'kobra', 'violetSolid'], ['U1 Control', 'u1', 'cobaltSolid'], ['Spooler', 'spooler', 'magentaSolid'],
  ['Print Calculator', 'calculator', 'limeSolid'], ['Organizer', 'organizer', 'skySolid'], ['Embedder', 'embedder', 'tealSolid']];
</script>
<template>
  <OuiAppBar v-model="tab" name="UI foundation 5" :tabs="tabs">
    <template #mark><span v-html="MARKS.embedder" /></template>
    <template #status><OuiStatus state="ok">MOCK</OuiStatus></template>
  </OuiAppBar>
  <main class="oui-page">
    <OuiPageHeader title="OrcaSlicer reference colours and the 5.0 tokens" meta="OrcaSlicer main at 7932cd2 · light and dark" />
    <OuiPanel title="Colour roles" :icon="I.fill" flush>
      <div class="tk-scroll" data-scroll-x><table class="tk-table">
        <thead><tr><th>Role in OrcaSlicer</th><th>Where it is defined</th><th>OrcaSlicer light</th><th>Token light</th><th>OrcaSlicer dark</th><th>Token dark</th><th>Token</th><th>Difference</th></tr></thead>
        <tbody><tr v-for="r in ROWS" :key="r[4]">
          <td class="oui-strong">{{ r[0] }}</td><td class="oui-meta">{{ r[1] }}</td>
          <td><span class="tk-sw" :style="{ background: r[2] }" /><span class="oui-mono">{{ r[2] }}</span></td>
          <td :data-diff="!same(r[2], palette.light[r[4]]) || undefined"><span class="tk-sw" :style="{ background: palette.light[r[4]] }" /><span class="oui-mono">{{ palette.light[r[4]].toUpperCase() }}</span></td>
          <td><span class="tk-sw" :style="{ background: r[3] }" /><span class="oui-mono">{{ r[3] }}</span></td>
          <td :data-diff="!same(r[3], palette.dark[r[4]]) || undefined"><span class="tk-sw" :style="{ background: palette.dark[r[4]] }" /><span class="oui-mono">{{ palette.dark[r[4]].toUpperCase() }}</span></td>
          <td class="oui-mono">{{ r[4] }}</td><td class="oui-meta tk-note">{{ r[5] || 'Same' }}</td>
        </tr></tbody>
      </table></div>
    </OuiPanel>

    <div class="oui-dash-pair">
      <OuiPanel title="Controls in this theme" :icon="I.settings" meta="PrimeVue through the 5.0 preset">
        <div class="oui-stack">
          <div class="oui-row"><Button label="Regular" severity="secondary" /><Button label="Confirm" /><Button label="Quiet" severity="secondary" text /><Button label="Stop print" severity="danger" outlined /><Button label="Emergency stop" severity="danger" /><Button label="Disabled" severity="secondary" disabled /></div>
          <div class="oui-row"><InputText v-model="text" style="width: 120px" aria-label="Layer height" /><Select v-model="pick" :options="['Generic PLA', 'Generic PETG']" aria-label="Filament" />
            <label class="oui-row"><Checkbox v-model="box" binary /> Checked</label><label class="oui-row"><ToggleSwitch v-model="on" /> Switch</label></div>
          <div class="oui-row"><OuiStatus state="ok">Connected</OuiStatus><OuiStatus state="busy">Printing</OuiStatus><OuiStatus state="warn">Low stock</OuiStatus><OuiStatus state="error">Failed</OuiStatus><OuiStatus state="offline">Offline</OuiStatus><OuiStatus state="idle">Idle</OuiStatus>
            <span class="oui-chip">PLA</span><span class="oui-chip">use first</span><span class="oui-slot-badge" data-tool="1">T1</span><span class="oui-slot-badge" data-tool="2">T2</span><span class="oui-slot-badge" data-tool="3">T3</span><span class="oui-slot-badge" data-tool="4">T4</span></div>
        </div>
      </OuiPanel>
      <OuiPanel title="Where colour is allowed" :icon="I.info" meta="everything else is grey">
        <div class="oui-stack">
          <div class="oui-row tk-marks"><span v-for="p in PLUGINS" :key="p[0]" class="tk-mark"><span class="oui-appbar-mark" :style="{ background: palette.light[p[2]] }" v-html="MARKS[p[1]]" /><span class="oui-meta">{{ p[0] }}</span></span></div>
          <div class="oui-row"><OuiIcon :icon="I.thermometer" tone="orange" /><span class="oui-meta">heat</span><OuiIcon :icon="I.spool" tone="magenta" /><span class="oui-meta">filament</span><OuiIcon :icon="I.camera" tone="sky" /><span class="oui-meta">camera, air</span>
            <OuiIcon :icon="I.move" tone="cobalt" /><span class="oui-meta">motion</span><OuiIcon :icon="I.coins" tone="lime" /><span class="oui-meta">stock, money</span><OuiIcon :icon="I.shieldCheck" tone="teal" /><span class="oui-meta">trust</span></div>
          <p class="oui-meta">The plugin's hue: its mark tile and the line under the open tab. Hues: module and row icons. State colours: chips, banners, toasts, level bars, heat readings. Filament colour: the drawn spool and the swatch. Toolhead colour: the T1–T4 badge.</p>
        </div>
      </OuiPanel>
    </div>
  </main>
</template>
<style>
.tk-scroll { overflow-x: auto; }
.tk-table { width: 100%; min-width: 1080px; border-collapse: collapse; }
.tk-table th { padding: 8px 12px; text-align: start; font-size: var(--oui-text-xs); font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--oui-muted); background: var(--oui-raised); white-space: nowrap; }
.tk-table td { padding: 6px 12px; border-top: 1px solid var(--oui-border); white-space: nowrap; }
.tk-table td.tk-note { white-space: normal; min-width: 220px; }
.tk-sw { display: inline-block; width: 44px; height: 22px; margin-inline-end: 8px; vertical-align: middle; border-radius: var(--oui-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--oui-text) 28%, transparent); }
.tk-table td[data-diff] .oui-mono { font-weight: 700; text-decoration: underline dotted; text-underline-offset: 3px; }
.tk-marks { gap: var(--oui-s4); }
.tk-mark { display: inline-flex; align-items: center; gap: 6px; }
</style>
