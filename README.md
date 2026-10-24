# Sari-Sari Store

A free, offline-first app for managing a sari-sari store's products and stock.
It runs on **Android and iPhone** as a Progressive Web App (PWA): open it once
in the phone's browser, add it to the Home Screen, and it works without internet.

Your product data stays on your phone. It is never uploaded anywhere.

**Start here:** [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) covers installing the app on a phone, publishing
updates, backups and troubleshooting.

App address: https://los-99.github.io/sari-sari-store/

## Commands

Run these in a terminal inside this folder.

| Command | What it does |
|---|---|
| `npm install` | Downloads the libraries listed in `package.json` (first time only, or after they change). |
| `npm run dev` | Starts a live preview at http://localhost:5173. The page refreshes when code changes. Press `Ctrl+C` to stop. |
| `npm run check` | Checks the code for type errors. |
| `npm run build` | Builds the finished app into the `dist/` folder. |
| `npm run preview` | Serves the built `dist/` folder at http://localhost:4173, including offline support. |
| `npm test` | Runs the automatic logic checks. |
| `npm run generate-icons` | Recreates the app icons in `public/` from `public/icon.svg`. |

## Folder overview

| Folder / file | Contents |
|---|---|
| `src/screens/` | One file per screen (Dashboard, Products, Scanner, …) |
| `src/components/` | Pieces shared by screens (top bar, bottom navigation, icons, …) |
| `src/lib/` | App logic: screen addresses (`routes.ts`), navigation, offline support |
| `src/lib/db/` | The on-phone database and the product repository (all saving goes through `products.ts`) |
| `src/lib/model/`, `src/lib/util/` | Product fields, limits, peso/centavo conversion, validation rules, stock status |
| `src/app.css` | Colors, sizes and shared styles |
| `public/` | App icons |
| `vite.config.ts` | Build settings, app name and offline settings |
| `.github/workflows/deploy.yml` | Publishes the app to GitHub Pages |
| `src/lib/scanner/`, `src/lib/backup/` | Camera barcode scanning, and backup export / restore |
| `docs/` | Setup guide, testing checklist, data model and backup file format |
