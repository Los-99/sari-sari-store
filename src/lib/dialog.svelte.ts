/**
 * Confirmation dialogs ("Deactivate this product?"). Any screen can call
 * `confirmDialog(...)` and wait for the answer: true = confirmed.
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Extra lines, e.g. a list of warnings. */
  details?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Show the confirm button in red, for actions that are hard to undo. */
  danger?: boolean;
}

interface OpenDialog extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

export const dialog = $state<{ current: OpenDialog | null }>({ current: null });

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // Only one dialog at a time: a new one answers "no" to the old one.
  dialog.current?.resolve(false);
  return new Promise((resolve) => {
    dialog.current = { ...options, resolve };
  });
}

export function answerDialog(confirmed: boolean) {
  const current = dialog.current;
  if (!current) return;
  dialog.current = null;
  current.resolve(confirmed);
}
