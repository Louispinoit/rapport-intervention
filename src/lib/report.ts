import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { COMPANY_NAME } from '@/constants/company';
import { purgeGeneratedPdfs } from '@/lib/pdf-cache';
import { photoDataUri } from '@/lib/photos';
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
  'Tubage défectueux ou vieillissant',
  "Hotte d'insert ou d'âtre",
  "Amenée d'air dédiée",
  'Autres',
] as const;

export const adviceOptions = [
  "Ne plus utiliser l'installation jusqu'à réhabilitation",
  "Corriger les défauts d'installation",
  "Envisager un changement de l'insert / poêle",
  "Faire réaliser un diagnostic du conduit de fumée. Une vérification de l'état du tubage incluant un test d'étanchéité doit être effectuée obligatoirement tous les 3 ans",
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

/** One flue swept during the visit, with its own findings. */
export type ChimneyEntry = {
  id: string;
  /** Free name, e.g. "Salon" or "Chaudière"; empty means "Conduit n". */
  label: string;
  services: string[];
  sootTypes: string[];
  sootVolume: string;
  visibleDefects: string[];
  advice: string[];
  observations: string;
};

export type ReportDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  interventionDate: string;
  customerLastName: string;
  customerFirstName: string;
  /** Where the job was done; printed on the PDF. */
  customerAddress: string;
  customerPhone: string;
  /** Always at least one. */
  chimneys: ChimneyEntry[];
  /** SVG path commands, one per stroke, in the SIGNATURE_BOX coordinate space. */
  signature: string[];
  /** Photo URIs: app files on the phone, data URIs on web. At most MAX_PHOTOS. */
  photos: string[];
};

export const MAX_PHOTOS = 4;
export const MAX_CHIMNEYS = 6;
/** Keeps one flue's findings on a single PDF page. */
export const MAX_OBSERVATIONS_LENGTH = 600;

export function chimneyLabel(chimney: Pick<ChimneyEntry, 'label'>, index: number) {
  return chimney.label.trim() || `Conduit ${index + 1}`;
}

/** Ticked anything at all: used to ask before throwing a flue away. */
export function chimneyHasAnswers(chimney: ChimneyEntry) {
  return (
    chimney.services.length > 0 ||
    chimney.sootTypes.length > 0 ||
    chimney.sootVolume !== '' ||
    chimney.visibleDefects.length > 0 ||
    chimney.advice.length > 0 ||
    chimney.observations.trim() !== '' ||
    chimney.label.trim() !== ''
  );
}

export type ReportSummary = {
  id: string;
  interventionDate: string;
  customerLastName: string;
  customerFirstName: string;
  customerAddress: string;
  customerPhone: string;
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

export { createEmptyChimney, createEmptyReport, normalizeReportDraft } from '@/lib/report-defaults';

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

/**
 * `photos` are data URIs: the print WebView can't open the app's own files.
 * Callers get them with `reportPhotoDataUris`.
 */
export function buildReportHtml(report: ReportDraft, photos: string[] = []) {
  const RED = '#BA1E26';
  const RED_BG = '#FFF5F6';
  const TEXT = '#1A1410';
  const MUTED = '#6B6260';
  const BORDER = '#E0DCDA';

  function cb(option: string, checked: boolean) {
    const box = checked
      ? '<span style="display:inline-block;width:11px;height:11px;background:' + RED + ';border:1px solid ' + RED + ';color:white;font-size:8px;font-weight:bold;line-height:11px;text-align:center;flex-shrink:0;margin-top:1px;">&#x2713;</span>'
      : '<span style="display:inline-block;width:11px;height:11px;border:1px solid #AAAAAA;background:white;flex-shrink:0;margin-top:1px;"></span>';
    return '<div style="display:flex;align-items:flex-start;gap:5px;font-size:9px;line-height:1.4;padding:3px 0;">' + box + '<span>' + escapeHtml(option) + '</span></div>';
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

  // Address and phone only appear once filled in, so older reports print as before.
  const contactRow =
    report.customerAddress || report.customerPhone
      ? '<tr><td colspan="2" style="height:8px;"></td></tr><tr>' +
        identityCell('Adresse de l&#39;intervention', report.customerAddress) +
        identityCell('T&eacute;l&eacute;phone', report.customerPhone) +
        '</tr>'
      : '';

  const identity = [
    '<table style="table-layout:fixed;border-collapse:collapse;width:100%;margin-bottom:14px;">',
    '<tr>',
    identityCell('Client', customerFullName(report)),
    identityCell('Date de l&#39;intervention', report.interventionDate),
    '</tr>',
    contactRow,
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

  // An option renamed since a report was saved (e.g. "changement du générateur")
  // is still printed, ticked, after the current ones: a regenerated PDF must
  // say what the client signed.
  function withRetired(options: readonly string[], selected: string[]) {
    return [...options, ...selected.filter((value) => !options.includes(value))];
  }

  // One flue's findings: what was asked, what was found, what to do about it.
  function chimneyFindings(chimney: ChimneyEntry) {
    // Prestation — subtle inline label + 3-column checkbox grid
    const prestationRows: string[] = [];
    const services = withRetired(serviceOptions, chimney.services);
    for (let i = 0; i < services.length; i += 3) {
      const cells = services.slice(i, i + 3)
        .map((o) => '<td style="width:33%;vertical-align:top;">' + cb(o, chimney.services.includes(o)) + '</td>')
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
      withRetired(sootTypeOptions, chimney.sootTypes).map((o) => cb(o, chimney.sootTypes.includes(o))).join(''),
      '</td>',
      '<td style="width:22%;vertical-align:top;padding:0 8px;border-left:0.5px solid ' + BORDER + ';border-right:0.5px solid ' + BORDER + ';">',
      subLabelFirst('Volume des su&iuml;es'),
      withRetired(sootVolumeOptions, chimney.sootVolume ? [chimney.sootVolume] : []).map((o) => cb(o, chimney.sootVolume === o)).join(''),
      '</td>',
      '<td style="width:44%;vertical-align:top;padding-left:8px;">',
      subLabelFirst('D&eacute;fauts apparents'),
      withRetired(visibleDefectOptions, chimney.visibleDefects).map((o) => cb(o, chimney.visibleDefects.includes(o))).join(''),
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
      withRetired(adviceOptions, chimney.advice).map((o) => cb(o, chimney.advice.includes(o))).join(''),
      '</td>',
      '<td style="width:50%;vertical-align:top;padding-left:8px;border-left:0.5px solid ' + BORDER + ';">',
      inlineLabel('Bonnes pratiques bois'),
      woodBestPracticeItems.map(bulletItem).join(''),
      '</td>',
      '</tr>',
      '</table>',
      '</div>',
    ].join('');

    const obsColor = chimney.observations ? TEXT : '#AAA';
    const obsStyle = chimney.observations ? 'normal' : 'italic';
    const observations = [
      inlineLabel('Autres observations'),
      // pre-line keeps the line breaks typed on the phone.
      '<p style="font-size:9px;color:' + obsColor + ';font-style:' + obsStyle + ';line-height:1.6;white-space:pre-line;overflow-wrap:anywhere;">',
      chimney.observations ? escapeHtml(chimney.observations) : 'Aucune observation compl&eacute;mentaire',
      '</p>',
    ].join('');

    return { checklists: prestation + rapport + row2, observations };
  }

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
    '<div>',
    inlineLabel('Signature du client'),
    signatureBox,
    '<div style="border-top:0.5px solid ' + MUTED + ';padding-top:3px;font-size:7.5px;color:' + MUTED + ';">',
    report.signature.length
      ? escapeHtml(customerFullName(report) || 'Client')
      : 'Non sign&eacute;',
    '</div>',
    '</div>',
  ].join('');

  const chimneys = report.chimneys;
  const several = chimneys.length > 1;
  const customerLine = [customerFullName(report) || 'Client', report.interventionDate, report.customerAddress]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' &middot; ');

  // Pages after the first repeat who and when in one line, so a loose sheet
  // still says which client it belongs to.
  const identityReminder =
    '<div style="font-size:9px;color:' + MUTED + ';padding-bottom:6px;margin-bottom:12px;border-bottom:0.5px solid ' + BORDER + ';">' +
    '<span style="font-weight:700;color:' + TEXT + ';">' + customerLine + '</span></div>';

  // Names the flue a page is about. Absent for a single flue, so those reports
  // print exactly as they always have.
  function chimneyBand(chimney: ChimneyEntry, index: number) {
    const name = chimney.label.trim();
    return '<div style="display:flex;align-items:baseline;gap:8px;background:' + RED_BG + ';border-left:3px solid ' + RED + ';padding:6px 10px;margin-bottom:12px;">' +
      '<span style="font-size:9px;font-weight:900;color:' + RED + ';text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">Conduit ' + (index + 1) + ' / ' + chimneys.length + '</span>' +
      (name ? '<span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">' + escapeHtml(name) + '</span>' : '') +
      '</div>';
  }

  // Photos go on a page of their own, two per row, so the report pages keep
  // their single-sheet layout.
  const photoCells = photos.map(
    (src) =>
      '<td style="width:50%;padding:4px;vertical-align:top;"><img src="' + src +
      '" style="width:100%;height:230px;object-fit:cover;display:block;border:0.5px solid ' + BORDER + ';"/></td>'
  );
  const photoRows: string[] = [];
  for (let i = 0; i < photoCells.length; i += 2) {
    photoRows.push('<tr>' + photoCells.slice(i, i + 2).join('') + (photoCells[i + 1] ? '' : '<td></td>') + '</tr>');
  }

  const pageCount = chimneys.length + (photos.length ? 1 : 0);
  // Numbered only when there is more than one sheet to keep together.
  function footer(pageNumber: number) {
    const number = pageCount > 1
      ? '<span style="position:absolute;right:0;top:5px;font-weight:700;color:' + MUTED + ';">' + pageNumber + '&thinsp;/&thinsp;' + pageCount + '</span>'
      : '';
    return '<div class="foot">Ramonage Marc Gomes Sud Vend&eacute;e &middot; 42 rue des Orch&icirc;d&eacute;es &middot; 85580 GRUES &middot; 06&nbsp;01&nbsp;04&nbsp;88&nbsp;77' + number + '</div>';
  }

  const pages = chimneys.map((chimney, index) => {
    const first = index === 0;
    const last = index === chimneys.length - 1;
    const findings = chimneyFindings(chimney);
    // The client signs once, on the last flue's page, for the whole visit. The
    // signature sits beside the observations rather than under them, which is
    // what keeps a fully ticked flue and its signature on one sheet.
    const closing = last
      ? '<table style="table-layout:fixed;border-collapse:collapse;width:100%;"><tr>' +
        '<td style="width:54%;vertical-align:top;padding-right:12px;">' + findings.observations + '</td>' +
        '<td style="width:46%;vertical-align:top;">' + signature + '</td>' +
        '</tr></table>'
      : findings.observations;
    return '<div class="page">' +
      header + titleBar +
      (first ? identity + legalBox : identityReminder) +
      (several ? chimneyBand(chimney, index) : '') +
      findings.checklists +
      closing +
      footer(index + 1) +
      '</div>';
  });

  if (photos.length) {
    pages.push(
      '<div class="page">' + header +
      inlineLabel('Photos de l&#39;intervention &middot; ' + escapeHtml(customerFullName(report) || 'Client') + ' &middot; ' + escapeHtml(report.interventionDate)) +
      '<table style="table-layout:fixed;border-collapse:collapse;width:100%;">' + photoRows.join('') + '</table>' +
      footer(pageCount) +
      '</div>'
    );
  }

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
  // Each sheet has the paper's height, so the footer sits at the same place on
  // every page and a flue never runs onto the next one. A hair under A4: a page
  // exactly as tall as the paper can round up and push a blank sheet out.
  const pageHeight = A4_HEIGHT - 2 + 'pt';

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><style>' +
    pageStyle + ' * { box-sizing: border-box; } body { ' + bodyStyle + ' }' +
    ' .page { position: relative; width: ' + pageWidth + '; height: ' + pageHeight + '; padding: 12mm 12mm 18mm; overflow: hidden; break-after: page; page-break-after: always; }' +
    ' .page:last-child { break-after: auto; page-break-after: auto; }' +
    ' .foot { position: absolute; left: 12mm; right: 12mm; bottom: 9mm; padding-top: 5px; border-top: 0.5px solid #D4D4D4; text-align: center; font-size: 7.5px; color: #AAA; }' +
    ' table { border-collapse: collapse; width: 100%; } h1, h2, h3, p { margin: 0; }' +
    '</style></head><body>' + pages.join('') + '</body></html>';
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

/** Photos as data URIs for the PDF; a missing file is skipped rather than failing the export. */
export async function reportPhotoDataUris(report: ReportDraft) {
  const photos = await Promise.all(report.photos.map((uri) => photoDataUri(uri).catch(() => null)));
  return photos.filter((photo): photo is string => photo !== null);
}

export async function exportReportPdf(report: ReportDraft) {
  const html = buildReportHtml(report, await reportPhotoDataUris(report));

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
    html: buildReportHtml(report, await reportPhotoDataUris(report)),
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
