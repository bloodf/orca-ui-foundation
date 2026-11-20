<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import { OuiAppBar, OuiBanner, OuiFormSection, OuiPanel, OuiRequirement, OuiToastHost, useToast } from '../../src/components';
import { dashboard, info as infoIcon, settings, wrench } from '../../src/icons';
import { t } from '../i18n';
import { MARKS } from '../marks';

// MOCK — 4.2.0 notices: the toast stack (bottom-left), dismissible banners, and requirement rows as in a Settings page.
defineProps<{ state: string }>();
const toast = useToast();
// The shot script drives the toast clock and the banner condition from outside (scripts/shots.mjs).
const spoolmanDown = ref(true);
(window as unknown as { __notices: unknown }).__notices = { toast, spoolmanDown };
const tab = ref('settings');
const tabs = [{ value: 'dashboard', label: t('Dashboard', 'Painel'), icon: dashboard }, { value: 'settings', label: t('Settings', 'Ajustes'), icon: settings }];
const checking = ref(false);
function again() { checking.value = true; setTimeout(() => { checking.value = false; }, 600); }
onMounted(() => {
  // timeout 0: the gallery keeps them on screen for the screenshot; real pages use the defaults (5 s / 8 s / until closed).
  toast.show({ tone: 'success', title: t('Saved.', 'Salvo.'), body: t('Settings are in effect.', 'Os ajustes já valem.'), timeout: 0 });
  toast.show({ tone: 'info', title: t('Spool #7 linked to slot 2.', 'Bobina #7 vinculada ao slot 2.'), action: { label: t('Undo', 'Desfazer'), run: () => undefined }, timeout: 0 });
  toast.show({ tone: 'warn', title: t('1 filament use is not confirmed.', '1 consumo de filamento não foi confirmado.'), body: t('Spoolman timed out.', 'O Spoolman não respondeu.'), timeout: 0 });
  toast.show({ tone: 'error', title: t('Could not reach the printer.', 'Não foi possível falar com a impressora.'), body: '192.168.1.50' });
});
</script>
<template>
  <OuiAppBar v-model="tab" name="Kobra Control" :tabs="tabs">
    <template #mark><span v-html="MARKS.kobra" /></template>
  </OuiAppBar>
  <main class="oui-page">
    <OuiBanner tone="warn" :show="spoolmanDown" dismissible dismiss-key="gallery-spoolman:http://192.168.1.10:7912" data-test="banner-spoolman" :close-label="t('Close', 'Fechar')"
      :title="t('Spoolman is not reachable.', 'O Spoolman não responde.')">{{ t('Stock and usage wait until it answers.', 'Estoque e consumo esperam até ele responder.') }}
      <template #actions><Button :label="t('Retry', 'Tentar de novo')" severity="secondary" size="small" /></template>
    </OuiBanner>
    <OuiBanner tone="info" dismissible :close-label="t('Close', 'Fechar')" :title="t('U1 Control is running too.', 'O U1 Control também está aberto.')">{{ t('Its toolheads are in its own tab.', 'As cabeças ficam na aba dele.') }}</OuiBanner>
    <OuiFormSection id="needs" :icon="wrench" tone="sky" :title="t('What Kobra Control needs', 'Do que o Kobra Control precisa')">
      <OuiRequirement :name="t('Anycubic certificate', 'Certificado da Anycubic')" :why="t('The printer only accepts connections signed with it.', 'A impressora só aceita conexões assinadas com ele.')"
        status="found" :status-label="t('Found', 'Encontrado')" detail="~/Library/Application Support/AnycubicSlicerNext/cert.pem" :check-label="t('Check again', 'Verificar de novo')" />
      <OuiRequirement :name="'ffmpeg'" :why="t('Shows the camera and makes time-lapses.', 'Mostra a câmera e faz os time-lapses.')"
        status="missing" :status-label="t('Not found', 'Não encontrado')" :install-text="t('Install it with Homebrew: brew install ffmpeg, or download it:', 'Instale com o Homebrew: brew install ffmpeg, ou baixe:')"
        install-url="https://ffmpeg.org/download.html" install-label="ffmpeg.org" :check-label="t('Check again', 'Verificar de novo')" :checking="checking" @check="again" />
      <OuiRequirement name="Spoolman" :why="t('Stock, and booking filament use after a print.', 'Estoque, e lançar o consumo depois de imprimir.')"
        status="checking" :status-label="t('Checking…', 'Verificando…')" :check-label="t('Check again', 'Verificar de novo')" />
    </OuiFormSection>
    <OuiPanel :title="t('Toasts', 'Avisos')" :icon="infoIcon">
      <p class="oui-meta" style="padding: 12px 16px">{{ t('Bottom-left, stacked, newest at the bottom. Each has a close button; info and success leave after 5 s, warnings after 8 s, errors stay until closed. Hover or focus holds the timer.', 'Embaixo à esquerda, empilhados, o mais novo embaixo. Todos têm botão de fechar; info e sucesso saem em 5 s, alertas em 8 s, erros ficam até fechar. Passar o mouse ou focar segura o tempo.') }}</p>
    </OuiPanel>
  </main>
  <OuiToastHost :close-label="t('Close', 'Fechar')" :label="t('Notifications', 'Notificações')" />
</template>
