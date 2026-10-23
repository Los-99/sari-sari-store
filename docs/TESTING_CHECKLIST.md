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

## Phase 5: Search, filters and inventory

Settings should show **App version 0.4.0**. Use **airplane mode** for the whole test.
You need a few products first, ideally including:

- some with a barcode and some without
- at least 2 categories
- one **low** (e.g. stock 2, alert 5), one **out** (stock 0), and one deactivated

### Search (Products tab)

- [ ] Type part of a name, e.g. `canton`. Only matching products show, and the count says "… found".
- [ ] Capitals don't matter: `CANTON` finds the same.
- [ ] Words in any order: `canton lucky` finds "Lucky Me Pancit Canton".
- [ ] Accents don't matter: `pina` finds a product named "Piña …".
- [ ] Full barcode, e.g. `4801981116072`, finds that product. Part of a barcode (last 5–6 digits) also works.
- [ ] A barcode with leading zeros (e.g. `0048…`) is found when you type the zeros.
- [ ] Nonsense like `xyz` shows **No products match "xyz"** with a **Clear search & filters** button that works.
- [ ] The **×** in the search box clears it.

### Filters and sorting

- [ ] **Category** shows only categories you've used. Choosing one shows only those products, and the box turns green.
- [ ] **Stock level**: *Low stock*, *Out of stock* and *Low or out of stock* each show the right products.
- [ ] Search + category + stock together narrow the list correctly.
- [ ] **Sort**: Name (A–Z), Price lowest/highest first, Stock fewest/most first all reorder correctly.
- [ ] **Show deactivated products** adds deactivated items (greyed, INACTIVE).
- [ ] **Clear search & filters** resets search, category and stock (sorting stays).

### Back button keeps your place

- [ ] Search and filter, scroll down, open a product, then press **←**. The same search, filters and scroll position are still there.
- [ ] Tap the **Products** tab at the bottom. The list starts fresh, with no filters.

### Inventory tab

- [ ] **Home → Low stock card** opens Inventory on the **Low** tab. **Out of stock card** opens the **Out** tab.
- [ ] Tab counts match the Home numbers. **All** lists every active product, fewest stock first.
- [ ] On **Low**, tap **+1** until a product is above its alert. It stays in the list marked **✓ Restocked**
      (so it doesn't jump away). Switch tabs and back: now it's gone from Low.
- [ ] **−1** is greyed out at 0. **Set…** sets an exact number, and wrong input (`-1`, `abc`) is refused.
- [ ] Tap a product's name to open its details; **←** returns to the same Inventory tab.
- [ ] With nothing low, the Low tab says **"Nothing is running low"**.

### Automatic checks (on your PC)

Run `npm test`. The new search/filter checks are in `src/lib/util/product-filter.test.ts`.

## Phase 6: Barcode scanner

Settings should show **App version 0.5.0**. You need real products with barcodes (from the store shelf).
Do the first test **with internet on**, then the rest in **airplane mode**.

### First use and permission

- [ ] Tap **Scan** (middle of the bottom bar). The phone asks for **camera** permission. Tap **Allow**.
      The camera view appears with a white box and the text **"Point at a barcode"**.
- [ ] Turn on **airplane mode**, fully close the app, reopen it and tap **Scan**. The camera and scanning still work.
- [ ] *(Permission denied)* On another try, tap **Don't Allow**. A message **"Camera access is off"** explains how
      to turn it back on, with **Try again**. **Enter barcode manually** still works. Then turn the permission back on.

### Scanning

- [ ] Hold a product's barcode **inside the white box**, about 10–20 cm away. Within a second or two:
      a beep (and a vibration on Android), the box turns **yellow**, and the text says **"Paused"**.
- [ ] **Unknown barcode:** shows **"Not in your products yet"** with the digits. **Register new product** opens Add Product
      with the barcode **already filled in** and the name and prices **empty**.
- [ ] Save that product, go back to **Scan** and scan it again. Now it shows the **name, price and stock** with
      **View**, **Set stock** and **Scan next**.
- [ ] **Set stock** changes the stock, and the card updates.
- [ ] **No repeats:** while the card is showing, keep the barcode in view. Nothing else happens (no extra beeps).
- [ ] **Scan next**, then quickly point at a **different** product. It reads the new one.
- [ ] Scan a **deactivated** product. It says **"This product is deactivated"**, with **Reactivate**.
- [ ] A barcode starting with **0** keeps the 0 in the digits shown.
- [ ] Point at something **without** a barcode for about 8 seconds. A hint appears: *"Can't read it? Hold 10–20 cm away…"*.

### Flashlight

- [ ] *(Android)* A round **⚡ flashlight** button appears top-right. It turns the light on and off.
- [ ] *(iPhone)* The button usually **doesn't appear**, because iPhone doesn't let web apps control the flashlight.
      That's expected. Use room light, or the iPhone's own Control Center flashlight.

### Manual entry

- [ ] **Enter barcode manually** → type a barcode → **Look up**. It behaves like a scan.
- [ ] Try a barcode with a space, or leave it empty. You get a clear error message.

### Scan buttons elsewhere

- [ ] **Add/Edit Product** → the **scan button** next to Barcode opens the camera. Scanning fills the field
      and shows "Barcode … scanned".
- [ ] In that form, scan a barcode that **another product already has**. You're warned right away
      (red message + **Open "…"** button) before saving.
- [ ] **Products** → the **scan button** in the search box. Scanning puts the barcode in the search and shows that product.
- [ ] The **✕** at the top closes the camera without changing anything.

### Camera is released

- [ ] Leave the Scan tab (tap Home). The phone's "camera in use" indicator (green dot on iPhone) turns off.
- [ ] Switch to another app while scanning, then come back. The camera restarts.

### Automatic checks (on your PC)

Run `npm test`. The new scan-confirmation checks are in `src/lib/scanner/scan-confirmer.test.ts`.
