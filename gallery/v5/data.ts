// MOCK data for the 5.0 reference screens: the shapes the real pages have (the owner's screenshots), with made-up values.
import { lang, t } from '../i18n';
import type { OuiFile, OuiFolder } from '../../src/components';

export interface MockSpool { id: number; name: string; vendor: string; material: string; colour: string; remaining: number | null; initial: number; location: string; slot?: string; useFirst?: boolean }
const S = (id: number, name: string, colour: string, remaining: number | null, extra: Partial<MockSpool> = {}): MockSpool =>
  ({ id, name, vendor: '3D Procer', material: 'PLA', colour, remaining, initial: 1000, location: '', ...extra });
export const SPOOLS: MockSpool[] = [
  S(17, 'Branco marmorizado', '#e9e6df', 1000), S(44, 'Cobre', '#b9763f', 1000), S(26, 'Caucasiano', '#e7c3a4', 1000), S(3, 'PLA SnapSpeed Yellow', '#f2c230', 374, { vendor: 'Snapmaker' }),
  S(12, 'Preto', '#1d1d1f', 891, { useFirst: true }), S(35, 'Bronze', '#a8733d', 1000), S(28, 'Ouro', '#d2a93a', 1000), S(30, 'Marrom terra', '#6e4a30', 572, { useFirst: true }),
  S(42, 'Verde natal silk', '#128a3a', 746), S(56, 'Cinza claro', '#b9bcc0', 981, { vendor: 'Voolt3D', material: 'PLA+' }), S(8, 'Bege claro', '#e3d6bd', 930, { useFirst: true }),
  S(20, 'Preto matte', '#242426', 1000), S(2, 'PETG Preto', '#161618', 958, { vendor: 'Masterprint', material: 'PETG', useFirst: true }), S(31, 'Marrom escuro', '#4a3020', 1000),
  S(38, 'Cinza', '#8b8e93', 992), S(25, 'Bege escuro', '#cdb893', 1000), S(9, 'Cinza grafite', '#3d4046', 930), S(46, 'Vermelho', '#d0211c', 824), S(19, 'Preto perolado', '#2a2a30', 1000),
  S(21, 'Preto matte', '#1f1f21', 839), S(51, 'Azul cobalto', '#2850a8', 88, { material: 'PETG' }), S(52, 'TPU 95A Branco', '#f1f1ee', 41, { vendor: 'eSUN', material: 'TPU' }),
  S(53, 'ASA Cinza', '#70757c', null, { vendor: 'Polymaker', material: 'ASA' }), S(54, 'Silk Aurora', '#7a5cff', 612, { vendor: 'Polymaker' }),
];
export const spool = (id: number) => SPOOLS.find(s => s.id === id)!;
export const fraction = (s: MockSpool) => (s.remaining == null ? null : s.remaining / s.initial);
export const level = (s: MockSpool) => (s.remaining != null && s.remaining < 60 ? 'critical' as const : s.remaining != null && s.remaining < 120 ? 'low' as const : 'normal' as const);

// A camera frame: a flat drawing of a bed with a print on it, so the module has a picture without shipping a photo.
export const CAMERA = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#3b3e44"/><path d="M0 0h640v130H0z" fill="#55585f"/><path d="M40 130h560v20H40z" fill="#2a2c31"/>'
  + '<path d="M70 300 190 170h270l120 130z" fill="#1c1d21"/><path d="M96 292 200 180h250l104 112z" fill="#26282d"/><path d="M270 250c-6-40 14-74 50-74s58 34 50 74z" fill="#c8362c"/><path d="M286 250c-2-30 10-54 34-54" fill="none" stroke="#e2574c" stroke-width="6" stroke-linecap="round"/>'
  + '<rect x="286" y="96" width="68" height="62" rx="8" fill="#d9dadd"/><path d="M308 158h24l-12 20z" fill="#9a9ca1"/><rect x="0" y="84" width="640" height="10" fill="#70737a"/></svg>');

// The same frame as a 4:3 camera sends it: `fit="contain"` shows all of it, with bars at the sides.
export const CAMERA_43 = CAMERA.replace(encodeURIComponent('viewBox="0 0 640 360"'), encodeURIComponent('viewBox="80 0 480 360"'));

export const FOLDERS: OuiFolder[] = [
  { id: 'local', name: t('Printer storage', 'Memória da impressora'), count: 14 },
  { id: 'local/chroma', name: 'CHROMA', parent: 'local', count: 6 },
  { id: 'local/chroma/trays', name: t('Trays', 'Bandejas'), parent: 'local/chroma', count: 3 },
  { id: 'local/calibration', name: t('Calibration', 'Calibração'), parent: 'local', count: 4 },
  { id: 'local/gifts', name: t('Gifts', 'Presentes'), parent: 'local', count: 9 },
  { id: 'usb', name: t('USB drive', 'Pen drive'), count: 2 },
  { id: 'usb/old', name: t('Archive', 'Arquivo'), parent: 'usb', count: 31 },
  // Read only: its files can be looked at, not moved, deleted or added to.
  { id: 'camera', name: t('Timelapses', 'Timelapses'), count: 3, readonly: true },
];
const tile = (colour: string) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 60"><rect width="96" height="60" fill="none"/><path d="M12 46 30 26h36l18 20z" fill="#8a8d93" fill-opacity=".35"/><path d="M34 44c-2-16 4-28 14-28s16 12 14 28z" fill="${colour}"/></svg>`);
const F = (name: string, mb: number, days: number, colour: string, time: string, grams: number): OuiFile => ({ id: name, name, size: mb * 1048576, sizeText: mb.toFixed(1) + ' MB',
  modified: -days, modifiedText: days === 0 ? t('Today', 'Hoje') : days === 1 ? t('Yesterday', 'Ontem') : new Date(2026, 10, 19 - days, 19, 4).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' }), kind: name.endsWith('.3mf') ? '3MF' : 'G-code', thumb: tile(colour),
  facts: [{ label: t('Print time', 'Tempo de impressão'), value: time }, { label: t('Filament', 'Filamento'), value: grams + ' g' }, { label: t('Layer height', 'Altura da camada'), value: '0.20 mm' }, { label: t('Filaments', 'Filamentos'), value: 'PLA' }] });
export const FILES: OuiFile[] = [
  F('CHROMA_V8_50_slots_pull_tray_PLA_84.4g_2h52m.gcode', 18.4, 0, '#3d4046', '2 h 52 min', 84), F('CHROMA_V8_lid_PLA_41.0g_1h20m.gcode', 9.7, 1, '#b9763f', '1 h 20 min', 41),
  F('CHROMA_V8_base_PLA_212g_7h05m.gcode', 44.2, 1, '#d2a93a', '7 h 05 min', 212), F('1119-1113-obj_1_Arm_plate(01)_PLA_0.24.gcode', 26.1, 3, '#d0211c', '7 h 44 min', 168),
  F('Benchy_0.2mm_PLA.gcode', 3.2, 6, '#2850a8', '48 min', 12), F('Cable_clip_x12.3mf', 1.4, 9, '#128a3a', '1 h 02 min', 31), F('Desk_organiser_plate_1.gcode', 22.8, 12, '#e7c3a4', '5 h 31 min', 96),
  F('Headphone_stand_v3.gcode', 20.3, 15, '#8b8e93', '4 h 58 min', 94), F('Drawer_divider_set.3mf', 31.9, 21, '#6e4a30', '6 h 40 min', 126), F('Spool_adapter_ACE.gcode', 6.6, 34, '#1d1d1f', '1 h 36 min', 38),
];
