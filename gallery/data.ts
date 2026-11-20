// MOCK data for the reference screens, taken from the plugins' own page-test fakes (ui/tests/page/shots.mjs,
// the calculator's mock/fixtures.ts, the organizer's verify-browser.mjs, the embedder's shots_host.py) and extended
// to the sizes the screens have to hold (55 spools, mixed-proportion pictures).
export interface Spool { id: number; name: string; vendor: string; material: string; colour: string; colours?: string[];
  remaining: number | null; initial: number; location: string; low: boolean; useFirst?: boolean; slot?: string; picture?: string; count?: number }

const VENDORS = ['Generic', 'Acme', 'Prusament', 'eSUN', 'Overture', 'Sunlu', 'Polymaker', 'Voolt3D', '3DFila', 'Bambu Lab', 'Snapmaker'];
const LINES: [string, string][] = [['PLA', 'PLA Matte'], ['PLA', 'PLA Basic'], ['PETG', 'PETG HF'], ['PLA', 'PLA Silk'], ['ABS', 'ABS'], ['TPU', 'TPU 95A'], ['ASA', 'ASA'], ['PLA', 'PLA+'], ['PETG', 'PETG']];
const COLOURS: [string, string][] = [['Charcoal Black', '#1a1a1a'], ['Cobalt Blue', '#2850a8'], ['Signal Red', '#c12e1f'], ['Sakura Pink', '#f3a6c0'], ['Ash Grey', '#8a8f98'],
  ['Galaxy Purple', '#5b3a8c'], ['Ice Blue', '#78cfd5'], ['Bambu Green', '#3f8e43'], ['Jade White', '#f4f4f1'], ['Sunflower', '#f4cf78'], ['Burnt Orange', '#d9692a'], ['Olive', '#6b7a3a'], ['Clear', '#dfe9ee']];
const LOCATIONS = ['Shelf A', 'Shelf B', 'Dry box', 'Dry box 2', 'Drawer', 'ACE 1'];

// Spool pictures as they arrive from a stock source: any proportion. Tall, wide and square on purpose.
function picture(colour: string, initials: string, w: number, h: number): string {
  const ink = parseInt(colour.slice(1, 3), 16) * 0.3 + parseInt(colour.slice(3, 5), 16) * 0.59 + parseInt(colour.slice(5, 7), 16) * 0.11 > 150 ? '#1a2029' : '#ffffff';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="6" fill="${colour}"/>`
    + `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="4" fill="none" stroke="${ink}" stroke-opacity=".35"/>`
    + `<text x="${w / 2}" y="${h / 2 + 5}" font-family="sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="${ink}">${initials}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
const SHAPES: [number, number][] = [[60, 150], [200, 80], [100, 100], [80, 120]];

export function makeSpools(count: number): Spool[] {
  const fixed: Spool[] = [
    { id: 7, name: 'PLA Matte - Charcoal Black', vendor: 'Generic', material: 'PLA', colour: '#111111', remaining: 640, initial: 1000, location: 'Shelf A', low: false, useFirst: true, slot: '1' },
    { id: 11, name: 'PETG HF - Cobalt Blue', vendor: 'Acme', material: 'PETG', colour: '#2850a8', remaining: 40, initial: 1000, location: 'Dry box', low: true },
    { id: 12, name: 'PLA Silk - Aurora', vendor: 'Polymaker', material: 'PLA', colour: '#7a5cff', colours: ['#7a5cff', '#22c1c3', '#fdbb2d'], remaining: 812, initial: 1000, location: 'Shelf B', low: false },
    { id: 13, name: 'TPU 95A - Red with an unusually long colour name', vendor: 'Very Long Manufacturer Name Ltda.', material: 'TPU', colour: '#c12e1f', remaining: 15, initial: 750, location: 'Dry box', low: true },
    { id: 14, name: 'ASA - Ice Blue', vendor: '3DFila', material: 'ASA', colour: '#78cfd5', remaining: null, initial: 1000, location: '', low: false },
  ];
  const rows = [...fixed];
  for (let i = 0; rows.length < count; i++) {
    const [material, line] = LINES[(i * 5 + 2) % LINES.length]; const [colourName, colour] = COLOURS[(i * 7 + 3) % COLOURS.length];
    const vendor = VENDORS[(i * 3 + 1) % VENDORS.length]; const initial = i % 6 === 4 ? 750 : 1000;
    const remaining = Math.round(((i * 37 + 11) % 97) / 100 * initial + 12);
    rows.push({ id: 20 + i, name: `${line} - ${colourName}`, vendor, material, colour, remaining, initial, location: LOCATIONS[(i * 2 + 1) % LOCATIONS.length], low: remaining < 100 });
  }
  return rows.map((row, i) => (i % 3 === 1 ? { ...row, picture: picture(row.colour, row.vendor.slice(0, 2).toUpperCase(), ...SHAPES[(i >> 1) % SHAPES.length]) } : row));
}
export const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU'];
