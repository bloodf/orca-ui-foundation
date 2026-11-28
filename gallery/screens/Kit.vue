<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import Select from 'primevue/select';
import { OuiAppBar, OuiBanner, OuiConfirm, OuiEmpty, OuiIcon, OuiLevel, OuiListRow, OuiPanel, OuiPresetMatch, OuiReadout, OuiSavedCopy, OuiSlot, OuiSpark, OuiSpool, OuiStatus, OuiSwatch, OuiThumb, relativeTime, type OuiState, type OuiTone } from '../../src/components';
import { palette } from '../../src';
import * as I from '../../src/icons';
import { param, t } from '../i18n';
import { MARKS } from '../marks';
import artKobra from '../../assets/illustrations/kobra-connect.webp';
import artU1 from '../../assets/illustrations/u1-toolheads.webp';
import artSpooler from '../../assets/illustrations/spooler-shelf.webp';
import artCalc from '../../assets/illustrations/calculator-quote.webp';
import artOrganizer from '../../assets/illustrations/organizer-plate.webp';
import artEmbedder from '../../assets/illustrations/embedder-insert.webp';

// MOCK — the kit sheet: the colour system, the icon set and every shared part. state: '' | 'icons' | 'colour' | 'art' | 'heads' (one sheet each
// for the contact sheet). scripts/verify-gallery.mjs drives the default sheet.
const props = defineProps<{ state: string }>();
const show = (part: string) => !props.state || props.state === part;
const theme = param('theme', 'light') === 'dark' ? 'dark' : 'light';
const roles = palette[theme] as Record<string, string>;
const HUES = ['teal', 'sky', 'cobalt', 'violet', 'magenta', 'lime', 'orange'] as const;
const NEUTRALS = ['background', 'surface', 'raised', 'inset', 'control', 'controlHover', 'border', 'controlBorder', 'muted', 'text', 'primary', 'primaryHover', 'primaryMark', 'primarySoft', 'primaryText'];
const STATES: [string, string, OuiTone][] = [['success', 'successBg', 'success'], ['info', 'infoBg', 'info'], ['warning', 'warningBg', 'warn'], ['danger', 'dangerBg', 'danger']];
const PLUGINS: [string, keyof typeof MARKS, typeof HUES[number]][] = [['Kobra Control', 'kobra', 'violet'], ['U1 Control', 'u1', 'cobalt'], ['Spooler', 'spooler', 'magenta'],
  ['Print Calculator', 'calculator', 'lime'], ['Organizer', 'organizer', 'sky'], ['Embedder', 'embedder', 'teal']];
const DOMAINS: [string, I.OuiIconData, OuiTone][] = [[t('Heat', 'Calor'), I.thermometer, 'orange'], [t('Motion', 'Movimento'), I.move, 'cobalt'],
  [t('Camera and air', 'Câmera e ar'), I.camera, 'sky'], [t('Filament', 'Filamento'), I.spool, 'magenta'], [t('Stock and money', 'Estoque e dinheiro'), I.boxes, 'lime'], [t('Trust', 'Confiança'), I.shieldCheck, 'teal'], [t('Everything else', 'Todo o resto'), I.printer, 'neutral']];
// A plugin's identity, applied to one card: the two variables applyOrcaTheme() writes for the page.
const pluginVars = (hue: string) => ({ '--oui-accent': roles[hue], '--oui-accent-solid': roles[hue + 'Solid'] });
const states: [OuiState, string][] = [['ok', t('Connected', 'Conectada')], ['busy', t('Printing', 'Imprimindo')], ['connecting', t('Connecting', 'Conectando')], ['pending', t('Waiting for the printer', 'Aguardando a impressora')],
  ['stale', t('Read 5 min ago', 'Lido há 5 min')], ['warn', t('Low', 'Baixo')], ['error', t('Failed', 'Falhou')], ['offline', t('Offline', 'Sem conexão')], ['idle', t('Idle', 'Parada')]];
const type: [string, string, string][] = [['--oui-text-3xl', '40 / 600', '37 %'], ['--oui-text-2xl', '28 / 600', 'R$ 92.10'], ['--oui-text-xl', '20 / 600', '219.6 °C'],
  ['--oui-text-lg', '15 / 650', 'desk_organiser_plate_1.gcode'], ['--oui-text-md', '13 / 400', t('Body and controls', 'Texto e controles')], ['--oui-text-sm', '12 / 400', t('Secondary line', 'Linha secundária')]];
const matchLabels = { change: t('Change', 'Trocar'), none: t('No preset', 'Nenhum preset'), review: t('Another preset is a close match. Worth a look.', 'Outro preset é quase igual. Vale conferir.'),
  auto: t('Automatic', 'Automático'), autoHint: t('Forget the choice made by hand', 'Esquecer a escolha manual') };
const matched = ref('Spooler/Generic PLA @Snapmaker U1');
const inHand = ref<string | null>('b');
const savedLabels = { heading: t('Saved copy', 'Cópia salva'), open: t('Open in OrcaSlicer', 'Abrir no OrcaSlicer'), copyPath: t('Copy path', 'Copiar caminho'), copied: t('Copied', 'Copiado'), path: t('Saved at', 'Salvo em') };
const NOW = Date.now();
const icons = Object.entries(I) as [string, I.OuiIconData][];
const ART: [string, string, string, string][] = [
  ['Kobra Control', artKobra, t('Connect your Kobra X', 'Conecte sua Kobra X'), t('Enter its address in Settings to see the print here.', 'Informe o endereço nos Ajustes para ver a impressão aqui.')],
  ['U1 Control', artU1, t('No printer chosen yet', 'Nenhuma impressora escolhida'), t('Pick your U1 in Settings to see its four toolheads.', 'Escolha sua U1 nos Ajustes para ver as quatro cabeças.')],
  ['Spooler', artSpooler, t('No spools yet', 'Nenhuma bobina ainda'), t('Add one in Spoolman and refresh.', 'Adicione uma no Spoolman e atualize.')],
  ['Print Calculator', artCalc, t('Nothing to price yet', 'Nada para orçar ainda'), t('Slice a project in OrcaSlicer, then refresh.', 'Fatie um projeto no OrcaSlicer e atualize.')],
  ['Organizer', artOrganizer, t('Nothing arranged yet', 'Nada arrumado ainda'), t('Arrange packs the objects of the plate by their real outline.', 'Arrumar encaixa os objetos da placa pelo contorno real.')],
  ['Embedder', artEmbedder, t('No project loaded', 'Nenhum projeto carregado'), t('Load the open project to add a pocket.', 'Carregue o projeto aberto para adicionar um bolso.')],
];
const name = ref('Bench Kobra'); const confirm = ref(false); const saved = ref(false);
const tall = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="160"><rect width="40" height="160" fill="#2850a8"/></svg>');
const wide = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><rect width="200" height="80" fill="#d9692a"/></svg>');
</script>

<template>
  <OuiAppBar name="Orca UI 5"><template #mark><OuiIcon :icon="I.layers" :size="18" /></template><template #status><span>{{ t('Kit sheet · mock', 'Folha do kit · simulado') }} · {{ theme }}</span></template></OuiAppBar>
  <main class="oui-page kit">
   <div class="kit-grid">
    <template v-if="show('colour')">
      <OuiPanel class="kit-wide" :title="t('One page, six identities', 'Uma página, seis identidades')" :icon="I.layers" :meta="t('the plugin\'s hue is its mark and the line under the open tab; everything else is OrcaSlicer', 'o matiz do plugin é a marca e a linha sob a aba aberta; todo o resto é OrcaSlicer')">
        <ul class="kit-plugins">
          <li v-for="[label, mark, hue] in PLUGINS" :key="label" :style="pluginVars(hue)">
            <div class="kit-band"><span class="kit-mark" v-html="MARKS[mark]" /><strong>{{ label }}</strong><span class="kit-tab">{{ t('Dashboard', 'Painel') }}</span><span>{{ t('Settings', 'Ajustes') }}</span></div>
            <div class="kit-page">
              <div class="kit-card"><Button :label="t('Primary', 'Primária')" size="small" /><Button :label="t('Everyday', 'Comum')" severity="secondary" size="small" /><span class="oui-meta">{{ hue }}</span>
                <span class="kit-bar"><span /></span></div>
            </div>
          </li>
        </ul>
      </OuiPanel>
      <OuiPanel :title="t('Hues', 'Matizes')" :icon="I.drop" :meta="t('colour, tint, solid', 'cor, tom claro, sólido')">
        <ul class="kit-hues">
          <li v-for="hue in HUES" :key="hue" :data-tone="hue">
            <span class="kit-swatch" :style="{ background: roles[hue], color: roles['on' + hue[0].toUpperCase() + hue.slice(1)] }">Aa</span>
            <span class="kit-swatch kit-soft" :style="{ background: roles[hue + 'Soft'], color: roles[hue] }">Aa</span>
            <span class="kit-swatch" :style="{ background: roles[hue + 'Solid'], color: roles.onSolid }">Aa</span>
            <span class="oui-strong">{{ hue }}</span><span class="oui-meta oui-mono">{{ roles[hue] }}</span>
          </li>
        </ul>
      </OuiPanel>
      <OuiPanel :title="t('Meaning', 'Significado')" :icon="I.info" :meta="t('state colours and the hue of each domain', 'cores de estado e o matiz de cada assunto')">
        <div class="oui-stack">
          <ul class="kit-states-roles"><li v-for="[fg, bg, tone] in STATES" :key="fg"><span class="kit-swatch" :style="{ background: roles[bg], color: roles[fg] }">Aa</span><span class="oui-strong">{{ fg }}</span><span class="oui-chip" :data-tone="tone">{{ tone }}</span></li>
            <li><span class="kit-swatch" :style="{ background: roles.dangerSolid, color: roles.onDangerSolid }">Aa</span><span class="oui-strong">dangerSolid</span><span class="oui-meta">{{ t('confirm, emergency', 'confirmar, emergência') }}</span></li></ul>
          <ul class="kit-domains"><li v-for="[label, icon, tone] in DOMAINS" :key="label"><OuiIcon :icon="icon" tile :tone="tone" /><span>{{ label }}</span></li></ul>
          <div class="oui-row"><span v-for="m in ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PA-CF', 'PVA']" :key="m" class="oui-chip">{{ m }}</span>
            <span v-for="n in 4" :key="n" class="oui-slot-badge" :data-tool="n">T{{ n }}</span><span class="oui-slot-badge">2</span></div>
        </div>
      </OuiPanel>
      <OuiPanel :title="t('Surfaces, text and teal', 'Superfícies, texto e teal')" :icon="I.layers" :meta="t('OrcaSlicer\'s own, the same in every plugin', 'os do OrcaSlicer, iguais em todos os plugins')">
        <ul class="kit-roles"><li v-for="role in NEUTRALS" :key="role"><span class="kit-chip" :style="{ background: roles[role] }" /><span class="oui-strong">{{ role }}</span><span class="oui-meta oui-mono">{{ roles[role] }}</span></li></ul>
      </OuiPanel>
    </template>

    <!-- 5.0.4: crowded module headers. In a 380 px dock each wraps inside its panel instead of widening the page. -->
    <template v-if="state === 'heads'">
      <OuiPanel :title="t('Snapmaker U1', 'Snapmaker U1')" :icon="I.printer" data-test="head">
        <template #meta><OuiStatus state="busy">{{ t('Printing', 'Imprimindo') }}</OuiStatus></template>
        <template #actions><Button :label="t('Refresh', 'Atualizar')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.refresh" :size="13" /></template></Button>
          <Button :label="t('Apply to project', 'Aplicar ao projeto')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.check" :size="13" /></template></Button></template>
        <p class="oui-meta">{{ t('Title, state chip and two buttons.', 'Título, estado e dois botões.') }}</p>
      </OuiPanel>
      <!-- 5.0.5: the Spooler plate check. The title, (i) and both buttons fit on one line at 380 px; the state chip keeps its word and the actions go to the second line. -->
      <OuiPanel :title="t('This plate', 'Esta placa')" :icon="I.plate" tone="cobalt" :hint="t('Compares what this plate needs with what is loaded.', 'Compara o que esta placa precisa com o que está carregado.')" :hint-label="t('About the plate check', 'Sobre a conferência da placa')" data-test="head">
        <template #meta><OuiStatus state="warn">{{ t('1 needs attention', '1 precisa de atenção') }}</OuiStatus></template>
        <template #actions><Button :label="t('Check again', 'Conferir de novo')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.refresh" :size="13" /></template></Button>
          <Button :label="t('Dismiss', 'Dispensar')" severity="secondary" text size="small" /></template>
        <p class="oui-meta">{{ t('Title, hint, state chip and two buttons.', 'Título, dica, estado e dois botões.') }}</p>
      </OuiPanel>
      <OuiPanel :title="t('Camera', 'Câmera')" :icon="I.camera" tone="sky" :hint="t('Up to this many pictures a second.', 'Até este número de imagens por segundo.')" :hint-label="t('About the camera rate', 'Sobre a taxa da câmera')" data-test="head">
        <template #actions><Select :model-value="'30 fps'" :options="['5 fps', '15 fps', '30 fps']" size="small" :aria-label="t('Pictures a second', 'Imagens por segundo')" />
          <Button :label="t('Save picture', 'Salvar imagem')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.download" :size="13" /></template></Button>
          <Button :label="t('Stop camera', 'Parar câmera')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.cameraOff" :size="13" /></template></Button></template>
        <p class="oui-meta">{{ t('Title, hint, a select and two buttons.', 'Título, dica, uma lista e dois botões.') }}</p>
      </OuiPanel>
      <OuiPanel :title="t('Filament', 'Filamento')" :icon="I.spool" tone="magenta" :meta="t('ACE 1 · feeds the printer directly · 4 slots loaded', 'ACE 1 · alimenta a impressora direto · 4 slots carregados')" data-test="head">
        <template #actions><Button :label="t('Start drying', 'Iniciar secagem')" severity="secondary" size="small" /></template>
        <p class="oui-meta">{{ t('Title, a long meta line and one button: the meta gives way first.', 'Título, uma linha longa e um botão: a linha cede primeiro.') }}</p>
      </OuiPanel>
      <OuiPanel :title="t('A module title that is itself long enough to need the whole line', 'Um título de módulo longo o bastante para ocupar a linha toda')" :icon="I.settings" data-test="head">
        <template #actions><Button :label="t('Open', 'Abrir')" severity="secondary" size="small" /></template>
        <p class="oui-meta">{{ t('A long title and one button.', 'Um título longo e um botão.') }}</p>
      </OuiPanel>
    </template>

    <template v-if="state === 'art'">
      <OuiPanel class="kit-wide" :title="t('Empty and first-run illustrations', 'Ilustrações de vazio e primeiro uso')" :icon="I.eye" :meta="t('one per plugin · generated, 320 px WebP, 2 to 18 kB each', 'uma por plugin · geradas, WebP de 320 px, 2 a 18 kB cada')" flush>
        <div class="kit-art"><OuiEmpty v-for="[plugin, image, title, text] in ART" :key="plugin" :image="image" :title="title" :text="text"><template #actions><span class="oui-chip">{{ plugin }}</span></template></OuiEmpty></div>
      </OuiPanel>
      <OuiPanel class="kit-wide" :title="t('Identity marks', 'Marcas')" :icon="I.tag" :meta="t('Organizer and Spooler: generated, then redrawn as vector', 'Organizer e Spooler: geradas e redesenhadas em vetor')">
        <ul class="kit-marks"><li v-for="[label, mark, hue] in PLUGINS" :key="label" :style="pluginVars(hue)"><span class="kit-mark kit-mark-lg" v-html="MARKS[mark]" /><span class="kit-mark" v-html="MARKS[mark]" /><span class="kit-mark kit-mark-sm" v-html="MARKS[mark]" /><span class="oui-strong">{{ label }}</span></li></ul>
      </OuiPanel>
    </template>

    <template v-if="show('icons')">
      <OuiPanel class="kit-wide" :title="t('Icons', 'Ícones')" :icon="I.arrange" :meta="icons.length + ' · 24 px grid, 2 px round stroke · Lucide (ISC) + ' + t('11 drawn for the family', '11 desenhados para a família')">
        <ul class="kit-iconset"><li v-for="[label, icon] in icons" :key="label"><OuiIcon :icon="icon" :size="20" /><span class="oui-meta">{{ label }}</span></li></ul>
      </OuiPanel>
      <OuiPanel :title="t('Icon treatments', 'Tratamentos de ícone')" :icon="I.spool" tone="magenta" :meta="t('mono · toned · tile', 'mono · colorido · bloco')">
        <div class="oui-stack">
          <div class="oui-row kit-treat"><OuiIcon :icon="I.thermometer" :size="14" /><OuiIcon :icon="I.thermometer" /><OuiIcon :icon="I.thermometer" :size="20" />
            <OuiIcon :icon="I.thermometer" tone="orange" /><OuiIcon :icon="I.spool" tone="magenta" /><OuiIcon :icon="I.camera" tone="sky" /></div>
          <div class="oui-row kit-treat"><OuiIcon v-for="tone in ([...HUES, 'neutral'] as OuiTone[])" :key="tone" :icon="I.toolhead" tile :tone="tone" />
            <OuiIcon :icon="I.nozzle" :size="14" tile tone="orange" /><OuiIcon :icon="I.plate" :size="22" tile tone="cobalt" /></div>
          <div class="oui-row kit-treat"><OuiIcon v-for="icon in [I.spool, I.spoolman, I.nozzle, I.toolhead, I.bed, I.ace, I.slot, I.insert, I.plate, I.arrange, I.printer]" :key="icon[0][1].d ?? icon.length" :icon="icon" :size="20" tile tone="neutral" /></div>
        </div>
      </OuiPanel>
    </template>

    <template v-if="show('')">
      <OuiPanel :title="t('Type', 'Tipografia')" :icon="I.languages" tone="neutral">
        <ul class="kit-type"><li v-for="[token, spec, sample] in type" :key="token"><span class="oui-meta oui-mono">{{ spec }}</span><span class="oui-num" :style="{ fontSize: `var(${token})`, fontWeight: token.endsWith('md') || token.endsWith('sm') ? 400 : 600, lineHeight: 1.2 }">{{ sample }}</span></li>
          <li><span class="oui-meta oui-mono">11 / 600</span><span class="oui-label">{{ t('Label', 'Rótulo') }}</span></li></ul>
      </OuiPanel>

      <OuiPanel :title="t('Actions', 'Ações')" :icon="I.hand" :meta="t('one primary per view', 'uma primária por tela')">
        <div class="oui-stack">
          <div class="oui-row"><Button :label="t('Link to T1', 'Vincular a T1')" @click="confirm = true"><template #icon><OuiIcon :icon="I.link" :size="14" /></template></Button>
            <Button :label="t('Refresh', 'Atualizar')" severity="secondary"><template #icon><OuiIcon :icon="I.refresh" :size="14" /></template></Button><Button :label="t('Details', 'Detalhes')" severity="secondary" text />
            <Button :label="t('Stop print', 'Parar impressão')" severity="danger" outlined><template #icon><OuiIcon :icon="I.stop" :size="14" /></template></Button>
            <Button :label="t('Emergency stop', 'Parada de emergência')" severity="danger"><template #icon><OuiIcon :icon="I.power" :size="14" /></template></Button><Button :label="t('Unavailable', 'Indisponível')" disabled /></div>
          <div class="oui-row"><Button v-for="severity in ['secondary', 'info', 'success', 'warn']" :key="severity" :severity="severity" :label="severity" size="small" :data-focus-probe="severity" />
            <Button :label="t('Add pocket', 'Adicionar bolso')" outlined size="small" /><Button severity="secondary" text size="small" :aria-label="t('Refresh', 'Atualizar')"><template #icon><OuiIcon :icon="I.refresh" :size="14" /></template></Button></div>
          <div class="oui-row"><div class="oui-field"><label for="kit-name">{{ t('Printer name', 'Nome da impressora') }}</label><InputText id="kit-name" v-model="name" /></div>
            <div class="oui-field"><label for="kit-sel">{{ t('Material', 'Material') }}</label><Select input-id="kit-sel" :options="['PLA', 'PETG']" :placeholder="t('All materials', 'Todos os materiais')" /></div></div>
          <Message v-if="saved" severity="success">{{ t('Mock link done.', 'Vínculo simulado concluído.') }}</Message>
        </div>
      </OuiPanel>

      <OuiPanel :title="t('States', 'Estados')" :icon="I.circleCheck" :meta="t('one mark and one colour each', 'uma marca e uma cor para cada')">
        <div class="oui-stack">
          <div class="oui-row kit-states"><OuiStatus v-for="[state, label] in states" :key="state" :state="state" variant="badge">{{ label }}</OuiStatus></div>
          <div class="oui-row kit-states"><OuiStatus v-for="[state, label] in states" :key="state" :state="state" variant="plain">{{ label }}</OuiStatus></div>
          <OuiBanner tone="info" :title="t('The printer is busy printing.', 'A impressora está ocupada imprimindo.')">{{ t('Loading and linking are off until it finishes.', 'Carregar e vincular ficam desligados até terminar.') }}</OuiBanner>
          <OuiBanner tone="warn" :title="t('Stock was read 5 min ago.', 'O estoque foi lido há 5 min.')">{{ t('Refresh before choosing a spool.', 'Atualize antes de escolher a bobina.') }}<template #actions><Button :label="t('Refresh', 'Atualizar')" severity="secondary" size="small" /></template></OuiBanner>
          <OuiBanner tone="error" :title="t('Command not confirmed.', 'Comando não confirmado.')">{{ t('Check the printer before trying again.', 'Confira a impressora antes de tentar de novo.') }}</OuiBanner>
          <ProgressBar mode="indeterminate" :aria-label="t('Mock progress', 'Progresso simulado')" />
        </div>
      </OuiPanel>

      <OuiPanel :title="t('Objects and data', 'Objetos e dados')" :icon="I.spool" tone="magenta">
        <div class="oui-row kit-spools">
          <OuiSpool v-for="f in [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.08]" :key="f" color="#2fa36b" :fraction="f" :size="56" />
          <OuiSpool :colors="['#e5484d', '#f5d90a', '#3e63dd']" direction="coaxial" :fraction="0.9" :size="56" />
          <OuiSpool :colors="['#e5484d', '#f5d90a', '#3e63dd']" direction="longitudinal" :fraction="0.9" :size="56" />
        </div>
        <div class="oui-row kit-objects">
          <OuiSpool color="#d9692a" :fraction="1" :size="56" /><OuiSpool color="#2850a8" :fraction="0.5" :size="56" /><OuiSpool color="#111111" :fraction="0.2" :size="56" /><OuiSpool color="#f4f4f1" :fraction="0.8" :size="56" />
          <OuiSpool :colors="['#7a5cff', '#22c1c3', '#fdbb2d']" :fraction="0.7" :size="56" /><OuiSpool :fraction="0" :size="56" /><OuiSpool :fraction="null" :size="56" />
          <OuiSpool color="#2850a8" :fraction="null" :size="56" /><OuiSpool :colors="['#e5484d', '#f5d90a', '#3e63dd']" :fraction="null" :size="40" />
          <!-- 5.14: black and charcoal at the size of a table row: a clear rim on the dark theme. -->
          <OuiSpool color="#111111" :fraction="0.9" :size="28" /><OuiSpool color="#1a1a1a" :fraction="0.5" :size="28" /><OuiSpool color="#2b2b2b" :fraction="0.2" :size="28" /><OuiSpool color="#2850a8" :fraction="0.9" :size="28" />
          <OuiSwatch color="#2850a8" :size="16" /><OuiSwatch color="#111111" :size="16" /><OuiSwatch color="#ffffff" :size="16" /><OuiSwatch :size="16" />
          <OuiThumb :src="tall" :size="48" /><OuiThumb :src="wide" :size="48" /><OuiThumb :size="48" />
        </div>
        <div class="kit-levels"><OuiLevel :fraction="0.72" /><OuiLevel :fraction="0.08" tone="low" /><OuiLevel :fraction="0.02" tone="critical" /><OuiLevel :fraction="null" /></div>
        <div class="oui-row kit-readouts">
          <OuiReadout :icon="I.nozzle" tone="orange" :label="t('Nozzle', 'Bico')" value="219.6" unit="°C" :sub="t('Target 220 °C', 'Alvo 220 °C')" />
          <OuiSpark :values="[24, 60, 121, 178, 212, 222, 219, 220.4, 219.6]" tone="orange" :label="t('Nozzle temperature', 'Temperatura do bico')" />
          <OuiSpark type="bars" :values="[38, 52, 0, 61, 44, 47, 22, 96]" tone="magenta" :label="t('Grams per week', 'Gramas por semana')" />
          <OuiReadout :icon="I.drop" tone="sky" :label="t('Humidity', 'Umidade')" :value="null" unit="%" :sub="t('No sensor', 'Sem sensor')" />
          <OuiReadout :label="t('Suggested price', 'Preço sugerido')" value="R$ 24.00" size="lg" incomplete :sub="t('partial', 'parcial')" />
        </div>
      </OuiPanel>

      <OuiPanel :title="t('Slots', 'Slots')" :icon="I.slot" tone="magenta" :meta="t('built-in amount · #amount: percent only · #amount: nothing · empty · amount unknown', 'quantidade padrão · #amount: só percentual · #amount: nada · vazio · quantidade desconhecida')">
        <div class="oui-cards" style="--oui-cards-4: 9999px">
          <OuiSlot label="1" name="PLA Matte - Charcoal Black" material="PLA · Generic" color="#111111" :remaining="1380" :initial="2000" :empty-label="t('Empty', 'Vazio')" />
          <OuiSlot label="A2" name="PETG HF - Cobalt Blue" material="PETG · AMS" color="#2850a8" :remaining="64" :initial="100" :empty-label="t('Empty', 'Vazio')">
            <template #amount><div class="oui-slot-amount"><p class="oui-num"><strong>64 %</strong></p><OuiLevel :fraction="0.64" /></div></template>
          </OuiSlot>
          <OuiSlot label="A3" name="PLA+ - Burnt Orange" material="PLA · AMS" color="#d9692a" :empty-label="t('Empty', 'Vazio')"><template #amount /></OuiSlot>
          <OuiSlot label="A4" :empty-label="t('Empty', 'Vazio')"><template #amount><p>never shown</p></template></OuiSlot>
          <OuiSlot label="T2" :tool="2" name="PETG - Blue" material="PETG" color="#2850a8" :empty-label="t('Empty', 'Vazio')" :unknown-label="t('Weight unknown', 'Peso desconhecido')" />
        </div>
      </OuiPanel>

      <OuiPanel :title="t('Preset match', 'Preset escolhido')" :icon="I.spool" tone="magenta" :meta="t('clear pick · close call, open: names only, no score, no reasons', 'escolha clara · escolha apertada, aberta: só nomes, sem nota, sem motivos')">
        <div class="oui-cards" style="--oui-cards-4: 9999px">
          <OuiPresetMatch name="_local/spooler/Polymaker PLA Matte @Snapmaker U1" confident :candidates="[]" :labels="matchLabels" data-test="match-sure" />
          <OuiPresetMatch :name="matched" :confident="false" remembered data-test="match-unsure" :labels="matchLabels" @pick="matched = $event ?? 'Generic PLA @Snapmaker U1'"
            :candidates="[{ name: 'Spooler/Generic PLA @Snapmaker U1' }, { name: 'Generic PLA Silk @Snapmaker U1' }, { name: 'Generic PLA @BBL X1C' }, { name: 'Generic PLA @Snapmaker U1' },
                          { name: 'Polymaker PLA Matte @Snapmaker U1', disabled: true, note: t('Made for another nozzle', 'Feito para outro bico') }]" />
          <!-- 5.14.1: one line, the name is the Change trigger. -->
          <OuiPresetMatch inline name="_local/spooler/3D Procer PLA Verde escuro @Snapmaker U1" :confident="false" :labels="matchLabels" data-test="match-inline"
            :candidates="[{ name: '_local/spooler/3D Procer PLA Verde escuro @Snapmaker U1' }, { name: 'Generic PLA @Snapmaker U1' }]" />
        </div>
      </OuiPanel>

      <OuiPanel :title="t('Saved copy', 'Cópia salva')" :icon="I.save" tone="sky" :meta="t('opened · could not be opened: the path shows', 'aberta · não abriu: o caminho aparece')">
        <div class="oui-cards" style="--oui-cards-4: 9999px">
          <OuiSavedCopy :title="t('Desk organizer · plate 2 arranged', 'Organizador de mesa · placa 2 arrumada')" :meta="relativeTime(NOW - 3 * 60_000)" file="desk-organizer-arranged-20261111-195500-1f3ffe.3mf"
            path="$HOME/Library/Application Support/OrcaSlicer/plugins/storage/desk-organizer-arranged-20261111-195500-1f3ffe.3mf" :labels="savedLabels"
            :status="t('OrcaSlicer was asked to open the copy.', 'O OrcaSlicer foi chamado para abrir a cópia.')" data-test="saved-ok">
            <p>{{ t('Rotation was limited to 90° steps.', 'A rotação ficou limitada a passos de 90°.') }}</p>
          </OuiSavedCopy>
          <OuiSavedCopy :title="t('Desk organizer · 3 pockets added', 'Organizador de mesa · 3 bolsos adicionados')" :meta="relativeTime(NOW - 26 * 3_600_000)" failed
            path="$HOME/Library/Application Support/OrcaSlicer/plugins/storage/desk-organizer-pockets-20261110-101500-9a2c41.3mf" :labels="savedLabels"
            :status="t('OrcaSlicer could not open the copy. Open it from this folder:', 'O OrcaSlicer não abriu a cópia. Abra a partir desta pasta:')" data-test="saved-failed" />
          <!-- 5.14.1: already asked (Open is secondary), the status as a warning, no heading, no card of its own. -->
          <OuiSavedCopy :title="t('Desk organizer · plate 2 arranged', 'Organizador de mesa · placa 2 arrumada')" asked bare open-id="kit-open" status-state="warn" data-test="saved-asked"
            :labels="{ open: t('Open again', 'Abrir de novo') }" :status="t('OrcaSlicer has unsaved changes: save or discard them, then open the copy.', 'O OrcaSlicer tem alterações não salvas: salve ou descarte e abra a cópia.')" />
        </div>
      </OuiPanel>

      <OuiPanel :title="t('Rows and a plain table', 'Linhas e uma tabela simples')" :icon="I.list" tone="neutral" flush :meta="t('OuiListRow selectable · .oui-table', 'OuiListRow selecionável · .oui-table')">
        <ul class="oui-list" data-test="rows">
          <OuiListRow v-for="[key, name, where] in [['a', '20 × 10 × 3 mm block', t('Lid · 2 mm under the top', 'Tampa · 2 mm abaixo do topo')], ['b', 'Ø30 × 0.5 mm disc', t('Base · on the bed', 'Base · na mesa')]]" :key="key"
            selectable :selected="inHand === key" @update:selected="inHand = $event ? key : null">
            <OuiIcon :icon="I.magnet" :size="16" tile tone="lime" /><span style="display: grid"><span class="oui-strong">{{ name }}</span><span class="oui-meta">{{ where }}</span></span>
            <template #actions><Button text severity="danger" size="small" :aria-label="t('Remove', 'Remover')"><template #icon><OuiIcon :icon="I.trash" :size="14" /></template></Button></template>
          </OuiListRow>
        </ul>
        <div class="oui-table-wrap"><table class="oui-table" data-dense>
          <thead><tr><th>{{ t('Filament', 'Filamento') }}</th><th class="oui-num">{{ t('Spools', 'Bobinas') }}</th><th class="oui-num">{{ t('Remaining', 'Restante') }}</th></tr></thead>
          <tbody><tr><td>PLA Galaxy Black</td><td class="oui-num">2</td><td class="oui-num">1.52 kg</td></tr><tr><td>PETG Blue</td><td class="oui-num">2</td><td class="oui-num">340 g</td></tr></tbody>
        </table></div>
      </OuiPanel>

      <OuiPanel :title="t('Nothing to show', 'Nada a mostrar')" :icon="I.box" tone="neutral" flush>
        <div class="kit-empties">
          <OuiEmpty :icon="I.spool" tone="magenta" :title="t('No spools yet', 'Nenhuma bobina ainda')" :text="t('Add one in Spoolman and refresh.', 'Adicione uma no Spoolman e atualize.')"><template #actions><Button :label="t('Refresh', 'Atualizar')" severity="secondary" size="small" /></template></OuiEmpty>
          <OuiEmpty state="loading" :title="t('Reading stock', 'Lendo o estoque')" />
          <OuiEmpty state="error" :title="t('Spoolman did not answer', 'O Spoolman não respondeu')" :text="t('Check its address in Settings.', 'Confira o endereço nos Ajustes.')"
            details="[Errno 61] Connection refused" :details-label="t('Technical details', 'Detalhes técnicos')" />
          <OuiEmpty compact state="offline" :title="t('No status yet', 'Sem status ainda')" />
        </div>
      </OuiPanel>
    </template>
   </div>
  </main>
  <OuiConfirm v-model:visible="confirm" :title="t('Link this spool to T1?', 'Vincular esta bobina a T1?')" :confirm-label="t('Link to T1', 'Vincular a T1')" :cancel-label="t('Back', 'Voltar')" @confirm="saved = true; confirm = false">
    <p>{{ t('This page is a mock and sends no commands.', 'Esta página é simulada e não envia comandos.') }}</p>
  </OuiConfirm>
</template>

<style>
.kit-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: var(--oui-s3); align-items: start; }
.kit-wide { grid-column: 1 / -1; }
.kit-plugins { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: var(--oui-s3); }
.kit-plugins > li { overflow: hidden; border-radius: var(--oui-radius-lg); background: var(--oui-background); box-shadow: 0 0 0 1px var(--oui-border); }
.kit-band { display: flex; align-items: stretch; gap: var(--oui-s3); min-height: 40px; padding: 0 var(--oui-s3); font-size: var(--oui-text-sm); font-weight: 600; color: var(--oui-muted); background: var(--oui-surface); box-shadow: inset 0 -1px 0 var(--oui-border); }
.kit-band > * { display: flex; align-items: center; }
.kit-band > strong { margin-inline-end: auto; font-size: var(--oui-text-md); font-weight: 700; color: var(--oui-text); }
.kit-tab { color: var(--oui-text); box-shadow: inset 0 -2px 0 var(--oui-accent); }
.kit-mark { align-self: center; display: grid; place-items: center; width: 24px; height: 24px; border-radius: var(--oui-radius-lg); color: var(--oui-on-solid); background: var(--oui-accent-solid); }
.kit-mark svg { display: block; width: 16px; height: 16px; }
.kit-art { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.kit-marks { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oui-s4); }
.kit-marks > li { display: flex; align-items: center; gap: var(--oui-s3); }
.kit-mark-lg { width: 56px; height: 56px; border-radius: var(--oui-radius-xl); }
.kit-mark-lg svg { width: 36px; height: 36px; }
.kit-mark-sm { width: 18px; height: 18px; border-radius: var(--oui-radius-sm); }
.kit-mark-sm svg { width: 12px; height: 12px; }
.kit-page { display: grid; gap: var(--oui-s2); padding: var(--oui-s2); }
.kit-card { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2); padding: var(--oui-s3); border-radius: var(--oui-radius); background: var(--oui-surface); box-shadow: inset 0 0 0 1px var(--oui-border); }
.kit-card > .oui-meta { margin-inline-start: auto; }
.kit-bar { flex: 1 0 100%; height: 8px; border-radius: 4px; background: var(--oui-border); overflow: hidden; }
.kit-bar > span { display: block; width: 62%; height: 100%; border-radius: 4px; background: var(--oui-primary-mark); }
.kit-hues { list-style: none; padding: 0; display: grid; gap: var(--oui-s2); }
.kit-hues > li, .kit-states-roles > li { display: grid; grid-template-columns: repeat(3, 36px) minmax(0, 1fr) auto; align-items: center; gap: var(--oui-s2); }
.kit-states-roles { list-style: none; padding: 0; display: grid; gap: var(--oui-s2); }
.kit-states-roles > li { grid-template-columns: 36px minmax(0, 1fr) auto; }
.kit-swatch { display: grid; place-items: center; height: 28px; border-radius: var(--oui-radius); font-size: var(--oui-text-sm); font-weight: 700; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--oui-text) 14%, transparent); }
.kit-domains { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--oui-s2); }
.kit-domains > li { display: flex; align-items: center; gap: var(--oui-s2); }
.kit-roles { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--oui-s2) var(--oui-s3); }
.kit-roles > li { display: grid; grid-template-columns: 28px minmax(0, 1fr); column-gap: var(--oui-s2); align-items: center; }
.kit-chip { grid-row: span 2; width: 28px; height: 28px; border-radius: var(--oui-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--oui-text) 24%, transparent); }
.kit-iconset { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: var(--oui-s3) var(--oui-s2); }
.kit-iconset > li { display: grid; justify-items: center; gap: 4px; padding: var(--oui-s2) 2px; border-radius: var(--oui-radius); background: var(--oui-raised); text-align: center; overflow-wrap: anywhere; }
.kit-treat { gap: var(--oui-s3); }
.kit-type { list-style: none; padding: 0; display: grid; gap: var(--oui-s2); }
.kit-type > li { display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: baseline; gap: var(--oui-s3); }
.kit-states { gap: var(--oui-s2) var(--oui-s4); }
.kit-objects, .kit-spools { gap: var(--oui-s3); }
.kit-levels { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--oui-s3); margin-block: var(--oui-s4); }
.kit-readouts { gap: var(--oui-s3) var(--oui-s6); align-items: center; }
.kit-empties { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
</style>
