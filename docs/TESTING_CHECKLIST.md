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

## Phase 3: Local database

There's no product form yet (that's Phase 4), so these checks confirm the database
opens and keeps data between visits.

### On your phone (after Phase 3 is published)

- [ ] Open the app from its Home Screen icon. If a bar says **"A new version of the app is ready"**, tap **Update**.
- [ ] Settings → **App version** shows **0.2.0**.
- [ ] Settings → **Database** shows **Ready** (green).
- [ ] Home shows **0** for Active products, Low stock and Out of stock (not "…" and no red error box).
- [ ] *(Phase 3 only: the "Times opened" counter was removed in Phase 4, which tests saving with real products.)*
- [ ] Note what **Protected from automatic clearing** shows (Yes / No / Not available) and tell me.
      It doesn't stop the app from working; it tells us how carefully we need to back up on that phone.

### Automatic checks (optional, on your PC)

In a terminal in the project folder, run `npm test`. All checks should pass (green ✓).
They cover peso/centavo conversion, validation rules, stock status and screen addresses.

## Phase 4: Product management

Do these on your phone, opened from the Home Screen icon. Settings should show **App version 0.3.0**
(tap **Update** if the "new version" bar appears). Then turn on **airplane mode** for the whole test.

### Adding products

- [ ] Products tab with no products shows **"No products yet"** and an **Add product** button.
- [ ] Add a product with every field filled, e.g. *Coke Mismo 290ml*, barcode `4801981116072`, Beverages,
      bottle, cost `16.50`, selling `20`. Tap **Save product**.
      → "Product saved" appears and the details screen opens.
- [ ] The details show **₱20.00** selling, **₱16.50** cost and **Profit per bottle: ₱3.50**.
- [ ] Press the **←** back arrow. You return to the list (not to the empty form), and the product is there.
- [ ] Add a product **without a barcode** (e.g. *Ice tubig*). It saves. Add a second one without a barcode; it saves too.
- [ ] Tap **Save product** on an empty form. Name, cost price and selling price turn red with messages,
      and the screen jumps to the first problem. Fixing a field makes its message disappear as you type.
- [ ] Try these prices and check the message: `-5` (negative), `12.505` (too many decimals), `12,50` (comma), `abc`.
- [ ] Type `1,250` as a price. It's accepted as **₱1,250.00**.
- [ ] Try stock `-1` and `2.5`. Both are refused.
- [ ] Barcode with leading zeros, e.g. `0012345678905`: after saving, the details show all the zeros.

### Duplicate and warning checks

- [ ] Add another product using barcode `4801981116072` (already used). The barcode field says
      **already used by "Coke Mismo 290ml"**, and an **Open "Coke Mismo 290ml"** button takes you to it. Nothing new is saved.
- [ ] Add a product named **coke mismo 290ML** (same name, different capitals, no barcode). A **"Save anyway?"**
      box warns about the same name. **Go back** keeps you on the form; **Save anyway** saves it.
- [ ] Enter selling **lower** than cost. The form shows **Loss per unit** in red, and saving asks **"Save anyway?"**.

### Editing

- [ ] Open a product → **Edit**. The form shows the saved values (prices like `16.50`).
- [ ] Change the selling price and tap **Save** (top bar). "Changes saved" appears and the details update.
- [ ] Edit again, change something, then press **←**. A **"Discard changes?"** box appears.
      **Keep editing** stays; **Discard** leaves without saving.
- [ ] *(Android)* Same as above using the phone's own **Back** button / gesture.
- [ ] Edit without changing anything, then press **←**. It leaves without asking.

### Stock on the details screen

- [ ] **+1** and **−1** change the stock right away. **−1** is greyed out at 0.
- [ ] **Set…** opens a box. Enter `3` → "Stock set to 3 …". With a low-stock alert of 5, a **LOW** label appears.
- [ ] Set stock to `0`. An **OUT** label appears.
- [ ] In the Set box, try `-1` and `abc`. Both show an error and nothing changes.
- [ ] Home shows the right numbers for Active products, Low stock and Out of stock.

### Deactivating

- [ ] Details → **Deactivate product**. A box explains it's hidden, not deleted. **Cancel** changes nothing.
- [ ] Confirm. The product shows **"This product is deactivated"**, it's gone from the list, and the Home counts drop.
- [ ] The list now shows **Show deactivated products (1)**. Tick it; the product appears greyed with **INACTIVE**.
- [ ] Open it → **Reactivate**. It's back in the list and counts.
- [ ] While it's deactivated, try adding a new product with its barcode. It's refused (barcode still reserved).

### Data survives

- [ ] Fully close the app (swipe it away) and reopen it, still in airplane mode. All products and changes are still there.
- [ ] Restart the phone and open the app. Everything is still there.

### Automatic checks (on your PC)

Run `npm test`. All checks should pass, including the new ones for the database
(`src/lib/db/products.test.ts`) and the form (`src/lib/model/product-form.test.ts`).
