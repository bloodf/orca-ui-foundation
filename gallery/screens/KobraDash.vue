<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import ToggleSwitch from 'primevue/toggleswitch';
import { OuiBanner, OuiCamera, OuiControlRow, OuiEmpty, OuiHint, OuiIcon, OuiJob, OuiKeyValue, OuiPageHeader, OuiPanel, OuiReadout, OuiSetpoint, OuiSlot, OuiStatus } from '../../src/components';
import * as I from '../../src/icons';
import { t } from '../i18n';
import PrinterBar from '../v5/PrinterBar.vue';
import PrinterKobra from '../art/PrinterKobra.vue';
import '../art/art.css';
import { CAMERA, SPOOLS, spool } from '../v5/data';
// MOCK — Kobra Control dashboard, 5.0: the same grammar as U1 Control (header, status block, work column, watch column).
// state: '' (printing) | 'offline' (the printer stopped answering: last known job, one-row modules).
const props = defineProps<{ state: string }>();
const offline = props.state === 'offline';
const busy = 'kobra-busy';
const slots = [{ n: 1, id: 42 }, { n: 2, id: 46 }, { n: 3, id: 26, loaded: true }, { n: 4, id: 21 }];
const options = SPOOLS.map(s => ({ id: s.id, label: `#${s.id} ${s.vendor} ${s.name} · ${s.material}` }));
const fan = ref(79); const mode = ref('Standard'); const light = ref(false); const autoFeed = ref(true); const step = ref(10);
const dryTemp = ref<number | null>(null); const dryTime = ref<number | null>(null);
const assist = ref({ break: false, jam: false, feed: false });
const heat = { set: t('Set', 'Definir'), off: t('Off', 'Desligar'), target: t('Target', 'Meta'), offText: t('off', 'desligado'), at: t('at target', 'na meta') };
</script>
<template>
  <PrinterBar plugin="kobra" tab="dashboard" :state="offline ? 'offline' : 'busy'" :state-label="offline ? t('Offline', 'Sem conexão') : undefined" />
  <main class="oui-page" role="tabpanel" aria-labelledby="oui-tab-dashboard">
    <OuiPageHeader title="Anycubic Kobra X" :meta="offline ? t('192.168.1.50 · last seen 4 min ago', '192.168.1.50 · vista há 4 min') : '192.168.1.50 · Firmware 2.0.2.8'">
      <template #actions><Button :label="t('Rename', 'Renomear')" severity="secondary" text><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button></template>
    </OuiPageHeader>
    <OuiBanner v-if="offline" tone="error" :title="t('The printer stopped answering.', 'A impressora parou de responder.')" dismissible :close-label="t('Close', 'Fechar')">
      {{ t('Showing the last values it sent. Controls are off until it answers again.', 'Mostrando os últimos valores recebidos. Os controles ficam desligados até ela responder.') }}
      <template #actions><Button :label="t('Try again', 'Tentar de novo')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.refresh" :size="13" /></template></Button></template>
    </OuiBanner>
    <OuiBanner v-else :id="busy" tone="info" :title="t('The printer is printing.', 'A impressora está imprimindo.')" dismissible dismiss-key="kobra-busy-v5" :close-label="t('Close', 'Fechar')">
      {{ t('Feeding, retracting and moves are off until it is idle or paused.', 'Alimentar, recolher e movimentos ficam desligados até ela ficar ociosa ou pausada.') }}
    </OuiBanner>

    <div class="oui-dash">
      <OuiPanel class="oui-dash-top">
        <OuiJob name="1119-1113-obj_1_Arm_plate(01)_PLA_0.24.gcode" :progress="71" :detail="t('Layer 377 of 544', 'Camada 377 de 544')" :stale="offline" :progress-label="t('Print progress', 'Progresso da impressão')">
          <template #thumb><PrinterKobra :colors="slots.map(s => spool(s.id).colour)" :progress="71" :size="54" :stale="offline" /></template>
          <template #status><OuiStatus v-if="offline" state="stale">{{ t('Last known · 4 min ago', 'Último valor · há 4 min') }}</OuiStatus><OuiStatus v-else state="busy">{{ t('Printing', 'Imprimindo') }}</OuiStatus></template>
          <OuiReadout size="sm" :label="t('Elapsed', 'Decorrido')" value="5 h 25 min" :stale="offline" />
          <OuiReadout size="sm" :label="t('Left', 'Restante')" value="2 h 19 min" :stale="offline" />
          <OuiReadout size="sm" :label="t('Finishes', 'Termina')" :value="offline ? null : '7:15 PM'" />
          <template v-if="!offline" #actions>
            <Button :label="t('Pause', 'Pausar')" severity="secondary"><template #icon><OuiIcon :icon="I.pause" :size="14" /></template></Button>
            <Button :label="t('Choose objects…', 'Escolher objetos…')" severity="secondary" text><template #icon><OuiIcon :icon="I.layers" :size="14" /></template></Button>
            <Button :label="t('Stop print', 'Parar impressão')" severity="danger" outlined><template #icon><OuiIcon :icon="I.stop" :size="14" /></template></Button>
          </template>
        </OuiJob>
      </OuiPanel>

      <div class="oui-dash-main">
        <OuiPanel :title="t('Filament', 'Filamento')" :icon="I.spool" tone="magenta" :meta="offline ? undefined : t('ACE 1 · feeds the printer directly', 'ACE 1 · alimenta a impressora direto')" :flush="offline">
          <template v-if="!offline" #actions><label for="kb-auto" class="oui-meta">{{ t('Auto-feed', 'Alimentação automática') }}</label><ToggleSwitch v-model="autoFeed" input-id="kb-auto" /></template>
          <OuiEmpty v-if="offline" compact state="offline" :title="t('Slots are not shown while the printer is offline', 'Os slots não aparecem com a impressora sem conexão')" />
          <div v-else class="oui-stack">
            <div class="kb-dry">
              <OuiIcon :icon="I.flame" :size="14" tile tone="orange" /><span class="oui-strong">{{ t('Drying', 'Secagem') }}</span>
              <span class="oui-meta"><OuiIcon :icon="I.drop" :size="13" tone="sky" class="kb-inline" /> {{ t('Humidity 48 %', 'Umidade 48 %') }}</span>
              <span class="oui-spacer" />
              <InputNumber v-model="dryTemp" placeholder="30–80 °C" :min="30" :max="80" size="small" :input-style="{ width: '92px' }" :aria-label="t('Drying temperature', 'Temperatura de secagem')" />
              <InputNumber v-model="dryTime" placeholder="10–1440 min" :min="10" :max="1440" size="small" :input-style="{ width: '112px' }" :aria-label="t('Drying time', 'Tempo de secagem')" />
              <Button :label="t('Start drying', 'Iniciar secagem')" severity="secondary" size="small" :disabled="!dryTemp || !dryTime" />
            </div>
            <div class="oui-cards">
              <OuiSlot v-for="s in slots" :key="s.n" :label="String(s.n)" :name="spool(s.id).vendor + ' ' + spool(s.id).name" :material="spool(s.id).material" :color="spool(s.id).colour"
                :remaining="spool(s.id).remaining" :initial="spool(s.id).initial" :active="s.loaded" :empty-label="t('Empty', 'Vazio')">
                <template v-if="s.loaded" #state><OuiStatus state="ok">{{ t('In the print head', 'No cabeçote') }}</OuiStatus></template>
                <template #meta>{{ spool(s.id).material }} · #{{ s.id }}</template>
                <Select :model-value="s.id" :options="options" option-label="label" option-value="id" size="small" :aria-label="t('Spool in slot ', 'Bobina no slot ') + s.n" />
                <template #actions>
                  <Button :label="t('Feed', 'Alimentar')" severity="secondary" size="small" disabled :aria-describedby="busy" />
                  <Button :label="t('Retract', 'Recolher')" severity="secondary" size="small" disabled :aria-describedby="busy" />
                  <span class="oui-spacer" />
                  <Button severity="secondary" text size="small" :aria-label="t('Edit filament', 'Editar filamento')"><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button>
                </template>
              </OuiSlot>
            </div>
          </div>
        </OuiPanel>

        <OuiPanel :title="t('Controls', 'Controles')" :icon="I.thermometer" tone="orange" :flush="offline">
          <OuiEmpty v-if="offline" compact state="offline" :title="t('Controls are off while the printer is offline', 'Os controles ficam desligados com a impressora sem conexão')" />
          <div v-else class="oui-controls">
            <div class="oui-controls-group">
              <p class="oui-label">{{ t('Temperature', 'Temperatura') }}</p>
              <OuiSetpoint :label="t('Nozzle', 'Bico')" :icon="I.nozzle" name="nozzle" :current="230" :target="230" unit="°C" :digits="1" :min="0" :max="320" phase="target" :phase-label="heat.at"
                :history="[228, 231, 229, 232, 230, 229, 231, 230]" :set-label="heat.set" :off-label="heat.off" :target-label="heat.target" :off-text="heat.offText" :input-label="t('Nozzle target', 'Meta do bico')" />
              <OuiSetpoint :label="t('Bed', 'Mesa')" :icon="I.bed" name="bed" :current="65" :target="65" unit="°C" :digits="1" :min="0" :max="120" phase="target" :phase-label="heat.at"
                :history="[64, 65, 65, 65, 65, 65, 65, 65]" :set-label="heat.set" :off-label="heat.off" :target-label="heat.target" :off-text="heat.offText" :input-label="t('Bed target', 'Meta da mesa')" />
            </div>
            <div class="oui-controls-group">
              <p class="oui-label">{{ t('Machine', 'Máquina') }}</p>
              <OuiControlRow :label="t('Fan', 'Ventilador')" :icon="I.fan" tone="sky" value="79 %" for="kb-fan">
                <InputNumber v-model="fan" input-id="kb-fan" suffix=" %" :min="0" :max="100" size="small" :input-style="{ width: '72px' }" /><Button :label="t('Set', 'Definir')" severity="secondary" size="small" />
              </OuiControlRow>
              <OuiControlRow :label="t('Speed mode', 'Modo de velocidade')" :icon="I.speed" tone="cobalt">
                <Select v-model="mode" :options="['Silent', 'Standard', 'Sport']" size="small" :aria-label="t('Speed mode', 'Modo de velocidade')" /><Button :label="t('Apply', 'Aplicar')" severity="secondary" size="small" />
              </OuiControlRow>
              <OuiControlRow :label="t('Light', 'Luz')" :icon="I.light" tone="lime" :value="light ? t('On', 'Ligada') : t('Off', 'Desligada')" for="kb-light"><ToggleSwitch v-model="light" input-id="kb-light" /></OuiControlRow>
            </div>
          </div>
        </OuiPanel>
      </div>

      <div class="oui-dash-side">
        <OuiPanel :title="t('Camera', 'Câmera')" :icon="I.camera" tone="sky" flush>
          <template v-if="!offline" #actions>
            <Button severity="secondary" text size="small" :aria-label="t('Save picture', 'Salvar imagem')"><template #icon><OuiIcon :icon="I.download" :size="14" /></template></Button>
            <Button :label="t('Turn off', 'Desligar')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.cameraOff" :size="14" /></template></Button>
          </template>
          <OuiEmpty v-if="offline" compact state="offline" :title="t('No picture while the printer is offline', 'Sem imagem com a impressora sem conexão')" />
          <OuiCamera v-else state="live" :alt="t('Printer camera', 'Câmera da impressora')">
            <!-- Kobra Control plays the stream itself: its player goes in #picture (an image stands in for it here). -->
            <template #picture><img class="oui-camera-picture" :src="CAMERA" :alt="t('Printer camera', 'Câmera da impressora')" data-test="own-player"></template>
            <template #overlay><span class="oui-chip">{{ t('Live', 'Ao vivo') }}</span></template></OuiCamera>
        </OuiPanel>

        <OuiPanel :title="t('Move', 'Mover')" :icon="I.move" tone="cobalt" :flush="offline" :hint-label="t('About moving', 'Sobre mover')"
          :hint="t('Moves are available while the printer is idle or paused.', 'Os movimentos ficam disponíveis com a impressora ociosa ou pausada.')">
          <OuiEmpty v-if="offline" compact state="offline" :title="t('Moves are off while the printer is offline', 'Movimentos desligados com a impressora sem conexão')" />
          <div v-else class="kb-move">
            <div class="kb-jog" role="group" :aria-label="t('Move the head', 'Mover o cabeçote')">
              <Button label="Y+" severity="secondary" size="small" disabled :aria-describedby="busy" style="grid-area: 1 / 2" /><Button label="X−" severity="secondary" size="small" disabled :aria-describedby="busy" style="grid-area: 2 / 1" />
              <Button severity="secondary" size="small" disabled :aria-label="t('Home all', 'Origem de todos')" :aria-describedby="busy" style="grid-area: 2 / 2"><template #icon><OuiIcon :icon="I.home" :size="14" /></template></Button>
              <Button label="X+" severity="secondary" size="small" disabled :aria-describedby="busy" style="grid-area: 2 / 3" /><Button label="Y−" severity="secondary" size="small" disabled :aria-describedby="busy" style="grid-area: 3 / 2" />
              <Button label="Z+" severity="secondary" size="small" disabled :aria-describedby="busy" style="grid-area: 1 / 5" /><Button label="Z−" severity="secondary" size="small" disabled :aria-describedby="busy" style="grid-area: 3 / 5" />
            </div>
            <div class="oui-stack kb-moveside">
              <div class="oui-row"><span class="oui-label">{{ t('Step', 'Passo') }}</span><SelectButton v-model="step" :options="[0.1, 1, 10, 50]" :allow-empty="false" size="small" disabled :aria-label="t('Step in millimetres', 'Passo em milímetros')" /><span class="oui-meta">mm</span></div>
              <div class="oui-row">
                <Button :label="t('Home XY', 'Origem XY')" severity="secondary" size="small" disabled :aria-describedby="busy" /><Button :label="t('Home Z', 'Origem Z')" severity="secondary" size="small" disabled :aria-describedby="busy" />
                <Button :label="t('Motors off', 'Desligar motores')" severity="secondary" text size="small" disabled :aria-describedby="busy"><template #icon><OuiIcon :icon="I.power" :size="13" /></template></Button>
              </div>
            </div>
          </div>
        </OuiPanel>

        <OuiPanel :title="t('Printer', 'Impressora')" :icon="I.printer">
          <div class="oui-controls">
            <OuiKeyValue :items="[{ label: 'Firmware', value: '2.0.2.8' }, { label: t('Total print time', 'Tempo total de impressão'), value: '59 h 3 min' }, { label: t('Prints', 'Impressões'), value: 26 }, { label: t('Filament used', 'Filamento usado'), value: '1.27 kg' }]" />
            <div class="oui-controls-group">
              <p class="oui-label">{{ t('Print assist', 'Assistência') }}<OuiHint :label="t('About print assist', 'Sobre a assistência')">{{ t('The printer pauses the print when the filament breaks or jams, and can go on with a slot of the same filament when a spool runs out.', 'A impressora pausa quando o filamento quebra ou trava, e pode continuar com um slot do mesmo filamento quando a bobina acaba.') }}</OuiHint></p>
              <OuiControlRow :label="t('Filament break alert', 'Alerta de quebra')" for="kb-a1"><ToggleSwitch v-model="assist.break" input-id="kb-a1" :disabled="offline" /></OuiControlRow>
              <OuiControlRow :label="t('Filament jam alert', 'Alerta de travamento')" for="kb-a2"><ToggleSwitch v-model="assist.jam" input-id="kb-a2" :disabled="offline" /></OuiControlRow>
              <OuiControlRow :label="t('Continue with the same filament', 'Continuar com o mesmo filamento')" for="kb-a3"><ToggleSwitch v-model="assist.feed" input-id="kb-a3" :disabled="offline" /></OuiControlRow>
            </div>
          </div>
        </OuiPanel>
      </div>
    </div>
  </main>
</template>
<style>
.kb-dry { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2) var(--oui-s3); min-height: 40px; padding: 4px var(--oui-s2); border-radius: var(--oui-radius); background: var(--oui-raised); box-shadow: inset 0 0 0 1px var(--oui-border); }
.kb-inline { display: inline-block; vertical-align: -2px; }
.kb-move { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s3) var(--oui-s6); }
.kb-jog { display: grid; grid-template-columns: repeat(3, 40px) 12px 40px; grid-template-rows: repeat(3, 28px); gap: 4px; }
.kb-jog > .p-button { width: 100%; height: 100%; padding: 0; }
.kb-moveside { flex: 1 1 200px; }
</style>
