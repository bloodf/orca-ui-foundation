<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { OuiBanner, OuiCamera, OuiControlRow, OuiEmpty, OuiHint, OuiIcon, OuiJob, OuiKeyValue, OuiPageHeader, OuiPanel, OuiReadout, OuiSetpoint, OuiSlot, OuiStatus } from '../../src/components';
import * as I from '../../src/icons';
import { lang, t } from '../i18n';
import PrinterBar from '../v5/PrinterBar.vue';
import PrinterU1 from '../art/PrinterU1.vue';
import '../art/art.css';
import setupArt from '../../assets/illustrations/u1-toolheads.webp';
import { CAMERA_43, SPOOLS, spool } from '../v5/data';
// MOCK — U1 Control dashboard, 5.0: page header, compact status block, then the module grid (work on the left, watch on the right).
// state: '' (printing) | 'loading' (first read of the printer) | 'setup' (no printer chosen yet) | 'refused' (the printer refused a bed target).
// 5.0.3: the bed row uses OuiSetpoint's opt-in props (inputId, validate, offAlways, error); the nozzle rows are the plain ones.
const props = defineProps<{ state: string }>();
const setup = props.state === 'setup'; const loading = props.state === 'loading';
const busy = 'u1-busy';
const heads = [
  { n: 1 as const, id: 9, temp: 221, target: 220, history: [24, 60, 121, 178, 212, 222, 219, 220.4, 221], active: true },
  { n: 2 as const, id: 44, temp: 33, target: 0, history: [33, 33, 33, 33, 33, 33] },
  { n: 3 as const, id: 35, temp: 33, target: 0, history: [33, 33, 33, 33, 33, 33] },
  { n: 4 as const, id: 28, temp: 33, target: 0, history: [61, 48, 39, 35, 34, 33] },
];
const options = SPOOLS.map(s => ({ id: s.id, label: `#${s.id} ${s.vendor} ${s.name} · ${s.material}` }));
const frames = ref(0); const bedSets = ref<number[]>([]); const t2Sets = ref<number[]>([]);
// A status tick, as the printer sends every 2 s: every reading moves a little. The page tests call it while a field is being typed in.
const drift = ref(0);
(window as unknown as { __u1: { tick(): void } }).__u1 = { tick: () => { drift.value = +(drift.value + 0.1).toFixed(1); } };
const bedField = { 'data-test': 'bed-field' };
// T3 is judged while it is typed: the page hears every keystroke (v-model:draft) and says at once what it will not send.
const t3Draft = ref<number | null>(null);
const t3Over = computed(() => t3Draft.value != null && t3Draft.value > 320);
const heatOk = () => true;   // stands for the page's own confirmation; with `validate` the field does not clamp
// Refuses what the bed cannot do, in the page's words, instead of letting the field clamp it.
const bedLimit = (value: number) => (value < 0 || value > 110 ? t(`The bed takes 0 to 110 °C; ${value} °C was not sent.`, `A mesa aceita de 0 a 110 °C; ${value} °C não foi enviado.`) : true);
const speed = ref(100); const cover = ref<string | null>(null); const light = ref(true); const fps = ref(30);
</script>
<template>
  <PrinterBar plugin="u1" tab="dashboard" :state="setup ? 'idle' : loading ? 'connecting' : 'busy'" :state-label="setup ? t('No printer', 'Sem impressora') : loading ? t('Connecting', 'Conectando') : undefined" />
  <main v-if="setup" class="oui-page">
    <OuiPanel flush>
      <OuiEmpty :image="setupArt" :title="t('No printer chosen yet', 'Nenhuma impressora escolhida')"
        :text="t('Pick your Snapmaker U1 in Settings. Its toolheads, print and camera appear here.', 'Escolha sua Snapmaker U1 nos Ajustes. As cabeças, a impressão e a câmera aparecem aqui.')">
        <template #actions><Button :label="t('Open settings', 'Abrir ajustes')"><template #icon><OuiIcon :icon="I.settings" :size="14" /></template></Button>
          <Button :label="t('Find printers on the network', 'Procurar impressoras na rede')" severity="secondary"><template #icon><OuiIcon :icon="I.search" :size="14" /></template></Button></template>
      </OuiEmpty>
    </OuiPanel>
  </main>
  <main v-else class="oui-page" role="tabpanel" aria-labelledby="oui-tab-dashboard">
    <OuiPageHeader title="Snapmaker U1" :meta="loading ? undefined : '192.168.1.60 · Extended firmware 2.0.0-paxx12-24'">
      <template v-if="loading" #meta><span class="oui-skeleton" style="display: inline-block; width: 220px" /></template>
      <template #actions>
        <OuiHint end :label="t('About applying to the project', 'Sobre aplicar ao projeto')">{{ t('Picks the matching OrcaSlicer filament profile and colour for each project slot from the loaded spools and RFID tags.', 'Escolhe o perfil de filamento e a cor do OrcaSlicer para cada slot do projeto a partir das bobinas carregadas e das etiquetas RFID.') }}</OuiHint>
        <Button :label="t('Apply to project filaments', 'Aplicar aos filamentos do projeto')" severity="secondary" :disabled="loading"><template #icon><OuiIcon :icon="I.check" :size="14" /></template></Button>
      </template>
    </OuiPageHeader>
    <OuiBanner v-if="!loading" :id="busy" tone="info" :title="t('The printer is busy.', 'A impressora está ocupada.')" dismissible dismiss-key="u1-busy-v5" :close-label="t('Close', 'Fechar')">
      {{ t('Loading, unloading, calibration and stock links are off until it is idle.', 'Carregar, descarregar, calibração e vínculos de estoque ficam desligados até ela ficar ociosa.') }}
    </OuiBanner>

    <div class="oui-dash">
      <OuiPanel class="oui-dash-top">
        <div v-if="loading" class="u1-skel" aria-busy="true"><span class="oui-skeleton" style="width: 72px; height: 72px" /><div class="oui-stack"><span class="oui-skeleton" style="width: 40%" /><span class="oui-skeleton" style="width: 70%" /><span class="oui-skeleton" style="width: 100%; height: 8px" /></div></div>
        <OuiJob v-else name="kobra/CHROMA_V8_50_slots_pull_tray_PLA_84.4g_2h52m.gcode" :progress="77" :detail="t('Layer 69 of 240 · T1 · PLA', 'Camada 69 de 240 · T1 · PLA')" :progress-label="t('Print progress', 'Progresso da impressão')">
          <template #thumb><PrinterU1 :active="1" :progress="77" :size="54" /></template>
          <template #status><OuiStatus state="busy">{{ t('Printing', 'Imprimindo') }}</OuiStatus></template>
          <OuiReadout size="sm" :label="t('Elapsed', 'Decorrido')" value="2 h 29 min" />
          <OuiReadout size="sm" :label="t('Left (estimate)', 'Restante (estimado)')" value="44 min" />
          <OuiReadout size="sm" :label="t('Finishes', 'Termina')" value="5:41 PM" />
          <template #actions>
            <Button :label="t('Pause', 'Pausar')" severity="secondary"><template #icon><OuiIcon :icon="I.pause" :size="14" /></template></Button>
            <Button :label="t('Cancel print', 'Cancelar impressão')" severity="danger" outlined><template #icon><OuiIcon :icon="I.x" :size="14" /></template></Button>
          </template>
        </OuiJob>
      </OuiPanel>

      <div class="oui-dash-main">
        <OuiPanel :title="t('Toolheads', 'Cabeças')" :icon="I.toolhead" tone="magenta" :meta="loading ? undefined : t('4 loaded · Spoolman through the printer', '4 carregadas · Spoolman pela impressora')">
          <div v-if="loading" class="oui-cards" aria-busy="true"><div v-for="n in 4" :key="n" class="u1-skelcard"><span class="oui-skeleton" style="width: 30%" /><span class="oui-skeleton" style="width: 80%" /><span class="oui-skeleton" style="width: 55%" /></div></div>
          <div v-else class="oui-cards">
            <OuiSlot v-for="h in heads" :key="h.n" :label="'T' + h.n" :tool="h.n" :name="spool(h.id).name" :material="spool(h.id).material" :color="spool(h.id).colour"
              :remaining="spool(h.id).remaining" :initial="spool(h.id).initial" :active="h.active" :empty-label="t('Empty', 'Vazia')">
              <template v-if="h.active" #state><OuiStatus state="busy">{{ t('Printing', 'Imprimindo') }}</OuiStatus></template>
              <template #meta>{{ spool(h.id).material }} · {{ spool(h.id).vendor }} · #{{ h.id }}</template>
              <Select :model-value="h.id" :options="options" option-label="label" option-value="id" size="small" disabled :aria-label="t('Spool on T', 'Bobina na T') + h.n" :aria-describedby="busy" />
              <OuiSetpoint :label="t('Nozzle', 'Bico')" :icon="I.nozzle" :name="'T' + h.n" :current="h.temp + drift" :target="h.target" unit="°C" :digits="h.active ? 1 : 0" :min="0" :max="320"
                :phase="h.target ? 'target' : 'off'" :phase-label="h.target ? t('at target', 'na meta') : undefined" :set-label="t('Set', 'Definir')" :off-label="t('Off', 'Desligar')"
                :target-label="t('Target', 'Meta')" :off-text="t('off', 'desligado')" :input-label="t('Nozzle target T', 'Meta do bico T') + h.n" :off-always="h.n === 2" :data-sets="h.n === 2 ? t2Sets.join(' ') : undefined" @set="h.n === 2 && t2Sets.push($event)"
                v-bind="h.n === 3 ? { draft: t3Draft, 'onUpdate:draft': (v: number | null) => { t3Draft = v; }, validate: heatOk, invalid: t3Over, errorId: 'temp-why-T3',
                  error: t3Over ? t('The nozzle takes up to 320 °C.', 'O bico aceita até 320 °C.') : null } : {}" />
              <template #actions>
                <Button :label="t('Load', 'Carregar')" severity="secondary" size="small" disabled :aria-describedby="busy"><template #icon><OuiIcon :icon="I.download" :size="13" /></template></Button>
                <Button :label="t('Unload', 'Descarregar')" severity="secondary" size="small" disabled :aria-describedby="busy"><template #icon><OuiIcon :icon="I.upload" :size="13" /></template></Button>
                <span class="oui-spacer" />
                <Button severity="secondary" text size="small" disabled :aria-label="t('Edit filament', 'Editar filamento')"><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button>
                <Button severity="secondary" text size="small" disabled :aria-label="t('Read RFID tag', 'Ler etiqueta RFID')"><template #icon><OuiIcon :icon="I.rfid" :size="14" /></template></Button>
              </template>
            </OuiSlot>
          </div>
        </OuiPanel>

        <OuiPanel :title="t('Controls', 'Controles')" :icon="I.thermometer" tone="orange">
          <div v-if="loading" class="oui-stack" aria-busy="true"><span class="oui-skeleton" style="width: 60%" /><span class="oui-skeleton" style="width: 85%" /><span class="oui-skeleton" style="width: 45%" /></div>
          <div v-else class="oui-controls">
            <div class="oui-controls-group">
              <p class="oui-label">{{ t('Temperature', 'Temperatura') }}</p>
              <OuiSetpoint :label="t('Bed', 'Mesa')" :icon="I.bed" name="bed" :current="40 + drift" :target="40" unit="°C" :min="0" :max="110" phase="target" :phase-label="t('at target', 'na meta')"
                input-id="u1-bed" :validate="bedLimit" off-always :max-fraction-digits="1" :locale="lang" :input-props="bedField"
                :set-aria-label="t('Set the bed to the typed temperature', 'Definir a mesa na temperatura digitada')" :off-aria-label="t('Turn the bed heater off', 'Desligar o aquecedor da mesa')" :data-sets="bedSets.join(' ')" @set="bedSets.push($event)"
                :error="state === 'refused' ? t('The printer refused 105 °C: the chamber door is open.', 'A impressora recusou 105 °C: a porta da câmara está aberta.') : null"
                :history="[22, 26, 31, 36, 39, 40, 40, 40]" :set-label="t('Set', 'Definir')" :off-label="t('Off', 'Desligar')" :target-label="t('Target', 'Meta')" :off-text="t('off', 'desligada')" :input-label="t('Bed target', 'Meta da mesa')" />
            </div>
            <div class="oui-controls-group">
              <p class="oui-label">{{ t('Machine', 'Máquina') }}</p>
              <OuiControlRow :label="t('Speed', 'Velocidade')" :icon="I.speed" tone="cobalt" value="100 %" for="u1-speed">
                <InputNumber v-model="speed" input-id="u1-speed" suffix=" %" :min="10" :max="300" size="small" :input-style="{ width: '72px' }" /><Button :label="t('Set', 'Definir')" severity="secondary" size="small" />
              </OuiControlRow>
              <OuiControlRow :label="t('Top cover', 'Tampa superior')" :icon="I.wind" tone="sky" :value="t('Not detected', 'Não detectada')">
                <Select v-model="cover" :options="[t('Open', 'Aberta'), t('Closed', 'Fechada')]" :placeholder="t('Choose a mode', 'Escolha um modo')" size="small" :aria-label="t('Top cover mode', 'Modo da tampa superior')" />
                <Button :label="t('Apply', 'Aplicar')" severity="secondary" size="small" :disabled="!cover" />
              </OuiControlRow>
              <OuiControlRow :label="t('Chamber light', 'Luz da câmara')" :icon="I.light" tone="lime" :value="light ? t('On', 'Ligada') : t('Off', 'Desligada')" for="u1-light"><ToggleSwitch v-model="light" input-id="u1-light" /></OuiControlRow>
            </div>
          </div>
        </OuiPanel>
      </div>

      <div class="oui-dash-side">
        <OuiPanel :title="t('Camera', 'Câmera')" :icon="I.camera" tone="sky" flush hint-id="u1-camera-rate" :hint-label="t('About the camera rate', 'Sobre a taxa da câmera')"
          :hint="t('Up to this many pictures a second. The printer decides how often its picture changes, and each one goes through OrcaSlicer, so the rate you see can be lower.', 'Até este número de imagens por segundo. A impressora decide quando a imagem muda, e cada uma passa pelo OrcaSlicer, então a taxa vista pode ser menor.')">
          <template #actions>
            <Select v-model="fps" :options="[5, 15, 30]" size="small" :aria-label="t('Pictures a second', 'Imagens por segundo')" aria-describedby="u1-camera-rate" data-test="fps" :disabled="loading"><template #value="{ value }">{{ value }} fps</template><template #option="{ option }">{{ option }} fps</template></Select>
            <Button severity="secondary" text size="small" :aria-label="t('Save picture', 'Salvar imagem')" :disabled="loading"><template #icon><OuiIcon :icon="I.download" :size="14" /></template></Button>
            <Button :label="t('Stop', 'Parar')" severity="secondary" size="small" :disabled="loading"><template #icon><OuiIcon :icon="I.cameraOff" :size="14" /></template></Button>
          </template>
          <!-- A 4:3 camera shown whole (fit="contain"); every loaded picture is counted, as the page acknowledges each frame. -->
          <OuiCamera :src="CAMERA_43" fit="contain" :alt="t('Printer camera', 'Câmera da impressora')" :state="loading ? 'loading' : 'live'" :title="t('Starting the camera', 'Iniciando a câmera')"
            :data-frames="frames" @frame="frames++">
            <template #overlay><span class="oui-chip">{{ t('Live', 'Ao vivo') }}</span><span class="oui-chip oui-num">30 fps</span></template>
          </OuiCamera>
        </OuiPanel>
        <OuiPanel :title="t('Printer', 'Impressora')" :icon="I.printer">
          <div v-if="loading" class="oui-stack" aria-busy="true"><span class="oui-skeleton" style="width: 70%" /><span class="oui-skeleton" style="width: 50%" /><span class="oui-skeleton" style="width: 60%" /></div>
          <OuiKeyValue v-else :items="[{ label: t('Model', 'Modelo'), value: 'Snapmaker U1' }, { label: 'Firmware', value: '2.0.0-paxx12-24' }, { label: t('Address', 'Endereço'), value: '192.168.1.60', mono: true },
            { label: t('Total print time', 'Tempo total de impressão'), value: '312 h 40 min' }, { label: t('Prints', 'Impressões'), value: 148 }]" />
        </OuiPanel>
      </div>
    </div>
  </main>
</template>
<style>
.u1-skel { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--oui-s4); }
.u1-skelcard { display: grid; gap: var(--oui-s3); align-content: start; min-height: 180px; padding: var(--oui-s3); border-radius: var(--oui-radius-lg); background: var(--oui-raised); }
</style>
