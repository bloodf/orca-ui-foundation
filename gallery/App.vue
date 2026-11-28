<script setup lang="ts">
import { param } from './i18n';
import Kit from './screens/Kit.vue';
import KobraDash from './screens/KobraDash.vue';
import KobraSettings from './screens/KobraSettings.vue';
import U1Dash from './screens/U1Dash.vue';
import CalcQuote from './screens/CalcQuote.vue';
import OrganizerDock from './screens/OrganizerDock.vue';
import EmbedderMain from './screens/EmbedderMain.vue';
import Notices from './screens/Notices.vue';
import PrinterStock from './screens/PrinterStock.vue';
import PrinterFiles from './screens/PrinterFiles.vue';
import SpoolerSpools from './screens/SpoolerSpools.vue';
import Tokens5 from './screens/Tokens5.vue';
import SpoolPick from './screens/SpoolPick.vue';
import Dashboard from './screens/Dashboard.vue';

// MOCK reference screens: ?screen=<name>&state=<state>&theme=dark|light&lang=en|pt-BR
const SCREENS = { kit: Kit, 'kobra-dash': KobraDash, 'kobra-settings': KobraSettings, 'u1-dash': U1Dash, 'spooler-stock': SpoolerSpools,
  'u1-stock': PrinterStock, 'kobra-stock': PrinterStock, 'u1-files': PrinterFiles, 'kobra-files': PrinterFiles, 'spooler-spools': SpoolerSpools, 'tokens': Tokens5,
  'calc-quote': CalcQuote, 'organizer-dock': OrganizerDock, 'embedder-main': EmbedderMain, notices: Notices, 'spool-pick': SpoolPick, 'kobra-layout': Dashboard } as const;
const screen = SCREENS[param('screen', 'kit') as keyof typeof SCREENS] ?? Kit;
const state = param('state', '');
</script>
<template><component :is="screen" :state="state" /></template>
