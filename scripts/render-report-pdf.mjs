#!/usr/bin/env node
/**
 * Renders sample reports to PDF with the app's own HTML builder, to check the
 * layout without a phone: one flue, several flues with photos, and the fullest
 * report the form allows.
 *
 *   node scripts/render-report-pdf.mjs [out-dir]
 *
 * Needs Microsoft Edge or Google Chrome. The phone prints through Android's
 * Chromium WebView, so a desktop Chromium is a close match; still check one
 * real PDF from the phone before shipping.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, 'dist', 'pdf-check'));
const work = join(tmpdir(), 'render-report-pdf');
mkdirSync(outDir, { recursive: true });
mkdirSync(work, { recursive: true });

// The builder only needs report.ts; its native imports are stubbed out.
writeFileSync(
  join(work, 'stub.js'),
  'export default {}; export const StorageAccessFramework = {}; export const Platform = { OS: "web" };' +
    ' export const printAsync = () => {}; export const printToFileAsync = () => {};' +
    ' export const isAvailableAsync = () => false; export const shareAsync = () => {};' +
    ' export class Directory {} export class File {} export const Paths = {};' +
    ' export const ImageManipulator = {}; export const SaveFormat = {};' +
    ' export const openDatabaseAsync = () => new Promise(() => {});' +
    ' export const deleteAsync = () => {}; export const readDirectoryAsync = () => [];' +
    ' export const cacheDirectory = ""; export const getInfoAsync = () => ({});'
);
const stubbed = [
  'expo-file-system',
  'expo-file-system/legacy',
  'expo-print',
  'expo-sharing',
  'expo-sqlite',
  'expo-image-manipulator',
  'react-native',
];
const bundle = join(work, 'report.cjs');
execFileSync(
  'npx',
  [
    '-y',
    'esbuild@0.25.0',
    join(root, 'src', 'lib', 'report.ts'),
    '--bundle',
    '--platform=node',
    '--format=cjs',
    `--alias:@=${join(root, 'src')}`,
    ...stubbed.map((name) => `--alias:${name}=${join(work, 'stub.js')}`),
    `--outfile=${bundle}`,
    '--log-level=warning',
  ],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
);
const { buildReportHtml, normalizeReportDraft, serviceOptions, sootTypeOptions, visibleDefectOptions, adviceOptions } =
  await import(pathToFileURL(bundle).href);

const signature = ['M40 180 C 90 60, 150 60, 180 170 S 260 230, 300 120 L 360 160 C 400 190, 470 90, 540 140'];
const sample = readFileSync(join(root, 'assets', 'images', 'icon.png')).toString('base64');
const photo = `data:image/png;base64,${sample}`;
const long =
  'Conduit encrassé sur toute la hauteur, bistre en partie haute. Raccordement à reprendre : ' +
  'coude non étanche côté poêle. Prévoir un débistrage avant la prochaine saison de chauffe, ' +
  'puis un passage caméra pour contrôler le tubage. Client informé, devis à envoyer.\n' +
  'Souche fissurée côté nord, à surveiller. ';
const observations600 = (long + long + long).slice(0, 600);

const base = {
  id: 'sample',
  createdAt: '2026-11-08T09:00:00.000Z',
  updatedAt: '2026-11-08T09:00:00.000Z',
  interventionDate: '08/11/2026',
  customerLastName: 'Durand',
  customerFirstName: 'Éloïse',
  customerAddress: '12 rue des Lilas, 85580 Grues',
  customerPhone: '06 12 34 56 78',
  signature,
  photos: [],
};

const fullFlue = (label) => ({
  label,
  services: [...serviceOptions],
  sootTypes: [...sootTypeOptions],
  sootVolume: 'Très important',
  visibleDefects: [...visibleDefectOptions],
  advice: [...adviceOptions],
  observations: observations600,
});

const samples = {
  // Saved by 1.1.0: flat findings, and an advice option since renamed.
  'un-conduit-ancien': [
    {
      ...base,
      services: ['Ramonage'],
      sootTypes: ['Suies carbonées'],
      sootVolume: 'Modéré',
      visibleDefects: ['Souche'],
      advice: ['Envisager un changement du générateur'],
      observations: 'RAS',
    },
    [],
  ],
  // The busiest single sheet: legal box, every box ticked, longest observations, signature.
  'un-conduit-plein': [{ ...base, chimneys: [fullFlue('')] }, []],
  'deux-conduits-photos': [
    {
      ...base,
      chimneys: [
        { label: 'Salon', services: ['Ramonage'], sootTypes: ['Suies fines et volatiles'], sootVolume: 'Faible', visibleDefects: [], advice: [], observations: '' },
        { label: '', services: ['Débistrage'], sootTypes: ['Suies bistres'], sootVolume: 'Important', visibleDefects: ['Tubage défectueux ou vieillissant'], advice: [adviceOptions[3], adviceOptions[4]], observations: 'Tubage à remplacer.' },
      ],
    },
    [photo, photo, photo],
  ],
  'six-conduits-pleins': [
    { ...base, customerAddress: 'Lieu-dit La Grande Métairie, 2 chemin des Ajoncs, 85580 Saint-Denis-du-Payré', chimneys: [1, 2, 3, 4, 5, 6].map((n) => fullFlue(n % 2 ? `Insert séjour ${n}` : '')) },
    [photo, photo, photo, photo],
  ],
};

const edge = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((path) => path && existsSync(path));
if (!edge) {
  throw new Error('Edge ou Chrome introuvable : définir CHROME_PATH.');
}

for (const [name, [stored, photos]] of Object.entries(samples)) {
  const report = normalizeReportDraft(stored);
  // The phone sets A4 through printToFileAsync; a desktop browser needs it in CSS.
  const html = buildReportHtml(report, photos).replace('@page { margin: 0; }', '@page { size: 595pt 842pt; margin: 0; }');
  const htmlPath = join(outDir, `${name}.html`);
  const pdfPath = join(outDir, `${name}.pdf`);
  writeFileSync(htmlPath, html);
  execFileSync(edge, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' });
  const pages = (readFileSync(pdfPath, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const expected = report.chimneys.length + (photos.length ? 1 : 0);
  console.log(`${pages === expected ? 'OK  ' : 'FAIL'} ${name}: ${pages} page(s), attendu ${expected} → ${pdfPath}`);
}
