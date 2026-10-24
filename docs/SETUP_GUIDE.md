# Sari-Sari Store: Setup and Handover Guide

This guide explains everything needed to **use**, **update** and **look after** the Sari-Sari Store app
(Version 1.1.0, with product photos). It's written for beginners. Technical words are explained the first time they appear.

> **Most important point first:** using the app every day needs **no account, no internet and no
> installation from an app store**. You open a web link once, add it to your phone's Home Screen,
> and from then on it works in airplane mode. Accounts and PC software are needed only to **change
> and publish** the app.

---

## How the app works, in one picture

```
 Your PC (only for changing the app)          GitHub (free hosting)             Your phones
 ─────────────────────────────────            ────────────────────────          ─────────────────────────
 Code in C:\wamp64\www\SariSari_Store  ──push──▶  github.com/Los-99/        ──▶  Opened ONCE with internet:
 Tools: Node.js, Git, VS Code                     sari-sari-store                https://los-99.github.io/
                                                  builds & publishes it          sari-sari-store/
                                                  automatically                  → Add to Home Screen
                                                                                 → works offline after that
 Product data is NEVER uploaded. It lives only on each phone, plus the backup files you make.
```

- **PWA (Progressive Web App):** a website that installs like an app. It has its own icon, opens
  full-screen and works offline.
- **App address (URL):** `https://los-99.github.io/sari-sari-store/`

---

## A. Software

### A1. Needed on the phone (for everyday use)

| Software | Why | Required? | Notes |
|---|---|---|---|
| **Safari** (iPhone) | Installs the app to the Home Screen and runs it | **Required on iPhone** | Comes with the iPhone. Needs **iOS 16.4 or newer** (Settings → General → About → iOS Version). |
| **Google Chrome** (Android) | Installs and runs the app | **Required on Android** | Usually pre-installed. Needs **Chrome 111 or newer**: keep it updated from the Play Store. Android 8.0 or newer. |
| **Files** app (iPhone) / **Files** or **Google Drive** (Android) | A place to keep backup files | **Required** (for backups) | Comes with the phone. |

Nothing else is installed on the phone. There's **no APK and no App Store download**.

### A2. Needed on the PC (only to change or republish the app)

All of these are free. **They're already installed on this PC.** Reinstall them only on a new or reset computer.

| Software | Why it's needed | Required? | Official download | Version |
|---|---|---|---|---|
| **Node.js** (includes **npm**) | Runs the build tools. npm downloads the libraries the app uses. | **Required** to change the app | https://nodejs.org/en/download | **LTS** ("Long Term Support"), version 24.x. The current LTS is 24.22.1; this PC has 24.19. |
| **Git for Windows** | Saves versions of the code and uploads them to GitHub. Also provides "Git Bash". | **Required** to publish changes | https://git-scm.com/downloads/win | Latest |
| **GitHub CLI** (`gh`) | Signs this PC in to GitHub, checks publishing progress | **Optional** but recommended | https://cli.github.com/ | Latest |
| **Visual Studio Code** | Editor for viewing and changing the code, with a built-in terminal | **Optional** (any editor works) but recommended | https://code.visualstudio.com/download | Latest |
| **Google Chrome or Microsoft Edge** (PC) | Previewing the app on the PC before publishing | **Optional** | Already on Windows / https://www.google.com/chrome/ | Latest |

**Not needed (don't install these for this project):**

| Software | Why it's not needed |
|---|---|
| Android Studio, Java, the Android SDK | The app isn't a native Android app. No APK is built. |
| Xcode or a Mac | Not needed for a PWA. |
| WampServer | Not used by this project. It's safe to keep for your other projects. |
| Any emulator | Your real phones are used for testing. |

### A3. Installing the PC software (only on a new computer)

1. **Node.js:** open https://nodejs.org/en/download, choose **LTS**, **Windows**, **Windows Installer (.msi)**.
   Run it and keep the default options. To check it worked, open a new terminal and type `node --version`.
   It should show `v24.…`.
2. **Git:** open https://git-scm.com/downloads/win, download the **64-bit Git for Windows Setup** and run it
   with the default options. Check with `git --version`.
3. **GitHub CLI (optional):** open https://cli.github.com/, download the Windows installer and run it. Check with `gh --version`.
4. **VS Code (optional):** open https://code.visualstudio.com/download, choose **Windows**, and run the installer.
   Tick **"Add to PATH"** when asked.

**After installing**, tell Git who you are. Do this once per computer, in a terminal:

```
git config --global user.name "Los-99"
```

This project already uses GitHub's private "no-reply" email for its saved versions, so your personal email
isn't shown publicly.

---

## B. Accounts

| Account | Why | Required? | Cost | Official link |
|---|---|---|---|---|
| **GitHub** (you have one: **Los-99**) | Stores the code and hosts the app at `los-99.github.io` | **Required only to publish or update the app.** Not needed to use it. | **Free.** GitHub Pages is available for **public** repositories on **GitHub Free**. | https://github.com/signup |
| Apple ID / Google account | Normal phone use | Not needed by this app | n/a | n/a |
| Google Play developer account / Apple Developer Program | Publishing to app stores | **Not needed.** The app isn't published to any store. | Would cost money, so avoid | n/a |
| Cloud database, Firebase, paid APIs | n/a | **Not needed.** All data stays on the phone. | n/a | n/a |

**What's free on GitHub, and the limits** (from GitHub's documentation):
- GitHub Pages is available in **public repositories with GitHub Free**. Your code repository must stay **public**.
  It only contains the app's code; **product data is never in it**.
- Limits: published site up to **1 GB** (this app is about 1.2 MB), soft bandwidth limit of **100 GB per month**.
- GitHub says Pages must not be used "as a free web-hosting service to run your online business", such as an
  online shop or a site for **commercial transactions**. This app sells nothing online, takes no payments and
  stores no customer data; it's an offline tool. If you ever add **online** selling or payments, move to a different host first.
- Sources: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits),
  [Quickstart for GitHub Pages](https://docs.github.com/en/pages/quickstart),
  [GitHub's plans](https://docs.github.com/get-started/learning-about-github/githubs-products).

**After registering** (already done for Los-99):
1. Keep your GitHub password safe, and turn on **two-factor authentication** in GitHub → Settings → Password and authentication.
2. Sign this PC in once: `gh auth login --hostname github.com --git-protocol https --web`. This is already done on this PC.

> 🔒 **Security note:** any other website you publish on GitHub Pages under the same account (`los-99.github.io/…`)
> shares browser storage with this app on your phones. **Only publish your own trusted pages** under this account.

---

## C. Preparing the PC and the phones

### C1. Open the project on the PC

1. Open **VS Code** → **File → Open Folder…** → choose `C:\wamp64\www\SariSari_Store`.
2. Open a terminal: **Terminal → New Terminal**.
3. **First time on a new computer only**, download the project's libraries:
   ```
   npm ci
   ```
   `npm ci` installs the exact library versions listed in `package-lock.json`. It needs internet, once.
   **No Android SDK or build tools are needed**: Vite (the build tool) comes in through npm.

### C2. Useful commands (run them in the project folder)

| Command | What it does |
|---|---|
| `npm run dev` | Live preview at http://localhost:5173. It refreshes as you change code. `Ctrl+C` stops it. |
| `npm run check` | Checks the code for mistakes |
| `npm test` | Runs the 113 automatic checks. They should all pass. |
| `npm run build` | Builds the finished app into the `dist` folder |
| `npm run preview` | Serves the built app at http://localhost:4173, including offline mode |

Your PC's webcam can test scanning in the preview. Use **Chrome or Edge**, and allow the camera when asked.

### C3. Preparing the phones

There's **no USB cable, USB debugging or developer mode** needed. The phone simply opens a web link.

**iPhone** (iOS 16.4 or newer):
1. Make sure the phone has internet for this first step.
2. Open **Safari**. It must be Safari for installing. Go to **https://los-99.github.io/sari-sari-store/**
3. Tap the **Share** button (the square with an arrow). Depending on your Safari layout, it may be under the
   **⋯ / Page Menu** button first.
4. Choose **Add to Home Screen**. On newer iOS versions, make sure **Open as Web App** is **on**. Then tap **Add**.
   If you don't see *Add to Home Screen*, scroll to the bottom of the list, tap **Edit Actions** and add it.
   ([Apple's guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios))
5. Close Safari. **From now on, always open the app from its green store icon.** A Safari tab and the Home Screen
   app keep **separate** product data.

**Android** (Chrome):
1. With internet on, open **Chrome** and go to **https://los-99.github.io/sari-sari-store/**
2. Tap **⋮ (More)** → **Install and create shortcut** (on some versions: **Add to Home screen** or **Install app**) → **Install**.
   ([Google's guide](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid))
3. Open the app from its icon.

**Check the setup:** in the app, open **Settings → App status**. You should see:
- Opened from Home Screen: **Yes**
- Works offline: **Yes**. If it says "Not yet", close the app fully and open it again once.
- Database: **Ready**
- App version: **1.1.0** (or newer)

### C4. Allowing the camera

The first time you tap **Scan**, the phone asks for camera access. Tap **Allow**.

**If you tapped "Don't Allow" by mistake:**
- **iPhone:** Settings → **Apps → Safari → Camera** → **Ask** or **Allow**. You can also change it for one site from
  Safari's **Page Menu → Website Settings**. Then close and reopen the app.
  ([Apple: Safari settings](https://support.apple.com/guide/iphone/customize-your-safari-settings-iphb3100d149/ios))
  iPhone may ask again each time the app is reopened. That's normal.
- **Android:** Chrome → **⋮ → Settings → Site settings → Camera**. Under *Blocked*, tap `los-99.github.io` → **Allow**.
  ([Google: camera permissions](https://support.google.com/chrome/answer/2693767?co=GENIE.Platform%3DAndroid))

### C5. Confirming the scanner works offline

1. Turn on **airplane mode**.
2. Fully close the app (swipe it away), then open it from the icon.
3. Tap **Scan** and point at a product barcode, 10–20 cm away, inside the white box. It should beep and show the product
   (or offer to register it).

The scanning engine is **packed inside the app** and saved on the phone with the rest of it.
**Nothing needs to be downloaded later.**

---

## D. "Building the APK": what applies to this app

Your original brief asked about debug and release APKs. Because the app became a **PWA** (so it also works on iPhone),
**there is no APK**. Here's what replaces each part:

| Original question | For this app |
|---|---|
| Debug vs release APK | **`npm run dev`** is the "debug" version: a live preview on your PC only. **`npm run build`** makes the "release" version, the optimised files in `dist/`. GitHub builds the release version for you automatically. |
| Which to use for testing | Test on the PC with `npm run dev`, then publish and test on your phone from the real address. |
| Where the generated file is | `dist/` on your PC (not needed for normal use), or **https://los-99.github.io/sari-sari-store/** |
| Transferring it to the phone | Not needed. The phone opens the web link. |
| Installing safely | Only install from **https://los-99.github.io/sari-sari-store/**, which uses a secure https address. Never install a copy from another address. |
| Signing keys | **Not needed.** PWAs aren't signed. Instead, protect your **GitHub account** (password and two-factor authentication), because whoever controls it controls the app. |

### D1. Publishing an update (on the PC)

1. Make and test your change: `npm run dev`, then `npm run check` and `npm test`.
2. Raise the version number in `package.json` (e.g. `"version": "1.0.1"`), so you can see the update arrive on the phone.
3. Save a version and upload it:
   ```
   git add -A
   git commit -m "Describe the change"
   git push
   ```
4. GitHub builds and publishes it in about 1–2 minutes. You can watch progress with `gh run watch`, or on
   github.com/Los-99/sari-sari-store → **Actions** tab. A **green ✓** means it's live; a **red ✗** means nothing was published.

### D2. Getting the update on the phone, without losing data

1. With internet on, open the app. Within a few seconds a bar appears: **"A new version of the app is ready" → Update**.
2. Tap **Update**. The app reloads. **Your products are not touched by updates.**
3. Check **Settings → App version**.

If no bar appears: fully close the app and reopen it (iPhone checks for updates when the app starts).

**To undo a bad update:** on the PC, run `git revert HEAD` and then `git push`. The previous version is republished.

> ⚠️ **Never change the app's address**, which means the GitHub **username** (`Los-99`).
> The phone keeps data **per website address**. Under a different address, the app starts empty. If it ever
> must change, make a backup first and restore it at the new address.
> (Renaming only the repository keeps the data, but you'd need to add the new link to the Home Screen again.)

---

## E. Offline setup and verification

**What must be downloaded before going offline:** only the app itself, on **first open with internet**.
That includes the scanning engine (about 1 MB). There are no maps, models or databases to download later.

**Offline checklist** (with **airplane mode on**, app opened from its icon):

| | Check |
|---|---|
| ☐ | The app opens, and Home shows your counts |
| ☐ | **Add** a product **with a photo**, **view** it, **edit** its price, **deactivate** and reactivate it |
| ☐ | **Search** by name and barcode; **filter** by category and Low / Out of stock; **sort** |
| ☐ | **Scan** a product barcode with the camera |
| ☐ | Fully close the app, reopen it: everything is still there. Restart the phone: still there. |
| ☐ | **Back up now** → Save to Files (iPhone) or Downloads (Android) |
| ☐ | **Restore** from that file, then **Undo last restore** |

Only these things need internet: **first install**, **receiving updates**, and **sending a backup file** to
Google Drive, email or Messenger.

---

## F. Backups and data safety

> ⚠️ **Your products are stored only inside the app on each phone.**
> **Removing the app from the Home Screen, clearing the browser's website data, resetting the phone, or losing the
> phone can delete ALL products.** A backup file is the only way to get them back.

### F1. Making a backup

1. **Settings → Back up now** (or tap the reminder on Home).
2. **iPhone:** the Share sheet opens → **Save to Files** → choose a folder (e.g. *On My iPhone* or *iCloud Drive*) → **Save**.
   **Android:** choose Google Drive, Files or Messenger, or tap **Or save it with the browser's download instead** to save it to **Downloads**.
3. The file is named like `sarisari-backup-2026-10-24-1430.json` (date and time).
4. **Photos are included**, so the file can be large: roughly 0.1–0.2 MB per photographed product,
   e.g. about 50–100 MB for 500 products with photos. For a quick, small file with products only, use
   **Settings → Back up without photos** (its name ends in `-no-photos`). Restoring that file removes photos from the phone.

### F2. Where to keep backups

- Keep **two copies in different places**, e.g. the Files app **and** Google Drive, email it to yourself, or keep it on your PC.
- **Not** only on the same phone: if the phone is lost, that copy is lost too.
- Back up **at least weekly** and after adding many products. Home turns orange after 7 days without a backup.
- **Large backups (with many photos):** Google Drive, the Files app or a USB cable handle big files best.
  Some messaging apps refuse large files.

### F3. Moving to another phone, or reinstalling

1. Old phone: **Back up now**.
2. Send the file to the new phone (AirDrop, Nearby/Quick Share, Messenger, email, Google Drive or a USB cable).
3. New phone: install the app (section C3) and open it from the icon.
4. **Settings → Restore from a backup file** → pick the file → check the preview → **Replace my products** → **Replace**.

### F4. Before uninstalling, resetting or changing anything risky

1. **Back up now**, and check that the file opens in the Files app (or exists in Drive).
2. Only then remove the app or reset the phone.
3. Afterwards, reinstall the app and restore (F3).

**Updating** the app (section D2) does **not** need a restore. Updates never delete products.

### F5. If a backup won't restore

- The app checks the whole file first, and **nothing changes unless everything is valid**. You'll see a message saying what's wrong.
- *"isn't a readable backup / damaged"*: the file was cut off while copying. Use the original file or another copy.
- *"made by a newer version of the app"*: open the app with internet, tap **Update**, then try again.
- *"isn't a Sari-Sari Store backup"*: you picked the wrong file. Pick the `sarisari-backup-…json` file.
- Restored by mistake? **Settings → Undo last restore** puts back what was there before the most recent restore.

The file format is documented in [BACKUP_FORMAT.md](BACKUP_FORMAT.md).

---

## G. Final setup checklist

| # | Item | Status |
|---|---|---|
| **1. Software to install** | | |
| | Safari (iPhone) / Chrome (Android) on the phone | **Required** (already on phones) |
| | Node.js LTS on the PC | **Required to change the app** (installed) |
| | Git for Windows on the PC | **Required to change the app** (installed) |
| | GitHub CLI on the PC | Optional (installed) |
| | VS Code on the PC | Optional (installed) |
| | Android Studio, Java, Android SDK, Xcode, emulator | **Not Needed** |
| | WampServer | **Not Needed** for this project |
| **2. Accounts** | | |
| | GitHub (free) | **Required to publish/update** (done: Los-99) |
| | Two-factor authentication on GitHub | Optional, strongly recommended |
| | Google Play / Apple Developer accounts | **Not Needed** |
| | Any cloud database or paid service | **Not Needed** |
| **3. Files to download** | | |
| | Project libraries (`npm ci`) | **Required** on a new PC only (done here) |
| | The app on each phone (open the link once) | **Required** |
| | Scanning model / engine | **Not Needed** separately (included in the app) |
| | APK file | **Not Needed** |
| **4. PC configuration** | | |
| | `git config --global user.name` | **Required** on a new PC (done) |
| | `gh auth login` | **Required** to publish from a new PC (done here) |
| **5. Phone configuration** | | |
| | Add to Home Screen (Open as Web App on iPhone) | **Required** |
| | Allow camera | **Required** for scanning |
| | USB debugging / developer mode | **Not Needed** |
| **6. Generating and installing the app** | | |
| | Publishing via `git push` (GitHub builds it) | **Required** only when changing the app |
| | Building an APK / signing keys | **Not Needed** |
| **7. Offline verification** | | |
| | Run the checklist in section E in airplane mode | **Required** once per phone |
| **8. Backup and recovery** | | |
| | First backup saved in two places | **Required** |
| | Weekly backups | **Required** (habit) |
| | Practice restore once (then Undo) | Optional, recommended |

---

## H. Troubleshooting

| Problem | What to do |
|---|---|
| **Node/npm "not recognized"** after installing | Close **all** terminals and VS Code, then open them again (they read the new settings on start). If it still fails, restart the PC. |
| **`npm ci` fails** (network or permission errors) | Check internet. Close VS Code and anything running `npm run dev`, then run it again. If the error mentions `node_modules`, delete that folder and run `npm ci` again. |
| **`npm run check` or `npm test` shows errors** after a change | Read the first error; it names the file and line. Undo your change if unsure (`git checkout -- <file>`). **Don't publish** until both are clean. |
| **Publishing failed** (red ✗ in the GitHub Actions tab) | Nothing was published, so phones keep the last good version. Open the failed run to see the error, fix it, and `git push` again. |
| **`git push` asks for a password or is refused** | Run `gh auth login --hostname github.com --git-protocol https --web` again and sign in as Los-99. |
| **Android Studio installation errors / missing Android SDK / USB debugging problems** | **Not relevant:** this app doesn't use Android Studio, the SDK or USB debugging. |
| **The app opens in a browser tab instead of full-screen** | It was opened from Safari/Chrome, not the icon. Use the Home Screen icon. On iPhone, re-add it with **Open as Web App** on. |
| **"Add to Home Screen" is missing** (iPhone) | Use **Safari** (not another browser). In the Share list, scroll down → **Edit Actions** → add it. |
| **The app won't open offline / "Works offline: Not yet"** | Open it once with internet, close it fully, open it again. Check Settings shows **Works offline: Yes** before relying on airplane mode. |
| **"Camera access is off"** | See section C4. iPhone: Settings → Apps → Safari → Camera. Android: Chrome → Settings → Site settings → Camera. |
| **"Camera is busy"** | Close other apps using the camera (video calls, camera app), then tap **Try again**. |
| **Barcode won't scan** | Fit the barcode **inside the white box**, hold steady 10–20 cm away, avoid glare. Use the ⚡ flashlight (Android) or more light. Smooth out crumpled packs. Use **Enter barcode manually** as a last resort. |
| **Scanned number differs from a printed one by a leading 0** | Some codes (UPC-A vs EAN-13) are written with or without a leading 0. The app shows the exact digits it read; keep using the scanner for that product so it always matches. |
| **No flashlight button on iPhone** | Expected. iPhone doesn't let web apps control the flashlight. Use Control Center's flashlight. |
| **Update doesn't arrive** | Internet on → open the app → wait 10 seconds → **Update**. If nothing appears, close fully and reopen. Check GitHub Actions shows a green ✓. |
| **Updates "failing because of signing differences"** | Not possible with this app: there are no APKs or signing keys. |
| **Products disappeared after reinstalling** | Removing the Home Screen app (or clearing website data) deleted the phone's data. Restore your latest backup (F3). Also check you're using the icon, not a Safari tab (iPhone keeps those separate). |
| **Products missing on a new phone** | Data doesn't move by itself. Back up the old phone and restore on the new one (F3). |
| **Backup won't restore** | See section F5. The message explains why. Nothing is changed when a file is refused. |
| **"Protected from automatic clearing: No"** | The phone may clear website data when storage is very low. Keep free storage and **back up weekly**. |
| **"The phone's storage is full"** when saving | Free some space (photos, videos, unused apps), then try again. Product photos take space too: each is about 0.1 MB. |
| **"This picture couldn't be opened"** when adding a photo | Some formats (e.g. HEIC pictures copied from an iPhone to an Android phone) can't be read. Use **Take photo**, or choose a JPEG/PNG picture. |
| **Backup file is too big to send** | Send it via Google Drive or a USB cable, or use **Back up without photos** (small, but restoring it removes photos). |
| **"Take photo" opens the gallery instead of the camera** (some phones) | Normal on some phones. Pick the camera option in the menu that appears. |

---

## Where things are

| What | Where |
|---|---|
| The app | https://los-99.github.io/sari-sari-store/ |
| The code | https://github.com/Los-99/sari-sari-store (on your PC: `C:\wamp64\www\SariSari_Store`) |
| Manual tests for each feature | [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) |
| How data is stored | [DATA_MODEL.md](DATA_MODEL.md) |
| Backup file format | [BACKUP_FORMAT.md](BACKUP_FORMAT.md) |
| Commands and folders | [README.md](../README.md) |
