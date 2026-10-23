<script lang="ts">
  import Icon from './Icon.svelte';
  import ExportBackupButton from './ExportBackupButton.svelte';
  import { backupStatus, daysSinceBackup } from '../lib/backup/backup.svelte';

  // Gentle reminder on Home. It becomes a warning after a week without a backup.
  let { hasProducts }: { hasProducts: boolean } = $props();

  const REMIND_AFTER_DAYS = 7;

  const days = $derived(
    backupStatus.lastBackupAt === undefined ? undefined : daysSinceBackup(backupStatus.lastBackupAt),
  );
  const overdue = $derived(days === null || (days !== undefined && days >= REMIND_AFTER_DAYS));
  const lastText = $derived(
    days === null || days === undefined
      ? ''
      : days === 0
        ? 'today'
        : days === 1
          ? 'yesterday'
          : `${days} days ago`,
  );
</script>

{#if hasProducts && days !== undefined}
  {#if overdue}
    <section class="card warning" aria-label="Backup reminder">
      <h2><Icon name="shield" size={20} /> {days === null ? "You haven't backed up yet" : `Last backup: ${lastText}`}</h2>
      <p>
        If this phone is lost or the app is removed, your products are gone. A backup file keeps them safe.
      </p>
      <ExportBackupButton />
    </section>
  {:else}
    <p class="ok">
      <Icon name="shield" size={18} /> Last backup: {lastText}
    </p>
  {/if}
{/if}

<style>
  .warning {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border-color: var(--color-low-text);
    background: var(--color-low-bg);
  }

  .warning h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-md);
    color: var(--color-low-text);
  }

  .warning p {
    margin: 0 0 var(--space-1);
  }

  .ok {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin: 0;
    color: var(--color-ok-text);
    font-size: var(--text-sm);
    font-weight: 600;
  }
</style>
