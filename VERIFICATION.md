# Foundation validation — 2026-11-11

Vue 3.5.45, PrimeVue 4.5.5, @primeuix/themes 1.2.5; Bootstrap rejected by Heitor and archived outside the workspace at /tmp/orca-plugin-reviews-20261111/abandoned-bootstrap-foundation-20261111. No plugin adopted that prototype according to completed Calculator/Organizer tasks.

- Typecheck and single-file Vite build pass. Gallery artifact is 747.04 kB raw / 164.92 kB gzip with DataTable, Dialog, Select, InputText, Button, Message and ProgressBar. This is a component gallery, not a per-plugin budget. Consumers must measure their actual delta and keep imports specific.
- Manifest and 24 exact token contrast pairs pass. These values describe this palette, not arbitrary host colors or complete accessibility compliance.
- Production artifact runs from file:// under CSP `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'`. Vue template compilation does not require unsafe-eval.
- Owned headless Chrome via CDP, with --use-mock-keychain --password-store=basic, verified light1280, dark1280, dark720. Open Dialog, confirm action, close Dialog, observe reactive success. No horizontal overflow; primary button font14px/radius6px and intended colors. screenshots inspected for light1280 and dark720.
- A first typecheck found required PrimeVue locale arrays missing; fixed. Two initial CLI virtual-time probes left Vue transition requestAnimationFrame pending and misreported dialog close. Failed DOM snapshots retained in evidence. Replaced virtual-time probing with a real-time owned-browser CDP test; normal transitions complete and all checks pass. `scripts/verify-gallery.py` records the failed setup; use `scripts/verify-gallery.mjs` for the valid proof.
- Browser process/profile created only for the tests and closed/removed. No real Orca, Spoolman, printer, native WebView or screen reader was used.

This validates the shared foundation and its sample controls only. Migrating actual plugin surfaces and re-running their behavioral/artifact tests is still required.

## Patch 2.0.1

Organizer's migration exposed focus-ring and reduced-motion defects in the shared theme. A production-page regression probe reproduced secondary focus matching the surrounding background exactly, with a visible 2px outline but 1:1 contrast. The initial probe needed real keyboard modality and time for the focus transition; those failed probe setups and the corrected failing baseline are preserved under `/tmp/orca-foundation-201-baseline-*.log`.

Secondary/info now use the primary focus color; success/warn use their contrasting text color. Shared reduced-motion rules override late-injected PrimeVue styles, including progress pseudo-elements and teleported dialogs. Consumers remove equivalent local motion workarounds when vendoring 2.0.1.

Build/typecheck, manifest/palette checks and the production Chrome probe passed. Five cases cover light/dark at 1280px, dark at 720px, and reduced motion in both themes. Tests assert actual focus visibility, 2px outline and at least 3:1 contrast against the surrounding background; reduced motion has zero transition duration and at most 1ms animation duration. Dialog open/confirm/close remains functional. Evidence is in `evidence-2.0.1/`; the dark720 screenshot was visually inspected. No host/device validation is implied. Dependency versions and public UI APIs are unchanged.

## Patch 2.0.2

The Calculator migration exposed an English-locale defect: explicitly passing `locale: undefined` replaced PrimeVue's built-in English configuration. The shared helper now omits the property for English. The Calculator uses `installOrcaUI` directly; its local workaround was removed. A real Vue/PrimeVue integration test failed before this fix and all 19 focused tests passed afterward. The root regression logs are `/tmp/orca-foundation-202-baseline.log` and `/tmp/orca-foundation-202-fixed.log`. Shared build/typecheck/manifest checks also passed. No dependency, palette or layout change was made.

Calculator and Organizer now vendor 2.0.2. The active Spooler/U1 writer was instructed to update its two snapshots. Final Calculator validation and host-language integration are recorded separately in `/tmp/orca-plugin-reviews-20261111/vue-migration-20261111/calculator/root-2.0.2/`.

## Release 3.0.0

PrimeVue 4.5.5 → 5.0.5 and @primeuix/themes 1.2.5 → 3.1.1, base preset `aura-compat` (4.x sizes). PrimeVue 5 is under the PrimeUI License: the Community key is in `src/license.ts` (expires 2027-11-13, 30 days grace) and passed in `primeVueOptions()`. Typecheck, build, manifest and palette checks pass. `scripts/verify-gallery.mjs` (owned headless Chrome, mock keychain) now also asserts that PrimeVue's license banner is absent; all five cases pass with the same button colours, radius and font as 2.0.1, visible focus and reduced motion. PrimeVue 5 eases the theme in on mount (0.15s from the UA default), so the probe waits 400ms before reading styles. Colours are emitted as CSS `light-dark()`; evidence in `evidence-3.0.0/`. No host/device validation is implied.

## Patch 3.0.1

The Calculator's Tabs keyboard test failed on 3.0.0 with `Cannot read properties of undefined (reading 'lastElementChild')`: PrimeVue 5.0.5 `Tab.findLastTab/findFirstTab` read `$pcTabList.$refs.tabs`, a ref TabList 5 renamed to `content`. `installOrcaUI()` now adds a global mixin that defines `$refs.tabs` as an alias of `$refs.content` on TabList. Only the runtime helper changed.

## Patch 3.0.2

Spooler's migration compared PrimeVue 5 screenshots with main: aura-compat's `typography.lineHeight: normal` applied to every `.p-component` (and through Tabs to whole views) shrank fields/buttons from 38.3px to 35px; the button label weight (600) moved to the `.p-button` root and bolded slot content. Preset now sets `typography: { fontFamily: 'inherit', lineHeight: 'inherit' }`; base.css sets `.orca-ui .p-button` to normal weight and the label to the button label weight.

## Minor 3.1.0

TypeScript 6.0.3 → 7.0.2. vue-tsc 3.3.14 resolves `typescript/lib/tsc`, which TypeScript 7 no longer exports (`ERR_PACKAGE_PATH_NOT_EXPORTED`); npm overrides cannot give a peer dependency a different version than the root. `scripts/vue-tsc.mjs` passes the TypeScript 6 `tsc` from `@typescript/typescript6` to `vue-tsc`'s `run()`. Checked: the typecheck passes on the sources and fails (exit 2, TS2322) on an injected type error; build, manifest and palette checks pass. Only build tooling changed.

## Release 4.0.0 — 2026-11-15

A redesign in three rounds, the last after the owner asked for colour to be structural: per-plugin accent that fills the app bar and tints every surface, module headers in the hue of their subject, one hero block per page, one icon set, Manrope embedded, a new preset, denser controls, twenty-one shared components and eight reference screens. Runtime dependencies unchanged; `lucide-static` 1.73.0 added as a dev dependency (icons are copied into `src/icons.ts`). One font file (21,476 B, OFL); no image asset.

- `npm ci --ignore-scripts && npm run build && npm run check` pass: icon generation (97 icons), typecheck, single-file build (gallery 1,080.76 kB raw, 302.85 kB gzip, including the six illustrations), manifest of 42 files, 475 palette pairs per theme at or above their minimum (tightest 1.06x): text, muted text, control borders, state colours and all seven hues on each accent's four surfaces, each hue as a solid fill, a tint and a band, state chips, and the state pills on a band.
- `node scripts/shots.mjs`: 76 screenshots of the built page under `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src data:` (the strictest plugin test policy, with `font-src data:` for the embedded typeface), dark and light, 1900×1000, 1280×720, 720 wide, 280×360 for the Organizer dock, pt-BR, 200 % zoom, the colour-system and icon sheets, and two scenes in the fallback system font. Each asserts no horizontal overflow, no clipped button, tab, status or label text, no console error or warning, no PrimeUI licence banner; the metrics record that Manrope loaded in 74 and was not requested in 2. All pass.
- `node scripts/verify-gallery.mjs` on the kit sheet: five cases (light and dark 1280, dark 720, reduced motion in both themes). Dialog opens, confirms and closes; focus rings are at least 2 px and 3:1 on four button severities; under reduced motion every transition is 0 s and every animation at most 1 ms. The probe was flaky on this machine, where several headless Chromes run at once, and two causes were found. First, in about 1 run in 10 the confirmed dialog never left the screen within 8 s. The captured state shows the action had gone through (`confirmed: true`) and the dialog sitting in `p-dialog-leave-from` with the mask still in `enter-active`: `requestAnimationFrame` had stopped firing, so no transition could advance. That is headless Chrome not producing frames, not a defect in the dialog (80 open-and-confirm cycles in one page and 60 fresh page loads all closed). The probe now names that case (`FRAMES_STALLED`, checked with a one-second frame test) and retries it up to twice, logging each retry; a dialog that stays open while frames are running still fails. Second, it read the focus ring's colour a fixed 200 ms after focusing, which once was still transparent mid-transition; it now polls until the colour settles (up to 2 s) and then applies the same 2 px and 3:1 assertions. It also waits 300 ms after the dialog appears before confirming, as a person would.
- Size, measured on a minimal page (Button, Dialog, InputNumber) built against each version: 3.1.0 413,204 B (99,680 gzip); 4.0.0 without shared components 454,983 B (125,823 gzip), of which the font is about 28.7 kB; 4.0.0 with all twenty-one registered 502,806 B (138,531 gzip). Icons are separate exports of about 0.2 kB each. The delta inside each plugin's own build is still to be measured during migration.
- Defects found by looking at the screenshots and fixed before release: `light-dark()` in authored CSS was rewritten by the build and stopped following the theme (now `--oui-*` variables and `.orca-dark`); an image with `height: 100%` in an auto-sized box took its own proportions (`OuiThumb` sets both sizes in px); `OuiSettings`, `OuiSetpoint` and `OuiAppBar` styled their own container from a container query, which does nothing (each now has an inner element); object cards wrapped 3 + 1 (`.oui-cards`); solid danger was pale pink in dark (`dangerSolid`); importing anything from `src` pulled in every component (components and icons are separate entries); a role filter dropped `--oui-on-band`, leaving the band's text and pills unstyled; a disabled toggle group hid which option was chosen; offline heater readings kept their live colour (`OuiSetpoint stale`).
- Frozen as 4.0.0 after this run: `npm ci`, build, check, 76 screenshots and the probe (5 cases, no retry needed) all passed in sequence. `MIGRATION-4.0.md` is the roll-out procedure and is part of the snapshot.
- "Before" captures in `evidence-4.0.0/before/` are the six plugins' real built pages under their own page-test fakes; `evidence-4.0.0/round2/` keeps the second round for comparison. The plugin repositories were not modified.
- Imagery: the printer drawings and the spool are vector. Images were generated with the Codex CLI by the session lead on the owner's direct instruction, in three batches; the final set is two marks (redrawn by hand as vector for Organizer and Spooler) and six empty-state illustrations, each with a mid-tone accent measured to hold on its plugin's dark and light pages, exported by `assets/export.sh` to 320 px WebP (43,628 B together). All were looked at on each plugin's dark panel and on white and accepted; earlier takes are kept as `-v1`/`-v2` in `assets/generated/`, and `assets/manifest.json` records tool, prompt, date, bytes and review for each.

Not validated: OrcaSlicer's web views (WebKit, WebView2, WebKitGTK), real printers or Spoolman, a screen reader, and the six plugins themselves, which still vendor 3.1.0. The reference screens are MOCK data in the foundation gallery.

## Patch 4.0.1 — 2026-11-15

Raised by the Spooler roll-out, from reading the source before building. Additive; no 4.0.0 behaviour changes except the number format noted below.

- `OuiSlot`: an `#amount` slot replaces the built-in weight line and level bar (slot prop `fraction`); it is rendered only for a non-empty slot, and an empty `#amount` leaves no gap. Needed for trays that report percent only, for display settings that hide the weight or the bar, and for other units.
- `OuiSlot`: the built-in line formatted with the browser locale; it now uses the page language (`document.documentElement.lang`). A pt-BR page in an English browser wrote "1,380 g" and now writes "1.380 g". This is the one visible change for 4.0.0 pages.
- `OuiTab`: `attrs` (extra attributes on the tab button; the tab's own role, id, `data-tab` and aria attributes win) and `attention` (a dot whose text is its accessible name and tooltip).
- Gallery: the kit sheet shows the four slot cases (built-in, percent only, empty `#amount`, empty slot with `#amount` not rendered); the Spooler reference uses `attention` and `attrs`.
- The tab's accessible name now separates its parts ("Spools 24", "Printer, needs attention"); in 4.0.0 a count ran into the label ("Spools24").
- Released after: `npm run build && npm run check` (42 files, 475 pairs per theme), `node scripts/shots.mjs` (76 screenshots), `node scripts/verify-gallery.mjs` (5 cases), and a probe of the built gallery that read the four slot cases, "1,380 g" in English against "1.380 g" in pt-BR, and the Spooler tabs' `data-test`, ids and attention text.

## Patch 4.2.2 — 2026-11-18

- `OuiSpool`: a colour with an unknown amount draws the full reel (level 1) in that colour with a "?" badge and `data-unknown`; no colour and unknown stays the bare reel (level 8), without `data-unknown`. `OuiSlot` no longer substitutes 0.6 for an unknown amount, and passes no colours to an empty slot's spool.
- Gallery: the kit sheet adds a single- and a multi-colour spool of unknown amount, and a slot "T2" with a colour and no weight; the percent-only slot passes its percentage as `remaining`/`initial`.
- `scripts/verify-gallery.mjs` asserts, in every theme and width: each unknown spool is level 1 with the winding and the "?" badge, no other spool has the badge, the colourless unknown spool and the empty slot are the bare reel. `scripts/shots.mjs` now writes to `evidence-4.2.2/after/`.
- Released after: `npm run build && npm run check` (60 files, 475 pairs per theme), `node scripts/verify-gallery.mjs` (5 cases) and `node scripts/shots.mjs` (90 screenshots, OK).
