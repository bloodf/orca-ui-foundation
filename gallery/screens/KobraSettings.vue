<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { OuiBanner, OuiFormRow, OuiFormSection, OuiIcon, OuiKeyValue, OuiSaveBar, OuiSettingsPages, OuiStatus, OuiToastHost, useToast } from '../../src/components';
import { UI_VERSION } from '../../src';
import * as I from '../../src/icons';
import { t } from '../i18n';
import PrinterBar from '../v5/PrinterBar.vue';

// MOCK — Kobra Control settings: section tabs, one section at a time, one save bar (OuiSettingsPages, OuiSaveBar).
// state: '' (two fields changed) | 'clean' (nothing to save: Save and Discard are off) | 'stack' (a small plugin's
// settings: every section on one page, no list) | 'banner' (a banner over the page that leaves after a moment: the
// save bar follows the page back down).
const props = defineProps<{ state: string }>();
// A toast while the save bar is up: the stack sits above the bar (OuiSettings lifts it), never under it.
const toast = useToast();
onMounted(() => toast.show({ tone: 'success', title: t('Certificate found.', 'Certificado encontrado.'), body: 'Anycubic Slicer Next', timeout: 0 }));
const sections = [
  { id: 'connection', label: t('Connection', 'Conexão'), icon: I.link },
  { id: 'certificate', label: t('Certificate', 'Certificado'), icon: I.shieldCheck },
  { id: 'print', label: t('Print setup', 'Preparo da impressão'), icon: I.printer },
  { id: 'camera', label: t('Camera', 'Câmera'), icon: I.camera, state: 'warn' as const },
  { id: 'spoolman', label: 'Spoolman', icon: I.spoolman },
  { id: 'interface', label: t('Interface', 'Interface'), icon: I.languages },
  { id: 'about', label: t('About', 'Sobre'), icon: I.info },
];
const name = ref('Bench Kobra'); const host = ref('192.168.1.50'); const language = ref('auto'); const refresh = ref(30);
// What is stored: the two fields differ from it unless state=clean.
const stored = ref(props.state === 'clean' ? { name: name.value, host: host.value } : { name: 'Kobra', host: '192.168.1.49' });
const changed = computed(() => [name.value !== stored.value.name && t('Printer name', 'Nome da impressora'), host.value !== stored.value.host && t('Address', 'Endereço')].filter(Boolean).join(', '));
const waiting = ref(props.state === 'banner');
onMounted(() => { if (waiting.value) setTimeout(() => { waiting.value = false; }, 700); });
const leveling = ref(true); const vibration = ref(true); const camera = ref(true); const ffmpeg = ref('');
const spoolman = ref('http://192.168.1.10:7912'); const auto = ref(true); const report = ref(true);
</script>

<template>
  <PrinterBar plugin="kobra" tab="settings" state="ok" :state-label="t('Connected', 'Conectada')" />
  <div v-if="state === 'banner'" style="padding: 12px 16px 0"><OuiBanner :show="waiting" tone="info" :title="t('Saving: waiting for the plugin…', 'Salvando: aguardando o plugin…')" data-test="waiting" /></div>
  <OuiSettingsPages :sections="sections" :nav-label="t('Settings sections', 'Seções dos ajustes')" :back-label="t('Back', 'Voltar')" :error-label="t('has an error', 'tem um erro')" :layout="state === 'stack' ? 'stack' : undefined">
    <div class="oui-stack">
      <OuiFormSection id="connection" :icon="I.link" tone="cobalt" :title="t('Connection', 'Conexão')"
        :description="t('Kobra Control talks to the printer on your network. It never uses the cloud.', 'O Kobra Control fala com a impressora pela sua rede. Nunca usa a nuvem.')">
        <template #status><OuiStatus state="ok">{{ t('Answering · firmware 1.0', 'Respondendo · firmware 1.0') }}</OuiStatus></template>
        <OuiFormRow :label="t('Printer name', 'Nome da impressora')" for="ks-name"><InputText id="ks-name" v-model="name" /></OuiFormRow>
        <OuiFormRow :label="t('Address', 'Endereço')" for="ks-host" :hint="t('IP address or host name', 'Endereço IP ou nome na rede')">
          <InputText id="ks-host" v-model="host" class="oui-mono" /><Button :label="t('Test', 'Testar')" severity="secondary"><template #icon><OuiIcon :icon="I.plug" :size="14" /></template></Button>
        </OuiFormRow>
      </OuiFormSection>

      <OuiFormSection id="certificate" :icon="I.shieldCheck" tone="teal" :title="t('Certificate', 'Certificado')"
        :description="t('The printer only accepts a connection signed with Anycubic\'s certificate, read from a slicer installed on this computer.', 'A impressora só aceita conexões assinadas com o certificado da Anycubic, lido de um fatiador instalado neste computador.')">
        <template #status><OuiStatus state="ok">{{ t('Found', 'Encontrado') }}</OuiStatus></template>
        <OuiFormRow :label="t('Source', 'Origem')"><span>Anycubic Slicer Next</span><Button :label="t('Look again', 'Procurar de novo')" severity="secondary"><template #icon><OuiIcon :icon="I.search" :size="14" /></template></Button></OuiFormRow>
      </OuiFormSection>

      <OuiFormSection id="print" :icon="I.printer" :title="t('Print setup', 'Preparo da impressão')"
        :description="t('Defaults for prints sent from OrcaSlicer. You can change them for one print in the print window.', 'Padrões para impressões enviadas do OrcaSlicer. Dá para mudar em uma impressão na janela de envio.')">
        <OuiFormRow :label="t('Auto bed leveling', 'Nivelamento automático')" for="ks-level"><ToggleSwitch v-model="leveling" input-id="ks-level" /></OuiFormRow>
        <OuiFormRow :label="t('Vibration compensation', 'Compensação de vibração')" for="ks-vib"><ToggleSwitch v-model="vibration" input-id="ks-vib" /></OuiFormRow>
      </OuiFormSection>
    </div>

    <div class="oui-stack">
      <OuiFormSection id="camera" :icon="I.camera" tone="sky" :title="t('Camera', 'Câmera')">
        <template #status><OuiStatus state="warn">{{ t('ffmpeg not found', 'ffmpeg não encontrado') }}</OuiStatus></template>
        <OuiFormRow :label="t('Show the camera', 'Mostrar a câmera')" for="ks-cam"><ToggleSwitch v-model="camera" input-id="ks-cam" /></OuiFormRow>
        <OuiFormRow :label="t('ffmpeg program', 'Programa ffmpeg')" for="ks-ffmpeg" :hint="t('Leave empty to search the system', 'Deixe vazio para procurar no sistema')"
          :error="t('No ffmpeg on this computer. Install it or give its path.', 'Não há ffmpeg neste computador. Instale ou informe o caminho.')">
          <InputText id="ks-ffmpeg" v-model="ffmpeg" class="oui-mono" placeholder="/opt/homebrew/bin/ffmpeg" invalid /><Button :label="t('Choose…', 'Escolher…')" severity="secondary"><template #icon><OuiIcon :icon="I.folder" :size="14" /></template></Button>
        </OuiFormRow>
      </OuiFormSection>

      <OuiFormSection id="spoolman" :icon="I.spoolman" tone="magenta" title="Spoolman"
        :description="t('Links slots to spools and books the filament each print used.', 'Vincula slots a bobinas e registra o filamento usado em cada impressão.')">
        <template #status><OuiStatus state="ok">{{ t('Same as Spooler', 'O mesmo do Spooler') }}</OuiStatus></template>
        <OuiFormRow :label="t('Use Spooler\'s address', 'Usar o endereço do Spooler')" for="ks-auto"><ToggleSwitch v-model="auto" input-id="ks-auto" /></OuiFormRow>
        <OuiFormRow :label="t('Spoolman address', 'Endereço do Spoolman')" for="ks-spoolman"><InputText id="ks-spoolman" v-model="spoolman" class="oui-mono" :disabled="auto" /></OuiFormRow>
        <OuiFormRow :label="t('Book filament use', 'Registrar consumo de filamento')" for="ks-report" :hint="t('When a print finishes', 'Quando a impressão termina')"><ToggleSwitch v-model="report" input-id="ks-report" /></OuiFormRow>
        <OuiFormRow :label="t('Read the stock every', 'Ler o estoque a cada')" for="ks-refresh"><InputNumber v-model="refresh" input-id="ks-refresh" :min="5" :max="600" suffix=" s" /></OuiFormRow>
      </OuiFormSection>

      <OuiFormSection id="interface" :icon="I.languages" tone="neutral" :title="t('Interface', 'Interface')">
        <OuiFormRow :label="t('Language', 'Idioma')" for="ks-lang">
          <Select v-model="language" input-id="ks-lang" option-label="label" option-value="value"
            :options="[{ value: 'auto', label: t('Same as OrcaSlicer', 'O mesmo do OrcaSlicer') }, { value: 'en', label: 'English' }, { value: 'pt_BR', label: 'Português (Brasil)' }]" />
        </OuiFormRow>
      </OuiFormSection>

      <OuiFormSection id="about" :icon="I.info" tone="neutral" :title="t('About', 'Sobre')">
        <div class="ks-about">
          <OuiKeyValue :items="[{ label: 'Kobra Control', value: '0.2.0' }, { label: t('Interface kit', 'Kit de interface'), value: UI_VERSION }, { label: 'Spooler', value: '0.20.1' }]" />
          <Button :label="t('Licences', 'Licenças')" severity="secondary" text size="small"><template #icon><OuiIcon :icon="I.external" :size="14" /></template></Button>
        </div>
      </OuiFormSection>
    </div>

    <template #footer>
      <OuiSaveBar :dirty="!!changed" :changed="changed" :labels="{ unsaved: t('Unsaved changes', 'Alterações não salvas'), discard: t('Discard', 'Descartar'), save: t('Save settings', 'Salvar ajustes') }"
        @save="stored = { name, host }" @discard="name = stored.name; host = stored.host" />
    </template>
  </OuiSettingsPages>
  <OuiToastHost :close-label="t('Close', 'Fechar')" />
</template>

<style>
.ks-about { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--oui-s3); padding: var(--oui-s3) var(--oui-s4) var(--oui-s4); }
</style>
