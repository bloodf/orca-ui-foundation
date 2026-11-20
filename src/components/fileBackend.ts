import { computed, reactive, ref } from 'vue';
import type { OuiFile, OuiFileOp, OuiFolder } from './OuiFileBrowser.vue';

/*
 * The storage behind OuiFileBrowser. Each printer plugin writes one of these over its own bridge (Moonraker's file
 * endpoints, the Kobra's file list) and gives it to useFileBackend(); everything else is shared, so the Files tab
 * behaves the same in every plugin. What the storage cannot do is left out, and the component stops offering it:
 * no `folders`: no tree, no path, no "Move to"; no `move`: the tree stays for browsing, "Move to" and dragging go;
 * no `createFolder`: no "New folder"; no `rename`, `moveFolder`, `removeFolder`: no such item in the context menus.
 * Every method rejects (throws) on failure; nothing here turns a failure into an empty list.
 */
export interface OuiFileBackend {
  /** Every folder of the storage, flat, parents before or after their children. Omit it, or resolve to [], when the storage has no folders. */
  folders?(): Promise<OuiFolder[]>;
  /** The files of one folder; `folder` is '' when the storage has no folders. */
  list(folder: string): Promise<OuiFile[]>;
  /** Delete these files of `folder`. The user has already confirmed. */
  remove(ids: string[], folder: string): Promise<void>;
  /** Move these files from `from` to the folder `to`. Omit it when the storage cannot move files. */
  move?(ids: string[], to: string, from: string): Promise<void>;
  /** Make the folder `name` in `parent`; resolves to the new folder's id, which is then opened. Omit it when the storage cannot make folders. */
  createFolder?(parent: string, name: string): Promise<string | void>;
  /** Rename a file or folder in place; resolves to its new id. A rejection's message is shown under the name field. */
  rename?(id: string, name: string, folder: boolean): Promise<string | void>;
  /** Move the folder `id` into `to`; resolves to its new id. */
  moveFolder?(id: string, to: string): Promise<string | void>;
  /** Delete the folder `id` with everything in it. The user has already confirmed. */
  removeFolder?(id: string): Promise<void>;
}
/** 'create' and 'rename' are typed in place: their failures are shown under the name field, not given to `onError`. */
export type OuiFileAction = 'move' | 'delete' | 'create' | 'rename' | 'move-folder' | 'delete-folder';
export interface OuiFileBackendOptions {
  /** The folder to open first (default: the first root). */ folder?: string;
  /** A move or delete failed: tell the user (a toast), in the page's language. The list is read again either way. */
  onError(action: OuiFileAction, error: unknown, ids: string[]): void;
  /** A change finished: news for a toast. For 'create', `ids` is the new folder's name and `to` its parent; for 'rename', `to` is the new name. */
  onDone?(action: OuiFileAction, ids: string[], to?: string): void;
  /** The sentence shown when the files cannot be read (default: the error's own message). */ message?(error: unknown): string;
}

/**
 * State and handlers for one OuiFileBrowser over a backend:
 *   const files = useFileBackend(backend, { onError });
 *   <OuiFileBrowser v-bind="files.props" v-on="files.on" :labels="labels" />
 * `files.selected`, `files.folder`, `files.files` and the rest can be read (and `selected` set); `files.reload()` reads again.
 */
export function useFileBackend(backend: OuiFileBackend, options: OuiFileBackendOptions) {
  const folders = ref<OuiFolder[]>([]); const files = ref<OuiFile[]>([]); const folder = ref(options.folder ?? ''); const selected = ref<string[]>([]);
  const loading = ref(true); const busy = ref(false); const error = ref<string | null>(null);
  const say = (e: unknown) => options.message?.(e) ?? (e instanceof Error ? e.message : String(e));
  let turn = 0;   // only the newest read may write: a slow answer for a folder the user has left is dropped
  /** Reads the files of the open folder, and the folders too unless `filesOnly`. `quiet` keeps the rows on screen meanwhile. */
  async function reload({ filesOnly = false, quiet = false } = {}): Promise<void> {
    const mine = ++turn;
    if (!quiet) loading.value = true;
    try {
      // ponytail: the whole tree in one call, read again after every change; make it lazy per folder if a storage is too big for that.
      let list: OuiFile[] | undefined;
      if (!filesOnly) {
        // The open folder's files are asked for alongside the tree, not after it: a tree that takes a request per folder
        // does not hold the list back. If the open folder turns out to be gone, its answer is dropped and the new one read.
        const asked = folder.value;
        const early = backend.folders && asked ? backend.list(asked) : undefined;
        early?.catch(() => { /* judged below, or dropped with the folder */ });
        const tree = backend.folders ? await backend.folders() : [];
        if (mine !== turn) return;
        folders.value = tree;
        if (!tree.some(f => f.id === folder.value)) folder.value = (tree.find(f => !f.parent) ?? tree[0])?.id ?? '';
        if (early && folder.value === asked) list = await early;
      }
      list ??= await backend.list(folder.value);
      if (mine !== turn) return;
      files.value = list; error.value = null;
    } catch (e) {
      if (mine !== turn) return;
      files.value = []; error.value = say(e);
    } finally { if (mine === turn) loading.value = false; }
  }
  async function act(action: OuiFileAction, ids: string[], work: () => Promise<void>, to?: string) {
    if (busy.value) return;
    busy.value = true;
    try { await work(); options.onDone?.(action, ids, to); } catch (e) { options.onError(action, e, ids); }
    // Whatever happened, show what the storage holds now: a failed move may have moved some of them.
    finally { await reload({ quiet: true }); busy.value = false; }
  }
  const props = computed(() => ({ folders: folders.value, files: files.value, folder: folder.value, selected: selected.value, loading: loading.value, busy: busy.value,
    error: error.value, movable: !!backend.move, creatable: !!backend.createFolder, renamable: !!backend.rename,
    foldersMovable: !!backend.moveFolder, foldersRemovable: !!backend.removeFolder, act: typed }));
  /** The open folder follows a folder that was renamed or moved (it, or one it is in), and goes up from one deleted. */
  const inside = (id: string) => folder.value === id || folder.value.startsWith(id + '/');
  // ponytail: "inside" reads ids as paths (a/b/c), as every storage here has them; give the backend a parent lookup if one does not.
  function follow(was: string, now: string | void) { if (now && inside(was)) { folder.value = now + folder.value.slice(was.length); selected.value = []; } }
  /** A new folder or a rename, typed in the browser: a rejection goes straight back to the name field (nothing changed, so
   *  nothing is read again); once done, the list is read again before the field closes. */
  async function typed(op: OuiFileOp): Promise<void> {
    if (busy.value) throw new Error('busy');
    busy.value = true;
    try {
      if (op.kind === 'create') { const id = await backend.createFolder!(op.parent, op.name); if (id) { folder.value = id; selected.value = []; } options.onDone?.('create', [op.name], op.parent); }
      else { const id = await backend.rename!(op.id, op.name, op.folder); if (op.folder) follow(op.id, id); else if (id) selected.value = [id]; options.onDone?.('rename', [op.id], op.name); }
    } catch (e) { busy.value = false; throw e; }
    try { await reload({ quiet: true }); } finally { busy.value = false; }
  }
  const on = {
    'update:folder': (id: string) => { folder.value = id; selected.value = []; void reload({ filesOnly: true }); },
    'update:selected': (ids: string[]) => { selected.value = ids; },
    move: ({ ids, to }: { ids: string[]; to: string }) => { const from = folder.value; void act('move', ids, () => backend.move!(ids, to, from), to); },
    delete: (ids: string[]) => { const from = folder.value; void act('delete', ids, () => backend.remove(ids, from)); },
    retry: () => { void reload(); },
    refresh: () => { void reload(); },
    'move-folder': ({ id, to }: { id: string; to: string }) => { void act('move-folder', [id], async () => follow(id, await backend.moveFolder!(id, to)), to); },
    'delete-folder': (id: string) => { void act('delete-folder', [id], async () => { await backend.removeFolder!(id); if (inside(id)) { folder.value = folders.value.find(f => f.id === id)?.parent ?? ''; selected.value = []; } }); },
  };
  void reload();
  return reactive({ props, on, reload, folders, files, folder, selected, loading, busy, error });
}
