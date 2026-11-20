<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { OuiFileBrowser, OuiIcon, OuiLevel, OuiPageHeader, OuiToastHost, useFileBackend, useToast, type OuiFile, type OuiFileBackend, type OuiFileBrowserLabels } from '../../src/components';
import * as I from '../../src/icons';
import { param, t } from '../i18n';
import PrinterBar from '../v5/PrinterBar.vue';
import { FILES, FOLDERS } from '../v5/data';
// MOCK — the Files tab of both printer plugins: one OuiFileBrowser over a backend adapter (useFileBackend).
// ?screen=u1-files: a storage with folders that can move files and make folders (the tree, "Move to", drag onto a folder, "New folder").
// ?screen=kobra-files: a storage with no folders (no tree, no move; multi-select and delete as with folders).
// state: '' (one file selected) | 'multi' (three selected: the bulk bar) | 'loading' | 'empty' | 'error' | 'slow' (a move or delete takes half a second, as on a real printer).
const props = defineProps<{ state: string }>();
const plugin = param('screen', 'u1-files').startsWith('kobra') ? 'kobra' : 'u1';
const flat = plugin === 'kobra';
const toast = useToast();
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// The fake storage: files per folder ('' is the whole storage when there are no folders).
const open = flat ? '' : 'local/chroma';
const store: Record<string, OuiFile[]> = { [open]: props.state === 'empty' ? [] : [...FILES], camera: FILES.slice(0, 3).map(f => ({ ...f, id: 'cam-' + f.id, name: f.name.replace(/\.\w+$/, '.mp4'), kind: 'MP4' })), 'local/gifts': FILES.slice(4, 6).map(f => ({ ...f, id: 'gift-' + f.id, name: 'gift_' + f.name })) };
const slow = () => (props.state === 'slow' ? new Promise<void>(r => setTimeout(r, 500)) : Promise.resolve());
const tree = FOLDERS.map(f => ({ ...f }));
const backend: OuiFileBackend = {
  ...(flat ? {} : {
    folders: async () => tree.map(f => ({ ...f, count: f.id in store ? store[f.id].length : f.count })),
    move: async (ids: string[], to: string, from: string) => { await slow(); store[to] = [...(store[to] ?? []), ...store[from].filter(f => ids.includes(f.id))]; store[from] = store[from].filter(f => !ids.includes(f.id)); },
    createFolder: async (parent: string, name: string) => { await slow(); const id = `${parent}/${name}`; tree.push({ id, name, parent, count: 0 }); store[id] = []; return id; },
  }),
  list: folder => (props.state === 'loading' ? new Promise<OuiFile[]>(() => {})
    : props.state === 'error' ? Promise.reject(new Error(t('The printer did not answer in 10 s.', 'A impressora não respondeu em 10 s.'))) : Promise.resolve([...(store[folder] ?? [])])),
  remove: async (ids, folder) => { await slow(); store[folder] = store[folder].filter(f => !ids.includes(f.id)); },
};
const files = useFileBackend(backend, { folder: open,
  onDone: (action, ids, to) => toast.show({ tone: 'success', title: action === 'create' ? t(`Folder ${ids[0]} made.`, `Pasta ${ids[0]} criada.`) : action === 'move'
    ? t(`Moved ${ids.length} to ${tree.find(f => f.id === to)?.name}.`, `${ids.length} movidos para ${tree.find(f => f.id === to)?.name}.`) : t(`Deleted ${ids.length}.`, `${ids.length} excluídos.`) }),
  onError: (action, error) => toast.show({ tone: 'error', title: action === 'create' ? t('The folder was not made.', 'A pasta não foi criada.') : action === 'move' ? t('The files were not moved.', 'Os arquivos não foram movidos.') : t('The files were not deleted.', 'Os arquivos não foram excluídos.'),
    body: error instanceof Error ? error.message : String(error) }) });
// The reference shots open with a selection.
watch(() => files.files, list => { if (list.length) files.selected = props.state === 'multi' ? list.slice(1, 4).map(f => f.id) : props.state ? [] : [list[0].id]; }, { once: true });
const search = ref('');
const labels: OuiFileBrowserLabels = {
  folders: t('Folders', 'Pastas'), files: t('Files', 'Arquivos'), name: t('Name', 'Nome'), size: t('Size', 'Tamanho'), modified: t('Changed', 'Alterado'),
  selectAll: t('Select all files', 'Selecionar todos os arquivos'), select: name => t('Select ', 'Selecionar ') + name,
  items: c => n(c, t('file', 'arquivo'), t('files', 'arquivos')), selected: c => n(c, t('selected', 'selecionado'), t('selected', 'selecionados')),
  clear: t('Clear', 'Limpar'), moveTo: t('Move to…', 'Mover para…'), remove: t('Delete', 'Excluir'),
  removeTitle: c => t(`Delete ${n(c, 'file', 'files')}?`, `Excluir ${n(c, 'arquivo', 'arquivos')}?`), removeText: t('They are removed from the printer. This cannot be undone.', 'Eles são removidos da impressora. Não dá para desfazer.'),
  andMore: c => t(`and ${c} more`, `e mais ${c}`), cancel: t('Keep', 'Manter'),
  empty: flat ? t('No files on the printer', 'Nenhum arquivo na impressora') : t('This folder is empty', 'Esta pasta está vazia'), emptyText: t('Send a print from OrcaSlicer, or upload a file.', 'Envie uma impressão do OrcaSlicer ou um arquivo.'), loading: t('Reading the files', 'Lendo os arquivos'),
  nothingSelected: t('No file selected', 'Nenhum arquivo selecionado'), nothingSelectedText: t('Select a file to see its details and print it.', 'Selecione um arquivo para ver os detalhes e imprimir.'),
  loadFailed: t('The files could not be read', 'Não foi possível ler os arquivos'), retry: t('Try again', 'Tentar de novo'),
  newFolder: t('New folder', 'Nova pasta'), folderName: t('Folder name', 'Nome da pasta'),
  folderError: reason => ({ empty: t('Type a name.', 'Digite um nome.'), invalid: t('A name can’t contain / or be . or ..', 'Um nome não pode ter / nem ser . ou ..'),
    spaces: t('A name can’t start or end with a space.', 'Um nome não pode começar nem terminar com espaço.'), long: t('A name has at most 255 characters.', 'Um nome tem no máximo 255 caracteres.'),
    taken: t('This folder already has one with that name.', 'Esta pasta já tem uma com esse nome.') })[reason],
};
</script>
<template>
  <PrinterBar :plugin="plugin" tab="files" state="ok" :state-label="t('Connected', 'Conectada')" />
  <main class="oui-page pf" role="tabpanel" aria-labelledby="oui-tab-files">
    <OuiPageHeader :title="t('Files', 'Arquivos')" :meta="t('On the printer · 5.2 of 8 GB used', 'Na impressora · 5,2 de 8 GB usados')">
      <template #actions>
        <Button :label="t('Upload', 'Enviar arquivo')" severity="secondary"><template #icon><OuiIcon :icon="I.upload" :size="14" /></template></Button>
      </template>
    </OuiPageHeader>
    <!-- The Kobra list opens newest first; the U1 one by name. -->
    <OuiFileBrowser v-bind="files.props" :labels="labels" :sort="flat ? { key: 'modified', down: true } : undefined" v-on="files.on">
      <!-- With no folders the slot is as wide as the bar: a spacer pushes its items apart. -->
      <template #toolbar><InputText v-model="search" size="small" :placeholder="flat ? t('Search files', 'Buscar arquivos') : t('Search this folder', 'Buscar nesta pasta')" :aria-label="t('Search files', 'Buscar arquivos')" style="width: 220px" />
        <template v-if="flat"><span class="oui-spacer" /><Button :label="t('Refresh', 'Atualizar')" severity="secondary" text size="small" data-test="files-refresh" @click="files.reload()"><template #icon><OuiIcon :icon="I.refresh" :size="13" /></template></Button></template></template>
      <!-- What can be done to the open folder itself: the page's, beside the path. Not offered in a read-only folder. -->
      <template #folder="{ folder }">
        <Button severity="secondary" text size="small" :disabled="!folder || folder.readonly || !folder.parent" :aria-label="t('Rename folder', 'Renomear pasta')" :title="t('Rename folder', 'Renomear pasta')"><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button>
        <Button severity="secondary" text size="small" :disabled="!folder || folder.readonly || !folder.parent" :aria-label="t('Delete folder', 'Excluir pasta')" :title="t('Delete folder', 'Excluir pasta')"><template #icon><OuiIcon :icon="I.trash" :size="14" /></template></Button>
      </template>
      <template #rail><div class="pf-space"><span class="oui-meta oui-num">{{ t('5.2 of 8 GB used', '5,2 de 8 GB usados') }}</span><OuiLevel :fraction="0.35" :label="t('Free space', 'Espaço livre')" /></div></template>
      <template #actions>
        <Button :label="t('Print', 'Imprimir')"><template #icon><OuiIcon :icon="I.printer" :size="14" /></template></Button>
        <Button :label="t('Download', 'Baixar')" severity="secondary"><template #icon><OuiIcon :icon="I.download" :size="14" /></template></Button>
        <Button :label="t('Rename', 'Renomear')" severity="secondary" text><template #icon><OuiIcon :icon="I.edit" :size="14" /></template></Button>
      </template>
      <template #empty><Button :label="t('Upload', 'Enviar arquivo')" severity="secondary" size="small"><template #icon><OuiIcon :icon="I.upload" :size="13" /></template></Button></template>
    </OuiFileBrowser>
  </main>
  <OuiToastHost :close-label="t('Close', 'Fechar')" />
</template>
<style>
.pf { --oui-files-height: calc(100vh - 124px); }
@supports (height: 100dvh) { .pf { --oui-files-height: calc(100dvh - 124px); } }
.pf-space { display: grid; gap: 6px; max-width: 232px; }
</style>
