<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onUpdated, ref, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import OuiConfirm from './OuiConfirm.vue';
import OuiMenu, { type OuiMenuItem } from './OuiMenu.vue';
import OuiEmpty from './OuiEmpty.vue';
import OuiIcon from './OuiIcon.vue';
import OuiKeyValue, { type OuiFact } from './OuiKeyValue.vue';
import OuiThumb from './OuiThumb.vue';
import { chevronDown, chevronRight, file as fileIcon, files as filesIcon, folder as folderIcon, folderMove as folderMoveIcon, folderPlus, refresh as refreshIcon, rename as renameIcon,
  selectAll as selectAllIcon, trash, viewGrid as viewGridIcon, viewList as viewListIcon, x as closeIcon } from '../icons';

/*
 * The Files tab of a printer plugin: folders in a tree on the left, the open folder's files as a table in the middle,
 * and what is selected on the right. One component for every printer plugin: the storage is behind an adapter
 * (`OuiFileBackend`, ./fileBackend.ts) and `useFileBackend(adapter)` gives this component its props and handlers, so
 * loading, failure, reloading after a change and what is offered are the same everywhere. The component itself only
 * shows what it is given and emits `move`, `delete`, `open` and `retry`.
 *
 * A storage with no folders (no `folders`, or an empty list) has no tree, no path and no "Move to": the table takes the
 * rail's place, and selecting and deleting work as they do with folders. A storage that has folders but cannot move
 * files (`movable` false) keeps the tree for browsing and has no "Move to" and no dragging.
 *
 * Naming is done in place, as in Finder: "New folder" (beside the path, or on a folder's context menu) adds a folder with
 * its name field open, at the top of the list or under that folder in the tree; Rename (context menu, or F2) opens the
 * name of a file or folder. The name is checked here (not empty, no '/', not '.' or '..', no spaces at its ends, at most
 * 255 characters, not a name already there) and then given to `act` (or emitted as `create-folder` / `rename`); Enter or
 * a click elsewhere commits, Escape cancels, and a refusal stays under the field.
 *
 * Right-click (or the menu key) on a file or folder opens its menu: the page's own items (`fileMenu`, `folderMenu`) and
 * what the storage can do: rename, "Move to…", delete (a folder: with what is in it, after asking). On a file of the
 * selection it acts for the whole selection. The list can also be shown as a grid of pictures; the choice is kept per
 * `viewKey`. A search (the page's) can rank the files itself (`ranked`) and mark the matched letters (`OuiFile.match`).
 *
 * Folders are shown in the tree only; the table lists files. What can be done to the open folder itself (rename it,
 * move it, delete it, make a folder in it) is the page's, in `#folder`, which gets that folder and sits beside the path.
 *
 * Selecting: a click selects one file; Cmd/Ctrl-click and the checkbox add or remove one; Shift-click (and Shift with
 * the arrows) selects the range from the last one; the header checkbox and Cmd/Ctrl+A select all; Escape clears.
 * Moving: drag the selection onto a folder in the tree, or use "Move to" in the bar over the table, which does the
 * same from the keyboard. Deleting always asks first (OuiConfirm), with the count and the first names.
 * Keys in the table: arrows, Home, End, Space (toggle), Enter (open), Delete. In the tree: arrows, Home, End,
 * Enter (open the folder).
 */
export interface OuiFolder { id: string; name: string; /** Missing or null: a root. */ parent?: string | null; count?: number; /** Not a place files can be moved to. */ locked?: boolean;
  /** Its files can be looked at and opened, not moved, deleted or added to (a camera or system folder). */ readonly?: boolean }
export interface OuiFile { id: string; name: string; /** Bytes and time for sorting; the texts are what is shown. */ size?: number | null; sizeText?: string; modified?: number | null; modifiedText?: string;
  /** A short tag after the name ("G-code", "3MF"). */ kind?: string; thumb?: string | null; /** Facts for the detail panel. */ facts?: OuiFact[];
  /** Indices of the name's characters a search matched (fuzzyMatch), shown marked. */ match?: number[] }
/** A name typed in place, for `act`: a new folder in `parent`, or a file or folder renamed. */
export type OuiFileOp = { kind: 'create'; parent: string; name: string } | { kind: 'rename'; id: string; name: string; folder: boolean };
export type OuiFileMenuItem = OuiMenuItem;
export interface OuiFileBrowserLabels { folders: string; files: string; name: string; size: string; modified: string; selectAll: string; select: (name: string) => string;
  items: (count: number) => string; selected: (count: number) => string; clear: string; moveTo: string; remove: string;
  removeTitle: (count: number) => string; removeText: string; andMore: (count: number) => string; cancel: string;
  empty: string; emptyText?: string; loading: string; nothingSelected: string; nothingSelectedText?: string;
  /** For `error`: what failed, in one sentence (the error itself is shown under it), and the button that tries again. */ loadFailed?: string; retry?: string;
  /** For `creatable`: the button and the name a new folder starts with, the name field's accessible name, and why a typed name is refused. */
  newFolder?: string; folderName?: string; folderError?: (reason: OuiFolderNameError) => string;
  /** Context menus, "Move to…" from them, deleting a folder, and the list/grid switch. */
  rename?: string; moveTitle?: (count: number) => string; removeFolderTitle?: (name: string) => string; removeFolderText?: string; move?: string;
  listView?: string; gridView?: string; /** The context menus' Refresh. */ refresh?: string }
export type OuiFolderNameError = 'empty' | 'invalid' | 'spaces' | 'long' | 'taken';

const props = withDefaults(defineProps<{ /** The storage's folders, flat. None: the storage has no folders, and the tree and "Move to" are not shown. */ folders?: OuiFolder[];
  files: OuiFile[]; /** The open folder (v-model:folder); '' when there are no folders. */ folder?: string; /** Selected file ids (v-model:selected). */ selected: string[];
  labels: OuiFileBrowserLabels; loading?: boolean; /** Moving and deleting are off (the printer is busy); the page says why, once. */ readonly?: boolean; describedby?: string;
  /** The storage can move files between folders (default true). False: the tree stays, "Move to" and dragging go. */ movable?: boolean;
  /** The files could not be read: shown in place of the table, with `labels.loadFailed` and a `retry` button. */ error?: string | null;
  /** A move or delete is under way: the bulk actions wait for it. */ busy?: boolean;
  /** Folders can be made (default false): "New folder" beside the path and on a folder's context menu in the tree. */ creatable?: boolean;
  /** Files and folders can be renamed in place (context menu, F2). */ renamable?: boolean;
  /** Folders can be moved ("Move to…" on a folder's menu) and deleted with what is in them. */ foldersMovable?: boolean; foldersRemovable?: boolean;
  /** Runs a new folder or a rename and resolves when it is done; a rejection is shown under the name field, which stays open. Without it, `create-folder` and `rename` are emitted and the field closes. */
  act?: (op: OuiFileOp) => Promise<unknown>;
  /** The page's own items at the top of a file's (the selection's) or a folder's context menu: Print, Download… */
  fileMenu?: (ids: string[]) => OuiFileMenuItem[]; folderMenu?: (id: string) => OuiFileMenuItem[];
  /** Keeps the list/grid choice in this browser under this key (a plugin's name). */ viewKey?: string;
  /** The files are already in the order to show (a search's best match first): the column sort waits. */ ranked?: boolean;
  /** The order the list opens in (default: by name). A printer's list usually reads newest first: `{ key: 'modified', down: true }`. The user can still sort by any column. */
  sort?: { key: 'name' | 'size' | 'modified'; down?: boolean } }>(), { folders: () => [], folder: '', movable: true, creatable: false, renamable: false, foldersMovable: false, foldersRemovable: false });
const emit = defineEmits<{ 'update:folder': [id: string]; 'update:selected': [ids: string[]]; move: [payload: { ids: string[]; to: string }]; delete: [ids: string[]]; open: [id: string]; retry: []; 'create-folder': [payload: { parent: string; name: string }];
  rename: [payload: { id: string; name: string; folder: boolean }]; 'move-folder': [payload: { id: string; to: string }]; 'delete-folder': [id: string]; 'update:view': [view: 'list' | 'grid']; /** Read the storage again (the context menus' Refresh). */ refresh: [] }>();
const hasTree = computed(() => props.folders.length > 0);
const locked = computed(() => props.readonly || props.busy || !!byId.value.get(props.folder)?.readonly);

// ---- folders -------------------------------------------------------------------------------------------------------
const byId = computed(() => new Map(props.folders.map(f => [f.id, f])));
const children = computed(() => {
  const map = new Map<string, OuiFolder[]>();
  for (const f of props.folders) { const key = f.parent ?? ''; map.set(key, [...(map.get(key) ?? []), f]); }
  return map;
});
const trail = (id: string): OuiFolder[] => { const out: OuiFolder[] = []; for (let f = byId.value.get(id); f && !out.includes(f); f = f.parent ? byId.value.get(f.parent) : undefined) out.unshift(f); return out; };
const path = computed(() => trail(props.folder));
const expanded = ref(new Set<string>());
// The open folder is always visible in the tree, and the roots start open.
watch(() => [props.folder, props.folders] as const, () => {
  expanded.value = new Set([...expanded.value, ...path.value.slice(0, -1).map(f => f.id), ...(expanded.value.size ? [] : (children.value.get('') ?? []).map(f => f.id))]);
}, { immediate: true });
interface Node { folder: OuiFolder; depth: number; branch: boolean; open: boolean }
const nodes = computed(() => {
  const out: Node[] = [];
  const walk = (parent: string, depth: number) => { for (const folder of children.value.get(parent) ?? []) {
    const branch = children.value.has(folder.id); const open = branch && expanded.value.has(folder.id);
    out.push({ folder, depth, branch, open }); if (open) walk(folder.id, depth + 1);
  } };
  walk('', 1);
  return out;
});
const treeFocus = ref(props.folder);
// The one tree item Tab reaches: the remembered one while it is shown, else the open folder, else the first.
const treeStop = computed(() => [treeFocus.value, props.folder].find(id => nodes.value.some(n => n.folder.id === id)) ?? nodes.value[0]?.folder.id);
const tree = ref<HTMLElement>();
function toggle(id: string, open?: boolean) { const next = new Set(expanded.value); (open ?? !next.has(id)) ? next.add(id) : next.delete(id); expanded.value = next; }
function focusFolder(id: string) { treeFocus.value = id; nextTick(() => tree.value?.querySelector<HTMLElement>(`[data-folder="${CSS.escape(id)}"]`)?.focus()); }
function openFolder(id: string) { treeFocus.value = id; if (id !== props.folder) { emit('update:selected', []); emit('update:folder', id); } }
function onTreeKey(event: KeyboardEvent) {
  const list = nodes.value; const at = list.findIndex(n => n.folder.id === treeStop.value); const node = list[at];
  if (!node) return;
  const go = (i: number) => { const n = list[Math.max(0, Math.min(list.length - 1, i))]; if (n) focusFolder(n.folder.id); };
  switch (event.key) {
    case 'ArrowDown': go(at + 1); break;
    case 'ArrowUp': go(at - 1); break;
    case 'Home': go(0); break;
    case 'End': go(list.length - 1); break;
    case 'ArrowRight': if (node.branch && !node.open) toggle(node.folder.id, true); else if (node.open) go(at + 1); break;
    case 'ArrowLeft': if (node.open) toggle(node.folder.id, false); else if (node.folder.parent) focusFolder(node.folder.parent); break;
    case 'Enter': case ' ': openFolder(node.folder.id); break;
    case 'F2': startRename(node.folder.id); break;
    default: return;
  }
  event.preventDefault();
}

// ---- files and selection -------------------------------------------------------------------------------------------
type SortKey = 'name' | 'size' | 'modified';
const sortKey = ref<SortKey>(props.sort?.key ?? 'name'); const sortDown = ref(props.sort?.down ?? false);
function sortBy(key: SortKey) { if (sortKey.value === key) sortDown.value = !sortDown.value; else { sortKey.value = key; sortDown.value = key !== 'name'; } }
const rows = computed(() => {
  if (props.ranked) return props.files;
  const key = sortKey.value; const sign = sortDown.value ? -1 : 1;
  return [...props.files].sort((a, b) => sign * (key === 'name' ? a.name.localeCompare(b.name, undefined, { numeric: true }) : (a[key] ?? -1) - (b[key] ?? -1)));
});
const picked = computed(() => new Set(props.selected));
const pickedRows = computed(() => rows.value.filter(f => picked.value.has(f.id)));
const all = computed(() => rows.value.length > 0 && pickedRows.value.length === rows.value.length);
const anchor = ref<string | null>(null);
const rowFocus = ref<string | null>(null);
const table = ref<HTMLElement>();
const setSelected = (ids: string[]) => { if (!ids.length) anchor.value = null; emit('update:selected', ids); };
// A file that left the folder (moved, deleted, another folder opened) leaves the selection with it.
watch(() => props.files, files => { const here = new Set(files.map(f => f.id)); const kept = props.selected.filter(id => here.has(id)); if (kept.length !== props.selected.length) setSelected(kept);
  if (rowFocus.value && !here.has(rowFocus.value)) rowFocus.value = null; });
function range(to: string): string[] {
  const ids = rows.value.map(f => f.id); const a = ids.indexOf(anchor.value ?? to); const b = ids.indexOf(to);
  return a < 0 || b < 0 ? [to] : ids.slice(Math.min(a, b), Math.max(a, b) + 1);
}
function toggleOne(id: string) { setSelected(picked.value.has(id) ? props.selected.filter(x => x !== id) : [...props.selected, id]); anchor.value = id; }
function onRowClick(event: MouseEvent, id: string) {
  rowFocus.value = id;
  if (event.shiftKey) setSelected(range(id));
  else if (event.metaKey || event.ctrlKey) toggleOne(id);
  else { setSelected([id]); anchor.value = id; }
}
function onCheck(event: MouseEvent, id: string) { focusRow(id); if (event.shiftKey && anchor.value) setSelected([...new Set([...props.selected, ...range(id)])]); else toggleOne(id); }
function focusRow(id: string) { rowFocus.value = id; nextTick(() => table.value?.querySelector<HTMLElement>(`[data-file="${CSS.escape(id)}"]`)?.focus()); }
function onTableKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('input, button')) { if (event.key !== 'Escape') return; }
  const ids = rows.value.map(f => f.id); if (!ids.length) return;
  const at = Math.max(0, ids.indexOf(rowFocus.value ?? ids[0]));
  // In the grid, up and down go a whole line of cards; left and right go one.
  const cards = view.value === 'grid' ? [...(table.value?.querySelectorAll<HTMLElement>('.oui-files-card[data-file]') ?? [])] : [];
  const perLine = Math.max(1, cards.filter(c => c.offsetTop === cards[0]?.offsetTop).length);
  const go = (i: number) => { const id = ids[Math.max(0, Math.min(ids.length - 1, i))]; if (event.shiftKey) { anchor.value ??= ids[at]; setSelected(range(id)); } else anchor.value = id; focusRow(id); };
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') setSelected(ids);
  else switch (event.key) {
    case 'ArrowDown': go(at + perLine); break;
    case 'ArrowUp': go(at - perLine); break;
    case 'ArrowRight': if (!cards.length) return; go(at + 1); break;
    case 'ArrowLeft': if (!cards.length) return; go(at - 1); break;
    case 'Home': go(0); break;
    case 'End': go(ids.length - 1); break;
    case 'F2': startRename(ids[at]); break;
    case ' ': toggleOne(ids[at]); break;
    case 'Enter': emit('open', ids[at]); break;
    case 'Escape': setSelected([]); break;
    // props.selected is not updated yet when the row was selected just now: say which files, do not read them back.
    case 'Delete': case 'Backspace': if (props.selected.length) askDelete(); else { setSelected([ids[at]]); anchor.value = ids[at]; askDelete([ids[at]]); } break;
    default: return;
  }
  event.preventDefault();
}

// ---- move and delete -----------------------------------------------------------------------------------------------
const takes = (f: OuiFolder | undefined) => !!f && !f.locked && !f.readonly;
const targets = computed(() => props.folders.filter(f => takes(f) && f.id !== props.folder).map(f => ({ id: f.id, label: trail(f.id).map(x => x.name).join(' / ') })));
const moveChoice = ref<string | null>(null);
const canMove = computed(() => hasTree.value && props.movable && targets.value.length > 0);
function move(to: string, ids = props.selected) { if (!canMove.value || locked.value || !ids.length || to === props.folder || !takes(byId.value.get(to))) return; emit('move', { ids: [...ids], to }); setSelected([]); }
function onMoveChoice(to: string | null) { if (to) move(to); nextTick(() => { moveChoice.value = null; }); }
const confirming = ref<string[]>([]);
function askDelete(ids: string[] = props.selected) { if (!locked.value && ids.length) confirming.value = [...ids]; }
function confirmDelete() { emit('delete', confirming.value); confirming.value = []; }
const confirmNames = computed(() => confirming.value.slice(0, 4).map(id => props.files.find(f => f.id === id)?.name ?? id));

// Dragging files onto a folder. Pointer events, not HTML5 drag and drop: OrcaSlicer on macOS replaces WKWebView's drop
// handling for the whole app (MacDarkMode.mm, `WKWebView (DragDrop)`) so a page never gets dragover or drop, while pointer
// events reach the page in every web view (WKWebView, WebView2, WebKitGTK). Pressing a row and moving a few pixels starts
// the drag: the dragged row joins or replaces the selection, a ghost (the file taken, and how many) follows the pointer,
// folders that cannot take the files are dimmed, and only the folder under the pointer is marked. Releasing on a folder
// that takes them moves them; anywhere else, or Escape, sends the ghost back to its row. "Move to" does the same from the keyboard.
const DRAG_SLOP = 5;
const dragging = ref<string[]>([]);
const dropOn = ref<string | null>(null);
const refused = ref(false);
const ghost = ref<HTMLElement>();
const grabbed = ref('');
const ghostFile = computed<{ name: string; thumb?: string | null } | undefined>(() => (dragKind.value === 'folder' ? byId.value.get(grabbed.value) : props.files.find(f => f.id === grabbed.value)));
let press: { id: string; x: number; y: number; row: HTMLElement; pointer: number; kind: 'files' | 'folder' } | null = null;
/** Files from the list, or a folder from the tree (it goes into another folder of its root, with all it holds). */
const dragKind = ref<'files' | 'folder'>('files');
let point = { x: 0, y: 0 }; let origin = { x: 0, y: 0 }; let frame = 0;
const returning = ref(false);
const active = computed(() => dragging.value.length > 0 && !returning.value);
/** Where the dragged folder can go: not itself, not inside itself, not where it is (folderTargets). */
const folderDrop = computed(() => new Set(dragKind.value === 'folder' && dragging.value[0] ? folderTargets(dragging.value[0]).map(f => f.id) : []));
const canDrop = (id: string) => active.value && (dragKind.value === 'folder' ? folderDrop.value.has(id) : id !== props.folder && takes(byId.value.get(id)));
const place = () => { if (ghost.value) ghost.value.style.transform = `translate(${point.x - origin.x - 14}px, ${point.y - origin.y - 14}px)`; };
function hover() {
  const el = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-folder]');
  const id = el && tree.value?.contains(el) ? el.dataset.folder ?? null : null;
  dropOn.value = id && canDrop(id) ? id : null; refused.value = !!id && !dropOn.value;
  document.documentElement.dataset.ouiDrag = refused.value ? 'refused' : 'move';
}
// The release ends a drag, not a click: the click that follows on the row would select it alone again.
function eatClick() { const eat = (e: Event) => { e.stopPropagation(); e.preventDefault(); }; window.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', eat, true)); }
function onRowPointerDown(event: PointerEvent, id: string) {
  if (event.button !== 0 || !event.isPrimary || returning.value || !canMove.value || locked.value || (event.target as HTMLElement).closest('input, button')) return;
  press = { id, x: event.clientX, y: event.clientY, row: event.currentTarget as HTMLElement, pointer: event.pointerId, kind: 'files' };
  listen();
}
function onFolderPointerDown(event: PointerEvent, id: string) {
  if (event.button !== 0 || !event.isPrimary || returning.value || !props.foldersMovable || editOff.value || !canEditFolder(id) || (event.target as HTMLElement).closest('input, .oui-files-twisty')) return;
  press = { id, x: event.clientX, y: event.clientY, row: event.currentTarget as HTMLElement, pointer: event.pointerId, kind: 'folder' };
  listen();
}
function listen() {
  window.addEventListener('pointermove', onDragMove); window.addEventListener('pointerup', onDragUp); window.addEventListener('pointercancel', onDragCancel); window.addEventListener('keydown', onDragKey, true);
}
function startDrag() {
  if (!press) return;
  dragKind.value = press.kind;
  const ids = press.kind === 'folder' || picked.value.has(press.id) ? (press.kind === 'folder' ? [press.id] : [...props.selected]) : [press.id];
  if (press.kind === 'files' && !picked.value.has(press.id)) { setSelected(ids); anchor.value = press.id; }
  dragging.value = ids; grabbed.value = press.id;
  try { press.row.setPointerCapture(press.pointer); } catch { /* the pointer is already gone: the up that follows ends the drag */ }
  nextTick(() => { if (!ghost.value) return; ghost.value.style.transform = 'none'; const r = ghost.value.getBoundingClientRect(); origin = { x: r.left, y: r.top }; place(); });
  hover();
}
function onDragMove(event: PointerEvent) {
  if (!press || event.pointerId !== press.pointer) return;
  point = { x: event.clientX, y: event.clientY };
  // The button is up but its pointerup never came (released outside the window before the drag began): no drag.
  if (!dragging.value.length) { if (!(event.buttons & 1)) { endDrag(); return; } if (Math.hypot(point.x - press.x, point.y - press.y) < DRAG_SLOP) return; startDrag(); }
  if (!frame) frame = requestAnimationFrame(() => { frame = 0; place(); hover(); });
}
function endDrag() {
  window.removeEventListener('pointermove', onDragMove); window.removeEventListener('pointerup', onDragUp); window.removeEventListener('pointercancel', onDragCancel); window.removeEventListener('keydown', onDragKey, true);
  cancelAnimationFrame(frame); frame = 0; delete document.documentElement.dataset.ouiDrag;
  dropOn.value = null; refused.value = false; press = null;
}
// The ghost goes back to the row it came from, then away; at once when motion is reduced.
function sendBack(row: HTMLElement) {
  const ids = dragging.value; endDrag();
  const el = ghost.value; const r = row.getBoundingClientRect();
  if (!el || !el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { dragging.value = []; return; }
  returning.value = true;
  el.animate([{ transform: el.style.transform }, { transform: `translate(${r.left - origin.x}px, ${r.top + (r.height - el.offsetHeight) / 2 - origin.y}px)`, opacity: 0 }],
    { duration: 180, easing: 'cubic-bezier(.2, 0, 0, 1)' }).onfinish = () => { returning.value = false; if (dragging.value === ids) dragging.value = []; };
}
function onDragUp(event: PointerEvent) {
  if (!press || event.pointerId !== press.pointer) return;
  if (!dragging.value.length) { endDrag(); return; }
  eatClick();
  point = { x: event.clientX, y: event.clientY }; hover();
  const to = dropOn.value; const row = press.row;
  if (!to) { sendBack(row); return; }
  const ids = dragging.value; const kind = press.kind; endDrag(); dragging.value = [];
  if (kind === 'folder') emit('move-folder', { id: ids[0], to }); else move(to, ids);
}
function onDragCancel(event: PointerEvent) { if (press && event.pointerId === press.pointer) { if (dragging.value.length) sendBack(press.row); else endDrag(); } }
function onDragKey(event: KeyboardEvent) { if (event.key !== 'Escape' || !press || !dragging.value.length) return; event.preventDefault(); event.stopPropagation(); sendBack(press.row);
  window.addEventListener('pointerup', eatClick, { capture: true, once: true }); }
onBeforeUnmount(() => { if (press) endDrag(); });

// Naming in place, as Finder does: a new folder (in the tree under its parent, or at the top of the list for the open
// folder) or a renamed file or folder gets a name field, prefilled and selected. Enter or a click elsewhere in the page
// commits; Escape cancels; a name that is refused, here or by the storage, says why under the field and keeps it open.
// Focus leaving the page itself (the window, or OrcaSlicer taking it) commits nothing: the field waits for the user.
const FOLDER_ERRORS: Record<OuiFolderNameError, string> = { empty: 'Type a name.', invalid: "A name can't contain / or be . or ..", spaces: "A name can't start or end with a space.",
  long: 'A name has at most 255 characters.', taken: 'This folder already has one with that name.' };
interface Editing { op: 'new' | 'rename'; id: string; folder: boolean; inList: boolean; name: string; was: string; error: string; busy: boolean }
const editing = ref<Editing | null>(null);
// The one name field on screen (it is drawn in the tree, the list or the grid).
let nameInput: HTMLInputElement | null = null;
const onField = (el: unknown) => { nameInput = el instanceof HTMLInputElement ? el : nameInput?.isConnected ? nameInput : null; };
const editOff = computed(() => props.readonly || props.busy);
const canCreate = (id: string) => props.creatable && hasTree.value && !!byId.value.get(id) && !byId.value.get(id)?.readonly;
const canEditFolder = (id: string) => !!byId.value.get(id)?.parent && !byId.value.get(id)?.readonly && !byId.value.get(id)?.locked;
const parentOf = (id: string) => byId.value.get(id)?.parent ?? '';
/** The names already used where the edited name goes (any case), the edited item itself left out. */
function takenNames(e: Editing): Set<string> {
  const list = e.folder ? (children.value.get(e.op === 'new' ? e.id : parentOf(e.id)) ?? []) : props.files;
  return new Set(list.filter(f => f.id !== (e.op === 'rename' ? e.id : null)).map(f => f.name.toLowerCase()));
}
function focusField() { nextTick(() => { const el = nameInput; if (!el) return; el.scrollIntoView({ block: 'nearest' }); el.focus();
  const dot = el.value.lastIndexOf('.'); el.setSelectionRange(0, editing.value?.folder || dot <= 0 ? el.value.length : dot); }); }
function startNew(parent = props.folder, inList = parent === props.folder) {
  if (!canCreate(parent) || editOff.value) return;
  const base = props.labels.newFolder ?? 'New folder'; let name = base;
  const e: Editing = { op: 'new', id: parent, folder: true, inList, name, was: '', error: '', busy: false };
  const taken = takenNames(e); for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} ${n}`;
  if (!inList) toggle(parent, true);
  editing.value = { ...e, name }; focusField();
}
function startRename(id: string) {
  const file = props.files.find(f => f.id === id); const folder = byId.value.get(id);
  if (!props.renamable || editOff.value || (file ? locked.value : !folder || !canEditFolder(id))) return;
  const name = (file ?? folder)!.name;
  editing.value = { op: 'rename', id, folder: !file, inList: !!file, name, was: name, error: '', busy: false }; focusField();
}
function nameError(e: Editing): OuiFolderNameError | null {
  const name = e.name;
  if (!name.trim()) return 'empty';
  if (/[/\\]/.test(name) || name === '.' || name === '..') return 'invalid';
  if (name !== name.trim()) return 'spaces';
  if (name.length > 255) return 'long';
  return takenNames(e).has(name.toLowerCase()) ? 'taken' : null;
}
async function commitEdit() {
  const e = editing.value; if (!e || e.busy) return;
  if (e.op === 'rename' && e.name === e.was) { endEdit(); return; }
  const reason = nameError(e);
  if (reason) { e.error = props.labels.folderError?.(reason) ?? FOLDER_ERRORS[reason]; focusField(); return; }
  const op: OuiFileOp = e.op === 'new' ? { kind: 'create', parent: e.id, name: e.name } : { kind: 'rename', id: e.id, name: e.name, folder: e.folder };
  if (!props.act) { op.kind === 'create' ? emit('create-folder', { parent: op.parent, name: op.name }) : emit('rename', op); endEdit(); return; }
  e.busy = true;
  try { await props.act(op); if (editing.value === e) editing.value = null; }
  catch (err) { if (editing.value !== e) return; e.busy = false; e.error = err instanceof Error ? err.message : String(err); focusField(); }
}
function endEdit() { const e = editing.value; editing.value = null; if (e && !e.inList) focusFolder(e.op === 'new' ? e.id : e.id); else if (e?.op === 'rename') focusRow(e.id); }
function onFieldKey(event: KeyboardEvent) {
  event.stopPropagation();   // the tree's and the table's own keys (arrows, Space, Enter, Delete) are not for the field
  if (event.key === 'Enter') { event.preventDefault(); void commitEdit(); } else if (event.key === 'Escape') { event.preventDefault(); endEdit(); }
}
// A click elsewhere in the page commits, as Enter does. Blur also comes when the page itself loses focus (another window,
// OrcaSlicer's own controls): then nothing is committed and the field stays as it is.
function onFieldBlur() { setTimeout(() => { if (editing.value && !editing.value.busy && document.hasFocus() && !nameInput?.matches(':focus')) void commitEdit(); }); }

// The context menus (OuiMenu): a file or the selection, a folder, the empty part of the list, the empty part of the tree.
const menu = ref<InstanceType<typeof OuiMenu>>();
const L = (key: 'rename' | 'moveTo' | 'remove' | 'newFolder' | 'refresh', fallback: string) => props.labels[key] ?? fallback;
const refreshItem = (): OuiFileMenuItem => ({ label: L('refresh', 'Refresh'), icon: refreshIcon, separator: true, id: 'refresh', run: () => emit('refresh') });
const newFolderItem = (parent: string, inList: boolean): OuiFileMenuItem[] => (props.creatable && hasTree.value
  ? [{ label: L('newFolder', 'New folder'), icon: folderPlus, id: 'new-folder', disabled: editOff.value || !canCreate(parent), run: () => startNew(parent, inList) }] : []);
function onFolderMenu(event: MouseEvent, id: string) {
  const off = editOff.value; const own = canEditFolder(id);
  menu.value?.open(event, [
    ...newFolderItem(id, false),
    ...(props.renamable && own ? [{ label: L('rename', 'Rename'), icon: renameIcon, id: 'rename', disabled: off, run: () => startRename(id) }] : []),
    ...(props.foldersMovable && own ? [{ label: L('moveTo', 'Move to…'), icon: folderMoveIcon, id: 'move', disabled: off || !folderTargets(id).length, run: () => askMoveFolder(id) }] : []),
    ...(props.foldersRemovable && own ? [{ label: L('remove', 'Delete'), icon: trash, id: 'delete', danger: true, disabled: off, run: () => askDeleteFolder(id) }] : []),
    ...(props.folderMenu?.(id) ?? []),
    refreshItem(),
  ]);
}
function onFileMenu(event: MouseEvent, id: string) {
  // As in Finder: a file of the selection acts for the selection; another file is selected alone first.
  const ids = picked.value.has(id) ? [...props.selected] : [id];
  if (!picked.value.has(id)) { setSelected(ids); anchor.value = id; }
  rowFocus.value = id;
  menu.value?.open(event, [
    ...(props.fileMenu?.(ids) ?? []),
    ...(props.renamable && ids.length === 1 ? [{ label: L('rename', 'Rename'), icon: renameIcon, id: 'rename', disabled: locked.value, run: () => startRename(id) }] : []),
    ...(canMove.value ? [{ label: L('moveTo', 'Move to…'), icon: folderMoveIcon, id: 'move', disabled: locked.value, run: () => askMoveFiles(ids) }] : []),
    { label: L('remove', 'Delete'), icon: trash, id: 'delete', danger: true, disabled: locked.value, run: () => askDelete(ids) },
  ]);
}
/** The empty part of the list: the open folder (a new folder in it), the whole list, how it is shown, reading it again. */
function onListMenu(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('[data-file], .oui-files-newrow, input, button, thead')) return;
  const grid = view.value === 'grid';
  menu.value?.open(event, [
    ...newFolderItem(props.folder, true),
    { label: props.labels.selectAll, icon: selectAllIcon, id: 'select-all', disabled: !rows.value.length, run: () => setSelected(rows.value.map(f => f.id)) },
    { label: grid ? props.labels.listView ?? 'List' : props.labels.gridView ?? 'Grid', icon: grid ? viewListIcon : viewGridIcon, id: 'view', run: () => setView(grid ? 'list' : 'grid') },
    refreshItem(),
  ]);
}
/** The empty part of the tree: a new folder in the open one, reading again. */
function onTreeMenu(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('[data-folder], input')) return;
  menu.value?.open(event, [...newFolderItem(props.folder, false), refreshItem()]);
}

// "Move to…" from a menu, for files or a folder: the folders it can go to, in a question.
const moving = ref<{ ids: string[]; folder: boolean; to: string | null } | null>(null);
/** Where a folder can go: the same root, not itself, not inside itself, not where it already is, nowhere locked or read only. */
function folderTargets(id: string) {
  const root = trail(id)[0]?.id; const inside = (f: string) => trail(f).some(x => x.id === id);
  return props.folders.filter(f => takes(f) && trail(f.id)[0]?.id === root && !inside(f.id) && f.id !== parentOf(id)).map(f => ({ id: f.id, label: trail(f.id).map(x => x.name).join(' / ') }));
}
const moveChoices = computed(() => (moving.value?.folder ? folderTargets(moving.value.ids[0]) : targets.value));
function askMoveFiles(ids: string[]) { if (canMove.value && !locked.value) moving.value = { ids, folder: false, to: null }; }
function askMoveFolder(id: string) { if (props.foldersMovable && !editOff.value) moving.value = { ids: [id], folder: true, to: null }; }
function confirmMove() {
  const m = moving.value; if (!m?.to) return; moving.value = null;
  if (m.folder) emit('move-folder', { id: m.ids[0], to: m.to }); else move(m.to, m.ids);
}
// Deleting a folder asks first, and says its contents go too.
const deletingFolder = ref<string | null>(null);
function askDeleteFolder(id: string) { if (props.foldersRemovable && !editOff.value && canEditFolder(id)) deletingFolder.value = id; }
function confirmDeleteFolder() { const id = deletingFolder.value; deletingFolder.value = null; if (id) emit('delete-folder', id); }
defineExpose({ newFolder: startNew, rename: startRename, moveFolder: askMoveFolder, deleteFolder: askDeleteFolder });

// List or grid: the user's choice, kept per page and `viewKey` in this browser (as OuiSettings keeps its page).
const viewStore = () => (props.viewKey ? `oui-files-view:${location.pathname}:${props.viewKey}` : '');
const view = ref<'list' | 'grid'>((() => { try { return viewStore() && localStorage.getItem(viewStore()) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } })());
function setView(v: 'list' | 'grid') { view.value = v; try { if (viewStore()) localStorage.setItem(viewStore(), v); } catch { /* not kept: the choice holds for this visit */ } emit('update:view', v); }
const extOf = (name: string) => { const dot = name.lastIndexOf('.'); return dot > 0 && name.length - dot <= 7 ? name.slice(dot) : ''; };
/** A card's name: without its extension (it is shown under the name), and with a place to break after each separator
 *  (a zero-width space), so a line breaks between words ("cable_clip_x10") rather than inside one. The card's title has the whole name. */
function cardParts(f: OuiFile): { text: string; hit: boolean }[] {
  const end = f.name.length - extOf(f.name).length; let at = 0; const out: { text: string; hit: boolean }[] = [];
  for (const part of nameParts(f)) { const text = part.text.slice(0, Math.max(0, end - at)); at += part.text.length; if (text) out.push({ text: text.replace(/([_\-. ])/g, '$1\u200B'), hit: part.hit }); }
  return out;
}
/** A name with the characters a search matched marked. */
function nameParts(f: OuiFile): { text: string; hit: boolean }[] {
  if (!f.match?.length) return [{ text: f.name, hit: false }];
  const hits = new Set(f.match); const out: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < f.name.length; i++) { const hit = hits.has(i); const last = out[out.length - 1]; if (last?.hit === hit) last.text += f.name[i]; else out.push({ text: f.name[i], hit }); }
  return out;
}

const one = computed(() => (pickedRows.value.length === 1 ? pickedRows.value[0] : null));

// When what had focus goes away (the deleted or moved rows, the bar's buttons once nothing is selected), focus stays in the
// list instead of falling to the page: on the first row, or on the list itself when it is empty. The same when the delete
// question has closed and the row it would give focus back to is already gone.
const list = ref<HTMLElement>();
let hadFocus = false;
// Sticky until onUpdated has read it: one change of the files can update this component twice in the same flush (the rows,
// then the selection that the gone rows leave), and by the second time the focused row has already been removed.
onBeforeUpdate(() => { hadFocus ||= !!list.value?.contains(document.activeElement); });
// Never from the context menu or a name field: they are this component's too, outside the list.
function holdFocus() { if (menu.value?.contains(document.activeElement) || document.activeElement === nameInput) return; if (!list.value?.contains(document.activeElement)) (table.value?.querySelector<HTMLElement>('.oui-files-row[tabindex="0"]') ?? list.value)?.focus(); }
onUpdated(() => { if (hadFocus) holdFocus(); hadFocus = false; });
</script>
<template>
  <div class="oui-files"><div class="oui-files-grid" :data-flat="!hasTree || undefined" :data-dragging="active || undefined">
    <nav v-if="hasTree" class="oui-files-rail" :aria-label="labels.folders">
      <p class="oui-label oui-files-railhead">{{ labels.folders }}</p>
      <div ref="tree" class="oui-files-tree" role="tree" :aria-label="labels.folders" @keydown="onTreeKey" @contextmenu="onTreeMenu">
        <template v-for="node in nodes" :key="node.folder.id"><div role="treeitem" class="oui-files-folder" :data-folder="node.folder.id" :aria-level="node.depth" :aria-expanded="node.branch ? node.open : undefined"
          :aria-selected="node.folder.id === folder" :aria-current="node.folder.id === folder ? 'true' : undefined" :tabindex="node.folder.id === treeStop ? 0 : -1"
          :data-drop="dropOn === node.folder.id || undefined" :data-refused="(active && !canDrop(node.folder.id)) || undefined" :style="{ paddingInlineStart: 4 + (node.depth - 1) * 16 + 'px' }"
          :data-dragged="(dragKind === 'folder' && dragging.includes(node.folder.id)) || undefined" @click="openFolder(node.folder.id)" @focus="treeFocus = node.folder.id"
          @contextmenu="onFolderMenu($event, node.folder.id)" @pointerdown="onFolderPointerDown($event, node.folder.id)" @dragstart.prevent>
          <span class="oui-files-twisty" :data-branch="node.branch || undefined" aria-hidden="true" @click.stop="node.branch && toggle(node.folder.id)"><OuiIcon v-if="node.branch" :icon="node.open ? chevronDown : chevronRight" :size="14" /></span>
          <OuiIcon :icon="folderIcon" :size="15" /><template v-if="editing?.op === 'rename' && editing.id === node.folder.id"><span class="oui-files-newname"><input :ref="onField" v-model="editing.name" class="p-inputtext p-inputtext-sm" data-files-newname :aria-label="labels.folderName ?? labels.newFolder ?? 'Name'"
              :readonly="editing.busy" :aria-busy="editing.busy || undefined" :aria-invalid="!!editing.error || undefined" :aria-describedby="editing.error ? 'oui-files-nameerror' : undefined" maxlength="300"
              @keydown="onFieldKey" @input="editing.error = ''" @blur="onFieldBlur" @click.stop @dblclick.stop @pointerdown.stop>
              <span v-if="editing.error" id="oui-files-nameerror" class="oui-files-nameerror" role="alert">{{ editing.error }}</span></span></template><span v-else class="oui-truncate oui-files-foldername">{{ node.folder.name }}</span>
          <span v-if="node.folder.count != null" class="oui-meta oui-num">{{ node.folder.count }}</span>
        </div>
        <div v-if="editing?.op === 'new' && !editing.inList && editing.id === node.folder.id" role="treeitem" class="oui-files-newfolder" :aria-level="node.depth + 1" :style="{ paddingInlineStart: 4 + node.depth * 16 + 'px' }">
          <span class="oui-files-twisty" aria-hidden="true" /><OuiIcon :icon="folderIcon" :size="15" />
          <span class="oui-files-newname"><input :ref="onField" v-model="editing.name" class="p-inputtext p-inputtext-sm" data-files-newname :aria-label="labels.folderName ?? labels.newFolder ?? 'Name'"
              :readonly="editing.busy" :aria-busy="editing.busy || undefined" :aria-invalid="!!editing.error || undefined" :aria-describedby="editing.error ? 'oui-files-nameerror' : undefined" maxlength="300"
              @keydown="onFieldKey" @input="editing.error = ''" @blur="onFieldBlur" @click.stop @dblclick.stop @pointerdown.stop>
              <span v-if="editing.error" id="oui-files-nameerror" class="oui-files-nameerror" role="alert">{{ editing.error }}</span></span>
        </div></template>
      </div>
      <div v-if="$slots.rail" class="oui-files-railfoot"><slot name="rail" /></div>
    </nav>

    <section ref="list" class="oui-files-list" :aria-label="labels.files" tabindex="-1">
      <div v-if="hasTree || $slots.toolbar" class="oui-files-toolbar">
        <ol v-if="hasTree" class="oui-files-path" :aria-label="labels.folders">
          <li v-for="(f, i) in path" :key="f.id"><OuiIcon v-if="i" :icon="chevronRight" :size="12" class="oui-muted" />
            <button v-if="i < path.length - 1" type="button" class="oui-files-crumb" @click="openFolder(f.id)">{{ f.name }}</button><strong v-else aria-current="page">{{ f.name }}</strong></li>
        </ol>
        <div v-if="hasTree && ($slots.folder || canCreate(folder))" class="oui-files-folderactions"><slot name="folder" :folder="byId.get(folder)" />
          <Button v-if="canCreate(folder)" :label="labels.newFolder ?? 'New folder'" severity="secondary" size="small" :disabled="editOff" :aria-describedby="describedby" data-files-mkdir @click="startNew()">
            <template #icon><OuiIcon :icon="folderPlus" :size="14" /></template></Button></div>
        <div v-if="$slots.toolbar" class="oui-files-tools"><slot name="toolbar" /></div>
      </div>
      <!-- Always there, so selecting does not move the table: the count, and what can be done with the selection. -->
      <div class="oui-files-bar" role="toolbar" :aria-label="labels.selected(selected.length)">
        <span class="oui-num oui-strong" aria-live="polite">{{ selected.length ? labels.selected(selected.length) : labels.items(rows.length) }}</span>
        <template v-if="selected.length">
          <Button :label="labels.clear" severity="secondary" text size="small" @click="setSelected([])"><template #icon><OuiIcon :icon="closeIcon" :size="13" /></template></Button>
          <span class="oui-spacer" />
          <slot name="bulk" :ids="selected" />
          <Select v-if="canMove" v-model="moveChoice" :options="targets" option-label="label" option-value="id" :placeholder="labels.moveTo" :aria-label="labels.moveTo" size="small" class="oui-files-move"
            :disabled="locked" :aria-describedby="describedby" @update:model-value="onMoveChoice" />
          <Button :label="labels.remove" severity="danger" outlined size="small" :disabled="locked" :aria-describedby="describedby" @click="askDelete()"><template #icon><OuiIcon :icon="trash" :size="13" /></template></Button>
        </template>
        <div class="oui-files-views" role="group" :aria-label="(labels.listView ?? 'List') + ' / ' + (labels.gridView ?? 'Grid')">
            <button v-for="v in (['list', 'grid'] as const)" :key="v" type="button" class="oui-files-view" :aria-pressed="view === v" :aria-label="v === 'list' ? labels.listView ?? 'List' : labels.gridView ?? 'Grid'"
              :title="v === 'list' ? labels.listView ?? 'List' : labels.gridView ?? 'Grid'" :data-files-view="v" @click="setView(v)"><OuiIcon :icon="v === 'list' ? viewListIcon : viewGridIcon" :size="16" /></button></div>
      </div>
      <div class="oui-files-scroll" @contextmenu="onListMenu">
        <OuiEmpty v-if="error" state="error" :title="labels.loadFailed ?? error" :text="labels.loadFailed ? error : undefined">
          <template v-if="labels.retry" #actions><Button :label="labels.retry" severity="secondary" size="small" data-files-retry @click="emit('retry')" /></template>
        </OuiEmpty>
        <table v-else-if="view === 'list'" ref="table" class="oui-files-table" role="grid" aria-multiselectable="true" :aria-busy="loading || busy || undefined" @keydown="onTableKey">
          <thead><tr>
            <th class="oui-files-check"><input type="checkbox" :checked="all" :indeterminate="selected.length > 0 && !all" :aria-label="labels.selectAll" :disabled="!rows.length" @change="setSelected(all ? [] : rows.map(f => f.id))"></th>
            <th v-for="col in (['name', 'size', 'modified'] as const)" :key="col" :class="{ 'oui-num': col !== 'name' }" :aria-sort="sortKey === col ? (sortDown ? 'descending' : 'ascending') : 'none'">
              <button type="button" class="oui-files-sort" @click="sortBy(col)">{{ labels[col] }}<OuiIcon v-if="sortKey === col" :icon="chevronDown" :size="12" :style="sortDown ? undefined : { transform: 'rotate(180deg)' }" /></button></th>
          </tr></thead>
          <tbody v-if="loading"><tr v-for="n in 6" :key="n" class="oui-files-skeleton"><td /><td><span class="oui-skeleton" :style="{ width: 40 + (n * 37) % 45 + '%' }" /></td><td><span class="oui-skeleton" /></td><td><span class="oui-skeleton" /></td></tr></tbody>
          <tbody v-else>
            <tr v-if="editing?.op === 'new' && editing.inList" class="oui-files-newrow"><td /><td colspan="3"><div class="oui-files-name"><OuiThumb :size="32" :icon="folderIcon" /><span class="oui-files-newname"><input :ref="onField" v-model="editing.name" class="p-inputtext p-inputtext-sm" data-files-newname :aria-label="labels.folderName ?? labels.newFolder ?? 'Name'"
              :readonly="editing.busy" :aria-busy="editing.busy || undefined" :aria-invalid="!!editing.error || undefined" :aria-describedby="editing.error ? 'oui-files-nameerror' : undefined" maxlength="300"
              @keydown="onFieldKey" @input="editing.error = ''" @blur="onFieldBlur" @click.stop @dblclick.stop @pointerdown.stop>
              <span v-if="editing.error" id="oui-files-nameerror" class="oui-files-nameerror" role="alert">{{ editing.error }}</span></span></div></td></tr>
            <tr v-for="f in rows" :key="f.id" class="oui-files-row" :data-file="f.id" :aria-selected="picked.has(f.id)" :tabindex="(rowFocus ?? rows[0].id) === f.id ? 0 : -1"
              :data-dragged="dragging.includes(f.id) || undefined" @click="onRowClick($event, f.id)" @dblclick="emit('open', f.id)" @focus="rowFocus = f.id" @pointerdown="onRowPointerDown($event, f.id)" @contextmenu="onFileMenu($event, f.id)" @dragstart.prevent>
              <td class="oui-files-check" @click.stop><input type="checkbox" tabindex="-1" :checked="picked.has(f.id)" :aria-label="labels.select(f.name)" @click="onCheck($event, f.id)"></td>
              <td><div class="oui-files-name"><OuiThumb :src="f.thumb" :size="32" :icon="fileIcon" /><template v-if="editing?.op === 'rename' && editing.id === f.id"><span class="oui-files-newname"><input :ref="onField" v-model="editing.name" class="p-inputtext p-inputtext-sm" data-files-newname :aria-label="labels.folderName ?? labels.newFolder ?? 'Name'"
              :readonly="editing.busy" :aria-busy="editing.busy || undefined" :aria-invalid="!!editing.error || undefined" :aria-describedby="editing.error ? 'oui-files-nameerror' : undefined" maxlength="300"
              @keydown="onFieldKey" @input="editing.error = ''" @blur="onFieldBlur" @click.stop @dblclick.stop @pointerdown.stop>
              <span v-if="editing.error" id="oui-files-nameerror" class="oui-files-nameerror" role="alert">{{ editing.error }}</span></span></template>
                <span v-else class="oui-truncate" :title="f.name"><template v-for="(part, i) in nameParts(f)" :key="i"><mark v-if="part.hit" class="oui-files-hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span><span v-if="f.kind" class="oui-chip">{{ f.kind }}</span></div></td>
              <td class="oui-num">{{ f.sizeText ?? '—' }}</td><td class="oui-num oui-muted">{{ f.modifiedText ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else ref="table" class="oui-files-cards" role="grid" aria-multiselectable="true" :aria-busy="loading || busy || undefined" @keydown="onTableKey">
          <template v-if="loading"><div v-for="n in 8" :key="n" class="oui-files-card oui-files-skeleton"><span class="oui-skeleton oui-files-cardpic" /><span class="oui-skeleton" /></div></template>
          <template v-else>
            <div v-if="editing?.op === 'new' && editing.inList" class="oui-files-card oui-files-newrow"><span class="oui-files-cardpic"><OuiIcon :icon="folderIcon" :size="40" /></span><span class="oui-files-newname"><input :ref="onField" v-model="editing.name" class="p-inputtext p-inputtext-sm" data-files-newname :aria-label="labels.folderName ?? labels.newFolder ?? 'Name'"
              :readonly="editing.busy" :aria-busy="editing.busy || undefined" :aria-invalid="!!editing.error || undefined" :aria-describedby="editing.error ? 'oui-files-nameerror' : undefined" maxlength="300"
              @keydown="onFieldKey" @input="editing.error = ''" @blur="onFieldBlur" @click.stop @dblclick.stop @pointerdown.stop>
              <span v-if="editing.error" id="oui-files-nameerror" class="oui-files-nameerror" role="alert">{{ editing.error }}</span></span></div>
            <div v-for="f in rows" :key="f.id" role="row" class="oui-files-row oui-files-card" :title="f.name" :data-file="f.id" :aria-selected="picked.has(f.id)" :tabindex="(rowFocus ?? rows[0].id) === f.id ? 0 : -1"
              :data-dragged="dragging.includes(f.id) || undefined" @click="onRowClick($event, f.id)" @dblclick="emit('open', f.id)" @focus="rowFocus = f.id" @pointerdown="onRowPointerDown($event, f.id)" @contextmenu="onFileMenu($event, f.id)" @dragstart.prevent>
              <span role="gridcell" class="oui-files-cardpic"><img v-if="f.thumb" :src="f.thumb" alt="" draggable="false" loading="lazy"><OuiIcon v-else :icon="fileIcon" :size="40" /></span>
              <span role="gridcell" class="oui-files-cardtext"><template v-if="editing?.op === 'rename' && editing.id === f.id"><span class="oui-files-newname"><input :ref="onField" v-model="editing.name" class="p-inputtext p-inputtext-sm" data-files-newname :aria-label="labels.folderName ?? labels.newFolder ?? 'Name'"
              :readonly="editing.busy" :aria-busy="editing.busy || undefined" :aria-invalid="!!editing.error || undefined" :aria-describedby="editing.error ? 'oui-files-nameerror' : undefined" maxlength="300"
              @keydown="onFieldKey" @input="editing.error = ''" @blur="onFieldBlur" @click.stop @dblclick.stop @pointerdown.stop>
              <span v-if="editing.error" id="oui-files-nameerror" class="oui-files-nameerror" role="alert">{{ editing.error }}</span></span></template>
                <span v-else class="oui-files-cardname" :title="f.name"><template v-for="(part, i) in cardParts(f)" :key="i"><mark v-if="part.hit" class="oui-files-hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
                <span class="oui-meta oui-files-cardmeta">{{ [extOf(f.name), f.sizeText ?? '—'].filter(Boolean).join(' · ') }}</span></span>
            </div>
          </template>
        </div>
        <OuiEmpty v-if="!error && !loading && !rows.length" compact :icon="folderIcon" :title="labels.empty" :text="labels.emptyText"><template v-if="$slots.empty" #actions><slot name="empty" /></template></OuiEmpty>
      </div>
      <div v-if="!hasTree && $slots.rail" class="oui-files-listfoot"><slot name="rail" /></div>
    </section>

    <aside class="oui-files-detail" aria-live="polite">
      <template v-if="one">
        <div class="oui-files-preview"><img v-if="one.thumb" :src="one.thumb" alt="" draggable="false"><OuiIcon v-else :icon="fileIcon" :size="28" tone="neutral" /></div>
        <div class="oui-files-detailhead"><h3 class="oui-files-detailname" :title="one.name">{{ one.name }}</h3><span v-if="one.kind" class="oui-chip">{{ one.kind }}</span></div>
        <OuiKeyValue :items="[{ label: labels.size, value: one.sizeText }, { label: labels.modified, value: one.modifiedText }, ...(one.facts ?? [])]" />
        <div v-if="$slots.actions" class="oui-files-detailactions"><slot name="actions" :file="one" /></div>
      </template>
      <template v-else-if="pickedRows.length">
        <div class="oui-files-preview"><OuiIcon :icon="filesIcon" :size="28" tone="neutral" /></div>
        <h3 class="oui-files-detailname">{{ labels.selected(pickedRows.length) }}</h3>
        <ul class="oui-files-names oui-meta"><li v-for="f in pickedRows.slice(0, 6)" :key="f.id" class="oui-truncate">{{ f.name }}</li><li v-if="pickedRows.length > 6">{{ labels.andMore(pickedRows.length - 6) }}</li></ul>
        <div v-if="$slots.selection" class="oui-files-detailactions"><slot name="selection" :files="pickedRows" /></div>
      </template>
      <OuiEmpty v-else :icon="fileIcon" :title="labels.nothingSelected" :text="labels.nothingSelectedText" />
    </aside>
  </div>
  <div v-if="dragging.length" ref="ghost" class="oui-files-ghost" aria-hidden="true"><OuiThumb :src="ghostFile?.thumb" :size="32" :icon="dragKind === 'folder' ? folderIcon : fileIcon" />
    <span class="oui-truncate">{{ ghostFile?.name }}</span><span v-if="dragging.length > 1" class="oui-files-ghostcount oui-num">{{ dragging.length }}</span></div>
  <OuiMenu ref="menu" />
  <OuiConfirm :visible="!!moving" :title="labels.moveTitle?.(moving?.ids.length ?? 0) ?? labels.moveTo" :confirm-label="labels.move ?? 'Move'" :cancel-label="labels.cancel"
    @update:visible="(v: boolean) => { if (!v) moving = null; }" @confirm="confirmMove">
    <Select v-if="moving" v-model="moving.to" :options="moveChoices" option-label="label" option-value="id" :placeholder="labels.moveTo" :aria-label="labels.moveTo" class="oui-files-moveto" data-files-moveto />
  </OuiConfirm>
  <OuiConfirm :visible="!!deletingFolder" :title="labels.removeFolderTitle?.(byId.get(deletingFolder ?? '')?.name ?? '') ?? `Delete ${byId.get(deletingFolder ?? '')?.name}?`" :confirm-label="labels.remove" :cancel-label="labels.cancel" danger
    @update:visible="(v: boolean) => { if (!v) deletingFolder = null; }" @confirm="confirmDeleteFolder">
    <p>{{ labels.removeFolderText ?? 'Everything in it is deleted too. This can’t be undone.' }}</p>
  </OuiConfirm>
  <OuiConfirm :visible="confirming.length > 0" :title="labels.removeTitle(confirming.length)" :confirm-label="labels.remove" :cancel-label="labels.cancel" danger
    @update:visible="(v: boolean) => { if (!v) confirming = []; }" @confirm="confirmDelete" @closed="holdFocus">
    <p>{{ labels.removeText }}</p>
    <ul class="oui-files-names"><li v-for="n in confirmNames" :key="n" class="oui-truncate oui-mono">{{ n }}</li><li v-if="confirming.length > confirmNames.length" class="oui-meta">{{ labels.andMore(confirming.length - confirmNames.length) }}</li></ul>
  </OuiConfirm></div>
</template>
<style>
/* One surface, three panes divided by hairlines. Give it a height (--oui-files-height) and each pane scrolls inside. */
.oui-files { container: oui-files / inline-size; min-width: 0; height: var(--oui-files-height, auto); min-height: 360px; }
.oui-files-grid { position: relative; display: grid; grid-template-columns: 232px minmax(0, 1fr) 300px; height: 100%; min-height: inherit; overflow: hidden; background: var(--oui-surface);
  border-radius: var(--oui-radius-lg); box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-panel); }
/* No folders: the table takes the rail's place. */
.oui-files-grid[data-flat] { grid-template-columns: minmax(0, 1fr) 300px; }
.oui-files-listfoot { padding: var(--oui-s2) var(--oui-s3); border-top: 1px solid var(--oui-border); }
.oui-files-rail { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-inline-end: 1px solid var(--oui-border); background: var(--oui-raised); }
.oui-files-railhead { padding: var(--oui-s3) var(--oui-s3) var(--oui-s1); }
.oui-files-tree { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 var(--oui-s1) var(--oui-s2); }
.oui-files-folder { display: flex; align-items: center; gap: 6px; min-height: 30px; padding-inline-end: var(--oui-s2); border-radius: var(--oui-radius); cursor: pointer; color: var(--oui-text); }
.oui-files-folder:hover { background: var(--oui-control); }
.oui-files-folder[aria-selected='true'] { font-weight: 650; background: var(--oui-control); box-shadow: inset 2px 0 0 var(--oui-primary-mark); }
.orca-ui .oui-files-folder:focus-visible { outline-offset: -2px; }
/* While files are dragged, folders that cannot take them are dimmed; only the one under the pointer is marked. */
.oui-files-grid[data-dragging] .oui-files-folder[data-refused] { opacity: .45; background: none; }
.oui-files-grid[data-dragging] .oui-files-folder[data-drop] { background: var(--oui-primary-soft); box-shadow: inset 0 0 0 2px var(--oui-primary-mark); }
html[data-oui-drag], html[data-oui-drag] * { cursor: grabbing !important; user-select: none; -webkit-user-select: none; }
html[data-oui-drag='refused'], html[data-oui-drag='refused'] * { cursor: not-allowed !important; }
.oui-files-twisty { flex: none; display: grid; place-items: center; width: 18px; height: 22px; color: var(--oui-muted); border-radius: var(--oui-radius-sm); }
.oui-files-twisty[data-branch]:hover { color: var(--oui-text); background: var(--oui-control-hover); }
.oui-files-foldername { flex: 1 1 0; }
.oui-files-newfolder { display: flex; align-items: flex-start; gap: 6px; padding-block: 3px; padding-inline-end: var(--oui-s2); }
.oui-files-newfolder > .oui-icon, .oui-files-newfolder > svg { margin-top: 6px; }
.oui-files-newname { flex: 1 1 0; display: grid; gap: 2px; min-width: 0; }
.oui-files-newname > input { width: 100%; min-width: 0; }
.oui-files-nameerror { font-size: var(--oui-text-xs); color: var(--oui-danger); }
.oui-files-newname > .oui-files-nameerror { white-space: normal; }
.oui-files-hit { padding: 0; color: inherit; background: none; font-weight: 800; text-decoration: underline; text-decoration-color: var(--oui-primary-mark); text-underline-offset: 2px; }
.oui-files-views { display: inline-flex; margin-inline-start: auto; padding: 2px; border-radius: var(--oui-radius); background: var(--oui-inset); box-shadow: inset 0 0 0 1px var(--oui-border); }
.oui-files-view { display: grid; place-items: center; width: 28px; height: 24px; border: 0; border-radius: var(--oui-radius-sm); color: var(--oui-muted); background: none; cursor: pointer; }
.oui-files-view:hover { color: var(--oui-text); }
.oui-files-view[aria-pressed='true'] { color: var(--oui-text); background: var(--oui-control); box-shadow: inset 0 0 0 1px var(--oui-control-border); }
/* Grid: a card a file, its picture over its name and size. */
.oui-files-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: var(--oui-s2); padding: var(--oui-s3); }
.oui-files-card { display: grid; grid-template-rows: auto auto; gap: 6px; min-width: 0; padding: 6px; border-radius: var(--oui-radius); }
.oui-files-cardpic { display: grid; place-items: center; aspect-ratio: 4 / 3; overflow: hidden; border-radius: var(--oui-radius-sm); color: var(--oui-muted); background: var(--oui-inset); box-shadow: inset 0 0 0 1px var(--oui-border); }
.oui-files-cardpic > img { display: block; width: 100%; height: 100%; object-fit: contain; -webkit-user-drag: none; }
.oui-files-cardtext { display: grid; gap: 2px; min-width: 0; }
.oui-files-cardname { font-weight: 600; overflow-wrap: break-word; word-break: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.oui-files-card.oui-files-skeleton > .oui-skeleton:last-child { height: 12px; }
.oui-files-moveto { width: 100%; }
.oui-files-railfoot { padding: var(--oui-s3); border-top: 1px solid var(--oui-border); }
.oui-files-list { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
/* Only the rows give way when the list is short: the toolbar, the bar and the foot keep their height (a wrapped toolbar was cut). */
.oui-files-toolbar, .oui-files-bar, .oui-files-listfoot { flex: none; }
.orca-ui .oui-files-list:focus { outline: none; }
.oui-files-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2) var(--oui-s3); min-height: 48px; padding: var(--oui-s2) var(--oui-s3); }
/* The path, the open folder's actions right after it, and the page's tools at the far end. */
.oui-files-path { flex: 0 1 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 2px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.oui-files-path > li { display: inline-flex; align-items: center; gap: 2px; min-width: 0; }
.oui-files-path strong { padding: 0 4px; font-weight: 700; }
.oui-files-crumb { padding: 2px 4px; border: 0; border-radius: var(--oui-radius-sm); color: var(--oui-muted); background: none; cursor: pointer; }
.oui-files-crumb:hover { color: var(--oui-text); background: var(--oui-control); }
.oui-files-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2); margin-inline-start: auto; }
/* No folders, so no path before it: the slot is the whole bar, from its left. A page spreads its items with .oui-spacer. */
.oui-files-grid[data-flat] .oui-files-tools { flex: 1 1 auto; margin-inline-start: 0; }
.oui-files-folderactions { display: flex; align-items: center; gap: var(--oui-s1); }
.oui-files-bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2); min-height: 40px; padding: 4px var(--oui-s3); background: var(--oui-raised); border-block: 1px solid var(--oui-border); }
.oui-files-move { min-width: 150px; }
.oui-files-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; }
.oui-files-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.oui-files-table th { position: sticky; top: 0; z-index: 1; height: 30px; padding: 0 var(--oui-s3); text-align: start; background: var(--oui-surface); box-shadow: inset 0 -1px 0 var(--oui-border); }
.oui-files-table th:nth-child(3) { width: 96px; } .oui-files-table th:nth-child(4) { width: 168px; }
.oui-files-table th.oui-num, .oui-files-table td.oui-num { text-align: end; }
.oui-files-sort { display: inline-flex; align-items: center; gap: 2px; padding: 0; border: 0; background: none; cursor: pointer; font-size: var(--oui-text-xs); font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--oui-muted); }
.oui-files-sort:hover { color: var(--oui-text); }
.oui-files-table td { height: 44px; padding: 0 var(--oui-s3); border-bottom: 1px solid var(--oui-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oui-files-table :is(th, td).oui-files-check { width: 36px; padding: 0 0 0 var(--oui-s3); overflow: visible; }
.oui-files-check > input { display: block; width: 16px; height: 16px; margin: 0; cursor: pointer; }
.oui-files-row { cursor: default; user-select: none; -webkit-user-select: none; -webkit-user-drag: none; }
.oui-files-row img { -webkit-user-drag: none; }
.oui-files-row:hover { background: var(--oui-raised); }
.oui-files-row[aria-selected='true'] { background: var(--oui-primary-soft); }
.oui-files-row[data-dragged], .oui-files-folder[data-dragged] { opacity: .5; }
.orca-ui .oui-files-row:focus-visible { outline-offset: -2px; }
.oui-files-name { display: flex; align-items: center; gap: var(--oui-s2); min-width: 0; }
.oui-files-name > .oui-truncate { font-weight: 600; }
.oui-files-skeleton td { height: 44px; padding: 0 var(--oui-s3); border-bottom: 1px solid var(--oui-border); }
/* Rows are as tall as their content, never less: the picture has no minimum of its own (aspect-ratio, clipped), and in a
   pane shorter than its content an auto row would shrink it to nothing and draw it over the name. The pane scrolls instead. */
.oui-files-detail { display: grid; grid-auto-rows: max-content; align-content: start; gap: var(--oui-s3); min-width: 0; min-height: 0; overflow-y: auto; padding: var(--oui-s3); border-inline-start: 1px solid var(--oui-border); }
.oui-files-preview { display: grid; place-items: center; aspect-ratio: 16 / 10; overflow: hidden; border-radius: var(--oui-radius); background: var(--oui-inset); box-shadow: inset 0 0 0 1px var(--oui-border); }
.oui-files-preview > img { display: block; width: 100%; height: 100%; object-fit: contain; }
.oui-files-detailhead { display: flex; flex-wrap: wrap; align-items: center; gap: var(--oui-s2); min-width: 0; }
.orca-ui .oui-files-detailname { min-width: 0; font-size: var(--oui-text-lg); font-weight: 700; overflow-wrap: anywhere; }
.oui-files-detailactions { display: flex; flex-wrap: wrap; gap: var(--oui-s2); padding-top: var(--oui-s1); }
.oui-files-names { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; min-width: 0; }
/* The dragged file under the pointer, as the system draws a file being dragged: its picture and name, and a count for more. */
.oui-files-ghost { position: fixed; top: 0; left: 0; z-index: 1000; display: flex; align-items: center; gap: var(--oui-s2); max-width: 280px; padding: 4px 10px 4px 4px;
  pointer-events: none; opacity: .88; font-weight: 600; color: var(--oui-text); background: var(--oui-raised); border-radius: var(--oui-radius);
  box-shadow: inset 0 0 0 1px var(--oui-border), var(--oui-shadow-overlay); will-change: transform; }
.oui-files-ghostcount { position: absolute; top: -7px; left: 26px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; font-size: var(--oui-text-xs); font-weight: 700;
  line-height: 18px; text-align: center; color: var(--oui-on-primary); background: var(--oui-primary); }
/* Narrower: the detail goes under the list; narrower still, the folders go above it. */
/* Stacked, the detail (and the tree, narrower still) get a share of the height at most and scroll inside it: the table
   keeps the rest. Sized to their content they took the height first, and a tall detail left the table none. */
@container oui-files (max-width: 980px) {
  .oui-files-grid { grid-template-columns: 208px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) fit-content(40%); }
  .oui-files-grid[data-flat] { grid-template-columns: minmax(0, 1fr); }
  .oui-files-detail { grid-column: 1 / -1; grid-template-columns: 160px minmax(0, 1fr); border-inline-start: 0; border-top: 1px solid var(--oui-border); }
  .oui-files-detail > .oui-files-preview { grid-row: span 3; }
  .oui-files-detail > .oui-empty { grid-column: 1 / -1; padding-block: var(--oui-s3); }
}
@container oui-files (max-width: 620px) {
  .oui-files-grid { grid-template-columns: minmax(0, 1fr); grid-template-rows: fit-content(26%) minmax(0, 1fr) fit-content(30%); }
  .oui-files-grid[data-flat] { grid-template-rows: minmax(0, 1fr) fit-content(40%); }
  .oui-files-rail { border-inline-end: 0; border-bottom: 1px solid var(--oui-border); }
  .oui-files-table th:nth-child(4), .oui-files-table td:nth-child(4) { display: none; }
}
</style>
