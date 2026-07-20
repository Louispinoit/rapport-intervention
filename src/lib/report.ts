import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { COMPANY_NAME } from '@/constants/company';

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
  technicianName: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  jobLocation: string;
  interventionDate: string;
  olderThanTwoYears: boolean;
  services: string[];
  sootTypes: string[];
  sootVolume: string;
  visibleDefects: string[];
  advice: string[];
  observations: string;
};

export type ReportSummary = {
  id: string;
  customerName: string;
  interventionDate: string;
  jobLocation: string;
  updatedAt: string;
};

function todayAsFrenchDate() {
  return new Intl.DateTimeFormat('fr-FR').format(new Date());
}

export function createEmptyReport(): ReportDraft {
  const timestamp = new Date().toISOString();

  return {
    id: `report-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    technicianName: '',
    customerName: '',
    customerAddress: '',
    customerContact: '',
    jobLocation: '',
    interventionDate: todayAsFrenchDate(),
    olderThanTwoYears: true,
    services: [],
    sootTypes: [],
    sootVolume: '',
    visibleDefects: [],
    advice: [],
    observations: '',
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

  function sec(title: string) {
    return '<div style="font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;background:' + RED + ';color:white;padding:5px 9px;margin-bottom:6px;">' + title + '</div>';
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

  function subLabel(txt: string) {
    return '<div style="font-size:8px;font-weight:700;color:' + MUTED + ';text-transform:uppercase;letter-spacing:0.5px;margin:9px 0 4px;">' + txt + '</div>';
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

  const footer = '<div style="margin-top:12px;padding-top:5px;border-top:0.5px solid #D4D4D4;text-align:center;font-size:7.5px;color:#AAA;">Ramonage Marc Gomes Sud Vend&eacute;e &middot; 42 rue des Orch&icirc;d&eacute;es &middot; 85580 GRUES &middot; 06&nbsp;01&nbsp;04&nbsp;88&nbsp;77</div>';

  const pageStyle = '@page { margin: 12mm 12mm; }';
  const bodyStyle = 'font-family: Arial, Helvetica, sans-serif; color: ' + TEXT + '; margin: 0; font-size: 10px; line-height: 1.4; background: white;';

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><style>' +
    pageStyle + ' * { box-sizing: border-box; } body { ' + bodyStyle + ' } table { border-collapse: collapse; width: 100%; } h1, h2, h3, p { margin: 0; }' +
    '</style></head><body>' +
    header + titleBar + legalBox + prestation + rapport + row2 + observations + footer +
    '</body></html>';
}

export async function exportReportPdf(report: ReportDraft) {
  const html = buildReportHtml(report);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return null;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: `Partager le rapport - ${COMPANY_NAME}`,
      mimeType: 'application/pdf',
    });
  }
  return uri;
}
