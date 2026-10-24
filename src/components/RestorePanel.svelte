<script lang="ts">
  import Icon from './Icon.svelte';
  import ExportBackupButton from './ExportBackupButton.svelte';
  import { backupStatus, readBackupFile, restoreBackup, undoRestore } from '../lib/backup/backup.svelte';
  import type { CheckedBackup } from '../lib/backup/format';
  import { listPhotoThumbs, listProducts } from '../lib/db/products';
  import { describeError } from '../lib/db/errors';
  import { confirmDialog } from '../lib/dialog.svelte';
  import { showToast } from '../lib/toast.svelte';
  import { formatDateTime } from '../lib/util/format';

  /**
   * Restore, step by step:
   * 1. choose a file → 2. the whole file is checked → 3. preview of what will
   * change → 4. two confirmations → 5. replace everything in one go, keeping a
   * safety copy of the current products for "Undo last restore".
   */

  type Step =
    | { kind: 'idle' }
    | { kind: 'checking'; fileName: string }
    | { kind: 'problem'; fileName: string; error: string; details: string[] }
    | {
        kind: 'preview';
        fileName: string;
        backup: CheckedBackup;
        currentCount: number;
        currentPhotoCount: number;
        /** True when the phone has changes newer than the backup. */
        backupIsOlder: boolean;
      }
    | { kind: 'restoring' };

  // $state.raw: the backup's products must stay plain objects. Svelte's
  // watched copies can't be saved into the database.
  let step = $state.raw<Step>({ kind: 'idle' });
  let picker: HTMLInputElement | undefined = $state();

  async function fileChosen(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // Allows choosing the same file again later.
    if (!file) return;

    step = { kind: 'checking', fileName: file.name };
    const result = await readBackupFile(file);
    if (!result.ok) {
      step = { kind: 'problem', fileName: file.name, error: result.error, details: result.details ?? [] };
      return;
    }
    try {
      const current = await listProducts();
      const currentPhotoCount = (await listPhotoThumbs()).size;
      const newestChange = Math.max(0, ...current.map((product) => product.updatedAt));
      step = {
        kind: 'preview',
        fileName: file.name,
        backup: result.backup,
        currentCount: current.length,
        currentPhotoCount,
        backupIsOlder: newestChange > result.backup.exportedAt.getTime(),
      };
    } catch (error) {
      step = { kind: 'problem', fileName: file.name, error: describeError(error), details: [] };
    }
  }

  async function restore() {
    if (step.kind !== 'preview') return;
    const { backup, currentCount } = step;
    const confirmed = await confirmDialog({
      title: 'Replace your products?',
      message: `Your ${currentCount} current ${currentCount === 1 ? 'product' : 'products'} will be replaced by the ${backup.products.length} in the backup.`,
      details: ['A safety copy of your current products is kept, so you can undo this right after.'],
      confirmLabel: 'Replace',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;

    step = { kind: 'restoring' };
    try {
      await restoreBackup(backup);
      showToast(`Restored ${backup.products.length} ${backup.products.length === 1 ? 'product' : 'products'}.`);
      step = { kind: 'idle' };
    } catch (error) {
      showToast(`Nothing was changed: ${describeError(error)}`, 'error');
      step = { kind: 'idle' };
    }
  }

  async function undo() {
    if (backupStatus.undoAvailableSince === null) return;
    const confirmed = await confirmDialog({
      title: 'Undo the last restore?',
      message: `Your products go back to how they were before ${formatDateTime(backupStatus.undoAvailableSince)}.`,
      details: ['Any changes made since that restore will be lost.'],
      confirmLabel: 'Undo restore',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const count = await undoRestore();
      showToast(`Restore undone. ${count} ${count === 1 ? 'product' : 'products'} are back.`);
    } catch (error) {
      showToast(describeError(error), 'error');
    }
  }

  const activeCount = $derived(step.kind === 'preview' ? step.backup.products.filter((p) => p.isActive).length : 0);
</script>

<input
  bind:this={picker}
  type="file"
  accept=".json,application/json,text/plain"
  class="visually-hidden"
  tabindex="-1"
  aria-hidden="true"
  onchange={fileChosen}
/>

{#if step.kind === 'idle'}
  <button type="button" class="btn btn-secondary btn-block" onclick={() => picker?.click()}>
    <Icon name="restore" /> Restore from a backup file
  </button>
{:else if step.kind === 'checking'}
  <p class="card muted" aria-busy="true">Checking {step.fileName}…</p>
{:else if step.kind === 'restoring'}
  <p class="card muted" aria-busy="true">Restoring… don't close the app.</p>
{:else if step.kind === 'problem'}
  <div class="card problem" role="alert">
    <strong>Can't restore this file</strong>
    <p class="file">{step.fileName}</p>
    <p>{step.error}</p>
    {#if step.details.length}
      <ul>
        {#each step.details as detail (detail)}<li>{detail}</li>{/each}
      </ul>
    {/if}
    <p class="safe">Your current products were not changed.</p>
    <div class="buttons">
      <button type="button" class="btn btn-secondary" onclick={() => (step = { kind: 'idle' })}>Close</button>
      <button type="button" class="btn btn-primary" onclick={() => picker?.click()}>Choose another file</button>
    </div>
  </div>
{:else if step.kind === 'preview'}
  <div class="card preview">
    <strong>Backup checked: everything looks fine</strong>
    <p class="file">{step.fileName}</p>
    <dl>
      <div><dt>Made on</dt><dd>{formatDateTime(step.backup.exportedAt.getTime())}</dd></div>
      <div>
        <dt>Products in backup</dt>
        <dd>{step.backup.products.length} ({activeCount} active)</dd>
      </div>
      <div>
        <dt>Photos in backup</dt>
        <dd>{step.backup.includesPhotos ? step.backup.photos.length : 'Not included'}</dd>
      </div>
      <div>
        <dt>On this phone now</dt>
        <dd>{step.currentCount} products, {step.currentPhotoCount} photos</dd>
      </div>
    </dl>

    <p class="warning">
      <Icon name="alert" size={18} />
      <span>
        Restoring <strong>replaces all {step.currentCount} products</strong> on this phone with the ones in this backup.
      </span>
    </p>
    {#if step.backupIsOlder}
      <p class="warning">
        <Icon name="alert" size={18} />
        <span>
          This backup is <strong>older</strong> than your latest changes. Changes made after
          {formatDateTime(step.backup.exportedAt.getTime())} will be lost.
        </span>
      </p>
    {/if}
    {#if !step.backup.includesPhotos && step.currentPhotoCount > 0}
      <p class="warning">
        <Icon name="alert" size={18} />
        <span>
          This backup has <strong>no photos</strong>. The {step.currentPhotoCount}
          {step.currentPhotoCount === 1 ? 'photo' : 'photos'} on this phone will be removed.
        </span>
      </p>
    {/if}
    {#if step.backup.products.length === 0}
      <p class="warning">
        <Icon name="alert" size={18} />
        <span>This backup has <strong>no products</strong>.</span>
      </p>
    {/if}

    {#if step.currentCount > 0}
      <p class="muted small">Not sure? Back up your current products first:</p>
      <ExportBackupButton label="Back up current products first" primary={false} />
    {/if}

    <div class="buttons">
      <button type="button" class="btn btn-secondary" onclick={() => (step = { kind: 'idle' })}>Cancel</button>
      <button type="button" class="btn btn-primary danger" onclick={restore}>Replace my products</button>
    </div>
  </div>
{/if}

{#if backupStatus.undoAvailableSince !== null && step.kind === 'idle'}
  <div class="undo">
    <p class="muted small">Last restore: {formatDateTime(backupStatus.undoAvailableSince)}</p>
    <button type="button" class="link-button" onclick={undo}>Undo last restore</button>
  </div>
{/if}

<style>
  .problem,
  .preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .problem {
    border-color: var(--color-out-text);
    background: var(--color-out-bg);
  }

  .problem strong {
    color: var(--color-out-text);
  }

  p,
  ul,
  dl {
    margin: 0;
  }

  ul {
    padding-left: var(--space-5);
    font-size: var(--text-sm);
  }

  .file {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    overflow-wrap: anywhere;
  }

  .safe {
    color: var(--color-ok-text);
    font-weight: 600;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-1) 0;
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-weight: 700;
    text-align: right;
  }

  .warning {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-low-bg);
    color: var(--color-low-text);
  }

  .warning :global(svg) {
    flex: none;
    margin-top: 2px;
  }

  .small {
    font-size: var(--text-sm);
  }

  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .danger {
    background: var(--color-danger);
  }

  .undo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .link-button {
    min-height: var(--touch-target);
    border: 0;
    background: transparent;
    color: var(--color-danger);
    font-weight: 700;
    cursor: pointer;
  }
</style>
