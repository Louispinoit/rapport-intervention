# Rapport Intervention

Application Expo orientée Android pour saisir des rapports d’intervention de ramonage, enregistrer des brouillons localement et générer un PDF partageable.

## V1 prévue

- saisie client / chantier / références
- prestations et lignes de travaux
- constats techniques, conseils, observations
- sauvegarde locale des brouillons
- génération PDF sans signature client

## Commandes utiles

```bash
pnpm start
pnpm android
pnpm web
pnpm lint
```

## Build Android direct

Le projet contient une configuration `eas.json` pour produire plus tard une APK installable directement sur le téléphone.

Exemples :

```bash
eas build -p android --profile preview
eas build -p android --profile development
```

## Structure

- `src/app/index.tsx` : accueil
- `src/app/history.tsx` : historique local
- `src/app/report/new.tsx` : saisie du rapport
- `src/lib/report.ts` : modèle métier, calculs et PDF
- `src/lib/report-store.ts` : stockage local
