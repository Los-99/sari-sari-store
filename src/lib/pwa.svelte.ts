import { registerSW } from 'virtual:pwa-register';

/**
 * Status of the offline helper (service worker).
 * - offlineReady: all app files are saved on the phone; the app works without internet.
 * - updateAvailable: a newer version was downloaded and is waiting for the user to accept it.
 */
export const pwa = $state({ offlineReady: false, updateAvailable: false });

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function startServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  updateServiceWorker = registerSW({
    onOfflineReady() {
      pwa.offlineReady = true;
    },
    onNeedRefresh() {
      pwa.updateAvailable = true;
    },
    onRegisterError(error) {
      console.error('Could not set up offline support.', error);
    },
  });
}

/** Switch to the downloaded new version. The page reloads; saved products are not affected. */
export function applyUpdate() {
  void updateServiceWorker?.(true);
}

export function dismissOfflineReady() {
  pwa.offlineReady = false;
}

export function dismissUpdate() {
  pwa.updateAvailable = false;
}
