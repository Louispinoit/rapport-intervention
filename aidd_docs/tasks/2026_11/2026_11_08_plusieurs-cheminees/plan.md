---
objective: "Un rapport peut couvrir plusieurs conduits, chacun avec son propre questionnaire, à l'écran comme dans un PDF propre d'une page par conduit, sans rien casser des rapports et sauvegardes existants."
status: in-progress
---

# Plan: Plusieurs cheminées par rapport

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Ajouter/retirer des conduits dans un rapport, un questionnaire complet par conduit, un PDF d'une page par conduit. |
| **Source** | Texte : « il faudrait pouvoir avoir plusieurs cheminées sur un rapport… à chaque fois le questionnaire pour chaque cheminée ajoutée… vérifie aussi le PDF, faut qu'il soit nickel chrome » |

## Phases

| #   | Phase                                   | File                         |
| --- | --------------------------------------- | ---------------------------- |
| 1   | Modèle de données, migration, sauvegarde | [`phase-1.md`](./phase-1.md) |
| 2   | Formulaire et écran du rapport          | [`phase-2.md`](./phase-2.md) |
| 3   | PDF multi-conduits et vérification      | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://docs.expo.dev/versions/v55.0.0/sdk/print/ | `printToFileAsync` rend du HTML dans le WebView Chromium d'Android : `page-break-before` / `break-inside: avoid` sont respectés (déjà utilisé pour la page photos). |
| `src/lib/report.ts` (`buildReportHtml`) | La page actuelle tient sur une feuille A4 (≈ 1150 px) ; un conduit = le même gabarit, donc une page par conduit tient. |
| `src/lib/report-defaults.ts` (`normalizeReportDraft`) | Point unique par lequel passent les deux stores et la restauration : la conversion des anciens rapports s'y fait sans migration SQL. |

## Decisions

| Decision | Why |
| -------- | --- |
| Par conduit : nom du conduit, prestation, types/volume de suies, défauts, conseils, observations. Restent uniques au rapport : client, date, adresse, téléphone, photos, signature. | Le client signe une fois pour toute l'intervention ; le constat et les conseils dépendent de chaque conduit. |
| `ReportDraft.chimneys: ChimneyEntry[]` (au moins 1) remplace les champs à plat ; les anciens rapports sont convertis à la lecture en un seul conduit. | Pas de migration de base : les données restent du JSON, l'ancien format reste lisible pour toujours. |
| Sauvegarde passe en version 2 ; la restauration accepte 1 et 2. | Une ancienne app qui restaurerait un fichier v2 perdrait les conduits : elle le refuse déjà grâce au contrôle de version. |
| PDF : une page A4 par conduit. Rappel réglementaire sur la 1ʳᵉ page seulement, signature sur la dernière page de conduit, « Conduit 2/3 · Salon » dans le bandeau, photos en dernière page. Un rapport à un seul conduit sort identique à aujourd'hui. | Chaque page reste lisible seule, aucun conduit coupé entre deux pages, et pas de régression pour le cas courant. |
| Dans le formulaire, des onglets « Conduit 1 · Conduit 2 · + » choisissent le questionnaire affiché, plutôt que tout empiler. | Avec 3 conduits, une page empilée triplerait le défilement ; les onglets montrent d'un coup d'œil quel conduit est incomplet. |
| Maximum 6 conduits par rapport. | Au-delà, c'est un autre chantier ; borne la taille du PDF. |
