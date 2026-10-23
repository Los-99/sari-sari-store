/** Short messages at the bottom of the screen, e.g. "Product saved". */

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error';
}

export const toasts = $state<Toast[]>([]);

let nextId = 1;

export function showToast(message: string, kind: Toast['kind'] = 'success') {
  const toast = { id: nextId++, message, kind };
  // Keep at most two on screen so they never cover the page.
  if (toasts.length >= 2) toasts.shift();
  toasts.push(toast);
  setTimeout(() => dismissToast(toast.id), kind === 'error' ? 6000 : 3000);
}

export function dismissToast(id: number) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}
