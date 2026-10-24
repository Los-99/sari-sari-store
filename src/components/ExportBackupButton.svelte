<script lang="ts">
  import Icon from './Icon.svelte';
  import { createBackupFile, downloadBackupFile, shareBackupFile } from '../lib/backup/backup.svelte';
  import { describeError } from '../lib/db/errors';
  import { showToast } from '../lib/toast.svelte';

  let {
    label = 'Back up now',
    primary = true,
    showDownload = false,
    withPhotos = true,
  }: {
    label?: string;
    primary?: boolean;
    /** Also offer "Save as a file" (browser download) as a second option. */
    showDownload?: boolean;
    /** false = "Back up without photos": a much smaller file. */
    withPhotos?: boolean;
  } = $props();

  let busy = $state(false);
  /** Ready file, when the phone needs one more tap before it allows sharing. */
  let pendingFile = $state<File | null>(null);

  async function run(action: 'share' | 'download', file?: File) {
    if (busy) return;
    busy = true;
    try {
      const backup = file ?? (await createBackupFile(withPhotos));
      if (action === 'download') {
        await downloadBackupFile(backup);
        showToast(`Backup saved as ${backup.name} (check Downloads / Files).`);
        pendingFile = null;
        return;
      }
      const outcome = await shareBackupFile(backup);
      pendingFile = outcome === 'needs-tap' ? backup : null;
      if (outcome === 'shared') showToast('Backup done. Keep that file safe.');
      if (outcome === 'downloaded') showToast(`Backup saved as ${backup.name} (check Downloads / Files).`);
    } catch (error) {
      showToast(`Backup failed: ${describeError(error)}`, 'error');
    } finally {
      busy = false;
    }
  }
</script>

<div class="export">
  {#if pendingFile}
    <button type="button" class="btn btn-primary btn-block" onclick={() => run('share', pendingFile ?? undefined)}>
      <Icon name="share" /> Tap again to save the backup
    </button>
  {:else}
    <button
      type="button"
      class="btn btn-block {primary ? 'btn-primary' : 'btn-secondary'}"
      disabled={busy}
      onclick={() => run('share')}
    >
      <Icon name="share" />
      {busy ? 'Preparing backup…' : label}
    </button>
  {/if}
  {#if showDownload}
    <button type="button" class="link-button" disabled={busy} onclick={() => run('download', pendingFile ?? undefined)}>
      Or save it with the browser's download instead
    </button>
  {/if}
</div>

<style>
  .export {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .link-button {
    min-height: var(--touch-target);
    border: 0;
    background: transparent;
    color: var(--color-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
