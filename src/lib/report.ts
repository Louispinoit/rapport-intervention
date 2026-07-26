import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { COMPANY_NAME } from '@/constants/company';
import { purgeGeneratedPdfs } from '@/lib/pdf-cache';
import { getSetting, recordSavedPdf, setSetting } from '@/lib/report-store';

export const serviceOptions = [
  'Ramonage',
  'Débistrage',
  'Diag conformités',
  'Diag incendie',
  'Entretien appareil',
  'Autres',
] as const;

export const sootTypeOptions = [
  'Suies fines et volatiles',
  'Suies carbonées',
  'Suies bistres',
  'Suies brûlées',
  "Infiltrations d'eau de pluie",
] as const;

export const sootVolumeOptions = [
  'Faible',
  'Modéré',
  'Important',
  'Très important',
] as const;

export const visibleDefectOptions = [
  'Élément terminal',
  'Souche',
  'Appareil de chauffage',
  'Conduit de raccordement',
  'Conduit de fumée',
  "Hotte d'insert ou d'âtre",
  "Amenée d'air dédiée",
  'Autres',
] as const;

export const adviceOptions = [
  "Ne plus utiliser l'installation jusqu'à réhabilitation",
  "Corriger les défauts d'installation",
  'Envisager un changement du générateur',
  'Faire réaliser un diagnostic du conduit de fumée',
  'Faire débistrer le conduit de fumée',
  "Améliorer les bonnes pratiques d'utilisation du foyer",
] as const;

export const woodBestPracticeItems = [
  "Bois sec inférieur à 23% d'humidité.",
  'Stockage du bois sous abri ventilé.',
  'Préférer les bûches fendues aux rondins.',
  'Préférer les petites sections ou longueurs de bûches.',
  'Chargement adapté à la puissance du générateur.',
  'Allumage du feu en top down.',
  "Vider régulièrement le cendrier pour laisser passer l'air comburant.",
  'Éviter la mise au ralenti excessive, notamment la nuit.',
] as const;

export type ReportDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  interventionDate: string;
  customerLastName: string;
  customerFirstName: string;
  services: string[];
  sootTypes: string[];
  sootVolume: string;
  visibleDefects: string[];
  advice: string[];
  observations: string;
  /** SVG path commands, one per stroke, in the SIGNATURE_BOX coordinate space. */
  signature: string[];
};

export type ReportSummary = {
  id: string;
  interventionDate: string;
  customerLastName: string;
  customerFirstName: string;
  updatedAt: string;
};

/**
 * The coordinate space signature strokes are captured and replayed in. Every
 * surface that draws or displays a signature must use this exact aspect ratio,
 * otherwise the two axes get scaled differently and the stroke comes out skewed.
 */
export const SIGNATURE_BOX = { width: 600, height: 260 } as const;

/**
 * Lowercases and strips accents so a search for "perrin" matches "Pérrin". Uses
 * an explicit combining-mark range rather than a Unicode property escape, which
 * is not dependable on Hermes.
 */
export function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function customerFullName(report: {
  customerFirstName: string;
  customerLastName: string;
}) {
  return [report.customerFirstName.trim(), report.customerLastName.trim()]
    .filter(Boolean)
    .join(' ');
}

function todayAsFrenchDate() {
  return new Intl.DateTimeFormat('fr-FR').format(new Date());
}

/** `interventionDate` is stored the way it is printed: jj/mm/aaaa. */
export function parseInterventionDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The date a report is filed under: the intervention itself, else when it was saved. */
export function reportDate(summary: Pick<ReportSummary, 'interventionDate' | 'updatedAt'>) {
  const interventionDate = parseInterventionDate(summary.interventionDate);

  if (interventionDate) {
    return interventionDate;
  }

  const savedAt = new Date(summary.updatedAt);

  return Number.isNaN(savedAt.getTime()) ? new Date(0) : savedAt;
}

export function createEmptyReport(): ReportDraft {
  const timestamp = new Date().toISOString();

  return {
    id: `report-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    interventionDate: todayAsFrenchDate(),
    customerLastName: '',
    customerFirstName: '',
    services: [],
    sootTypes: [],
    sootVolume: '',
    visibleDefects: [],
    advice: [],
    observations: '',
    signature: [],
  };
}

export function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// A4 at 72 PPI, the unit expo-print expects. Without this the page defaults to
// US Letter (612x792).
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

export function buildReportHtml(report: ReportDraft) {
  const RED = '#BA1E26';
  const RED_BG = '#FFF5F6';
  const TEXT = '#1A1410';
  const MUTED = '#6B6260';
  const BORDER = '#E0DCDA';

  function cb(option: string, checked: boolean) {
    const box = checked
      ? '<span style="display:inline-block;width:11px;height:11px;background:' + RED + ';border:1px solid ' + RED + ';color:white;font-size:8px;font-weight:bold;line-height:11px;text-align:center;flex-shrink:0;">&#x2713;</span>'
      : '<span style="display:inline-block;width:11px;height:11px;border:1px solid #AAAAAA;background:white;flex-shrink:0;"></span>';
    return '<div style="display:flex;align-items:center;gap:5px;font-size:9px;padding:4px 0;">' + box + '<span>' + escapeHtml(option) + '</span></div>';
  }

  function inlineLabel(title: string) {
    return '<div style="font-size:7px;font-weight:700;color:' + MUTED + ';text-transform:uppercase;letter-spacing:0.9px;padding-bottom:4px;margin-bottom:6px;border-bottom:0.5px solid ' + BORDER + ';">' + title + '</div>';
  }

  const legalLeft = [
    'Le ramonage doit être effectué au moins 1 fois par an (+ sur les conseils du ramoneur)',
    'Le ramonage ne peut être effectué que par une personne qualifiée',
    'Une vérification approfondie des ouvrages tubés doit être réalisée tous les 3 ans',
  ];
  const legalRight = [
    "Un diagnostic doit être réalisé lors d'un changement d'occupant (location)",
    'Après tout feu de cheminée, un diagnostic doit être réalisé conformément au DTU 24.1',
    'Les appareils de chauffage doivent être entretenus au moins 1 fois par an par un professionnel qualifié',
  ];

  function legalItem(txt: string) {
    return '<div style="display:flex;align-items:flex-start;gap:5px;font-size:8px;line-height:1.35;color:#3A1A1A;margin-bottom:5px;"><span style="color:' + RED + ';font-weight:900;flex-shrink:0;margin-top:1px;">&#x25B8;</span><span>' + escapeHtml(txt) + '</span></div>';
  }

  function subLabelFirst(txt: string) {
    return '<div style="font-size:8px;font-weight:700;color:' + MUTED + ';text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">' + txt + '</div>';
  }

  function bulletItem(txt: string) {
    return '<div style="display:flex;align-items:flex-start;gap:5px;font-size:9px;padding:3px 0;line-height:1.35;"><span style="color:' + RED + ';flex-shrink:0;margin-top:1px;">&#x2022;</span><span>' + escapeHtml(txt) + '</span></div>';
  }

  // Header — simplified: company name + address only, no date/intervenant/generated
  const header = [
    '<div style="border-bottom:2px solid ' + RED + ';padding-bottom:8px;margin-bottom:10px;">',
    '<div style="font-size:17px;font-weight:900;color:' + RED + ';text-transform:uppercase;letter-spacing:0.5px;">Ramonage Marc Gomes Sud Vend&eacute;e</div>',
    '<div style="font-size:8.5px;color:#888;margin-top:3px;">42 rue des Orch&icirc;d&eacute;es &middot; 85580 GRUES &middot; 06&nbsp;01&nbsp;04&nbsp;88&nbsp;77</div>',
    '</div>',
  ].join('');

  const titleBar = '<div style="background:' + RED + ';color:white;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-align:center;padding:8px;margin-bottom:12px;">Rapport d&#39;interventions</div>';

  function identityCell(label: string, value: string) {
    return '<td style="width:50%;vertical-align:top;padding-right:10px;">' +
      '<div style="font-size:7px;font-weight:700;color:' + MUTED + ';text-transform:uppercase;letter-spacing:0.9px;">' + label + '</div>' +
      '<div style="font-size:11px;font-weight:700;padding-top:2px;">' + (value ? escapeHtml(value) : '&mdash;') + '</div>' +
      '</td>';
  }

  const identity = [
    '<table style="table-layout:fixed;border-collapse:collapse;width:100%;margin-bottom:14px;">',
    '<tr>',
    identityCell('Client', customerFullName(report)),
    identityCell('Date de l&#39;intervention', report.interventionDate),
    '</tr>',
    '</table>',
  ].join('');

  const legalBox = [
    '<div style="border:1.5px solid ' + RED + ';margin-bottom:14px;overflow:hidden;">',
    '<div style="background:' + RED + ';color:white;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;padding:4px 10px;">',
    'Rappel des obligations et des fr&eacute;quences r&eacute;glementaires en mati&egrave;re de ramonage et d&#39;entretien &mdash; D&eacute;cret 2023-641 du 20 juillet 2023',
    '</div>',
    '<table style="table-layout:fixed;border-collapse:collapse;width:100%;background:' + RED_BG + ';">',
    '<tr>',
    '<td style="padding:8px 10px;vertical-align:top;width:50%;">',
    legalLeft.map(legalItem).join(''),
    '</td>',
    '<td style="padding:8px 10px;vertical-align:top;width:50%;border-left:0.5px solid #F0C8C8;">',
    legalRight.map(legalItem).join(''),
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
  ].join('');

  // Prestation — subtle inline label + 3-column checkbox grid
  const prestationRows: string[] = [];
  for (let i = 0; i < serviceOptions.length; i += 3) {
    const cells = (serviceOptions as readonly string[]).slice(i, i + 3)
      .map((o) => '<td style="width:33%;vertical-align:top;">' + cb(o, report.services.includes(o)) + '</td>')
      .join('');
    prestationRows.push('<tr>' + cells + '</tr>');
  }

  const prestation = [
    '<div style="margin-bottom:14px;">',
    inlineLabel('Prestation demand&eacute;e par le client'),
    '<table style="table-layout:fixed;border-collapse:collapse;width:100%;">',
    prestationRows.join(''),
    '</table>',
    '</div>',
  ].join('');

  // Rapport d'intervention — full-width, 3 columns inside
  const rapport = [
    '<div style="margin-bottom:14px;">',
    inlineLabel('Rapport d&#39;intervention'),
    '<table style="table-layout:fixed;border-collapse:collapse;width:100%;">',
    '<tr>',
    '<td style="width:34%;vertical-align:top;padding-right:8px;">',
    subLabelFirst('Types de su&iuml;es'),
    sootTypeOptions.map((o) => cb(o, report.sootTypes.includes(o))).join(''),
    '</td>',
    '<td style="width:22%;vertical-align:top;padding:0 8px;border-left:0.5px solid ' + BORDER + ';border-right:0.5px solid ' + BORDER + ';">',
    subLabelFirst('Volume des su&iuml;es'),
    sootVolumeOptions.map((o) => cb(o, report.sootVolume === o)).join(''),
    '</td>',
    '<td style="width:44%;vertical-align:top;padding-left:8px;">',
    subLabelFirst('D&eacute;fauts apparents'),
    visibleDefectOptions.map((o) => cb(o, report.visibleDefects.includes(o))).join(''),
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
  ].join('');

  const row2 = [
    '<div style="margin-bottom:14px;">',
    '<table style="table-layout:fixed;border-collapse:collapse;width:100%;">',
    '<tr>',
    '<td style="width:50%;vertical-align:top;padding-right:8px;">',
    inlineLabel('Conseils'),
    adviceOptions.map((o) => cb(o, report.advice.includes(o))).join(''),
    '</td>',
    '<td style="width:50%;vertical-align:top;padding-left:8px;border-left:0.5px solid ' + BORDER + ';">',
    inlineLabel('Bonnes pratiques bois'),
    woodBestPracticeItems.map(bulletItem).join(''),
    '</td>',
    '</tr>',
    '</table>',
    '</div>',
  ].join('');

  const obsColor = report.observations ? TEXT : '#AAA';
  const obsStyle = report.observations ? 'normal' : 'italic';
  const observations = [
    inlineLabel('Autres observations'),
    '<p style="font-size:9px;color:' + obsColor + ';font-style:' + obsStyle + ';min-height:60px;line-height:1.6;">',
    report.observations ? escapeHtml(report.observations) : 'Aucune observation compl&eacute;mentaire',
    '</p>',
  ].join('');

  // Reserves exactly the height a signature would take, so an unsigned report
  // keeps the same layout as a signed one.
  const signatureSpacer =
    '<div style="width:100%;aspect-ratio:' + SIGNATURE_BOX.width + '/' + SIGNATURE_BOX.height + ';"></div>';

  // Strokes are replayed as SVG, so the signature stays crisp at print resolution
  // instead of being a rasterised image scaled to the page.
  const signaturePaths = report.signature
    .map((stroke) => '<path d="' + escapeHtml(stroke) + '" fill="none" stroke="' + TEXT + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    .join('');
  const signatureBox = report.signature.length
    // No fixed height: the viewBox aspect ratio drives it, so the printed stroke
    // has the same proportions as the one drawn on screen.
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIGNATURE_BOX.width + ' ' + SIGNATURE_BOX.height + '" style="width:100%;display:block;">' + signaturePaths + '</svg>'
    : signatureSpacer;

  // Only the client signs: Marc is identified by the letterhead and by the invoice.
  const signature = [
    '<div style="width:52%;margin-top:14px;">',
    inlineLabel('Signature du client'),
    signatureBox,
    '<div style="border-top:0.5px solid ' + MUTED + ';padding-top:3px;font-size:7.5px;color:' + MUTED + ';">',
    report.signature.length
      ? escapeHtml(customerFullName(report) || 'Client')
      : 'Non sign&eacute;',
    '</div>',
    '</div>',
  ].join('');

  const footer = '<div style="margin-top:12px;padding-top:5px;border-top:0.5px solid #D4D4D4;text-align:center;font-size:7.5px;color:#AAA;">Ramonage Marc Gomes Sud Vend&eacute;e &middot; 42 rue des Orch&icirc;d&eacute;es &middot; 85580 GRUES &middot; 06&nbsp;01&nbsp;04&nbsp;88&nbsp;77</div>';

  // Android's print WebView ignores `@page { margin }`, which pushes the content
  // flush against the paper edge and clips right-hand borders. The margin is a
  // real padding on a wrapper instead, so it holds on every platform.
  // No `size` here on purpose: the paper is already set to A4 by the width/height
  // passed to printToFileAsync. Declaring it again makes Chromium fit the content
  // to its own page box and anchor it top-left, leaving a gap on the right.
  const pageStyle = '@page { margin: 0; }';
  const bodyStyle = 'font-family: Arial, Helvetica, sans-serif; color: ' + TEXT + '; margin: 0; padding: 0; font-size: 10px; line-height: 1.4; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact;';

  // The page width is pinned in `pt` rather than left to `auto`/`100%`. Android
  // creates the printing WebView without ever attaching or measuring it, so its
  // layout viewport is not the paper width, and content sized against that
  // viewport ends up narrower than the sheet and flush left. 1pt = 1/72in, the
  // same unit printToFileAsync takes, so this matches the paper exactly.
  const pageWidth = A4_WIDTH + 'pt';

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><style>' +
    pageStyle + ' * { box-sizing: border-box; } body { ' + bodyStyle + ' }' +
    ' .page { width: ' + pageWidth + '; padding: 12mm; }' +
    ' table { border-collapse: collapse; width: 100%; } h1, h2, h3, p { margin: 0; }' +
    '</style></head><body><div class="page">' +
    header + titleBar + identity + legalBox + prestation + rapport + row2 + observations +
    signature + footer +
    '</div></body></html>';
}

const PAGE_OPTIONS = {
  width: A4_WIDTH,
  height: A4_HEIGHT,
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
};

/** Date first, so the file manager sorts reports chronologically on its own. */
export function reportFileName(report: ReportDraft) {
  const date = parseInterventionDate(report.interventionDate);
  const stamp = date
    ? [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')
    : 'sans-date';
  const customer = customerFullName(report).replace(/[\\/:*?"<>|]+/g, '-').trim();

  return customer ? `rapport-${stamp}-${customer}.pdf` : `rapport-${stamp}.pdf`;
}

export async function exportReportPdf(report: ReportDraft) {
  const html = buildReportHtml(report);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return null;
  }

  purgeGeneratedPdfs();

  const { uri } = await Print.printToFileAsync({ html, ...PAGE_OPTIONS });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: `Partager le rapport - ${COMPANY_NAME}`,
      mimeType: 'application/pdf',
    });
  }
  return uri;
}

export type SavePdfResult =
  | { status: 'saved'; name: string }
  | { status: 'shared' }
  | { status: 'cancelled' };

const SAVE_DIRECTORY_KEY = 'pdf-save-directory';

/** Asks for a folder and remembers it, so later saves are a single tap. */
export async function chooseSaveDirectory() {
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissions.granted) {
    return null;
  }

  await setSetting(SAVE_DIRECTORY_KEY, permissions.directoryUri);

  return permissions.directoryUri;
}

async function writePdf(directoryUri: string, name: string, base64: string) {
  const fileUri = await StorageAccessFramework.createFileAsync(
    directoryUri,
    name,
    'application/pdf'
  );
  await StorageAccessFramework.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
  await recordSavedPdf(fileUri);
}

/**
 * Writes the PDF where the user chooses. Android's share sheet is an ACTION_SEND
 * intent, which the Files app does not answer, so saving needs the Storage
 * Access Framework instead.
 */
export async function saveReportPdf(report: ReportDraft): Promise<SavePdfResult> {
  if (Platform.OS !== 'android') {
    // Elsewhere the share sheet already offers a "save to files" destination.
    await exportReportPdf(report);
    return { status: 'shared' };
  }

  const name = reportFileName(report);
  const rememberedDirectory = await getSetting(SAVE_DIRECTORY_KEY);
  const directoryUri = rememberedDirectory ?? (await chooseSaveDirectory());

  if (!directoryUri) {
    return { status: 'cancelled' };
  }

  purgeGeneratedPdfs();

  const { base64 } = await Print.printToFileAsync({
    html: buildReportHtml(report),
    ...PAGE_OPTIONS,
    base64: true,
  });

  if (!base64) {
    throw new Error("Le PDF n'a pas pu être encodé.");
  }

  try {
    await writePdf(directoryUri, name, base64);
  } catch (error) {
    // A remembered folder can be deleted, or its permission revoked by Android.
    if (!rememberedDirectory) {
      throw error;
    }

    await setSetting(SAVE_DIRECTORY_KEY, null);
    const freshDirectory = await chooseSaveDirectory();

    if (!freshDirectory) {
      return { status: 'cancelled' };
    }

    await writePdf(freshDirectory, name, base64);
  }

  return { status: 'saved', name };
}
