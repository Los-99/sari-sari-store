# Manual Testing Checklist

Each phase adds its own section. Mark each item ✅ (works) or ❌ (problem, with a note).

## Phase 2 — Project setup

### On your PC (Chrome or Edge)

Start the preview: open a terminal in the project folder and run `npm run build`, then `npm run preview`.
Open http://localhost:4173. To see a phone-sized view, press `F12`, then click the phone/tablet
icon (Toggle device toolbar) and choose a phone such as "iPhone 12 Pro".

- [ ] The Home screen shows the three stock cards (with "—"), a large **Scan barcode** button and an **Add product** button.
- [ ] The bottom bar shows Home, Products, Scan (large round button in the middle), Inventory and Settings.
- [ ] Tapping each bottom-bar item opens that screen, and the item is highlighted.
- [ ] **Add product** (on Home) and the **＋** button (on Products) open the "Add Product" screen.
- [ ] On "Add Product", the **←** arrow returns to the previous screen.
- [ ] The browser's Back button moves back through the screens you visited, in order.
- [ ] Typing the address http://localhost:4173/#/products/5 shows "Product Details", and **Edit** opens "Edit Product".
- [ ] Typing http://localhost:4173/#/nonsense shows "Page not found", and **Go to Home** works.
- [ ] Settings → App status shows **App version 0.1.0**.
- [ ] Offline check: open the app, close the tab, and open it again. Settings → **Works offline** shows **Yes**.
  Then press `F12` → **Network** tab → change "No throttling" to **Offline**, and reload the page. The app still opens.

### On your phones (after the first publish to GitHub Pages)

- [ ] **iPhone:** open the app link in **Safari** → Share → **Add to Home Screen**. The icon (green, with a yellow awning) appears.
- [ ] **Android:** open the app link in **Chrome** → ⋮ menu → **Add to Home screen** / **Install app**.
- [ ] Opened from the icon, the app fills the screen without the browser address bar.
- [ ] Settings shows **Opened from Home Screen: Yes**, and **Works offline: Yes** (close and reopen the app once if it says "Not yet").
- [ ] Turn on **airplane mode**, fully close the app, and open it from the icon. It still opens and all tabs work.
- [ ] The bottom bar isn't hidden behind the iPhone's home indicator or Android's navigation buttons.
