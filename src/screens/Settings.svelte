<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ExportBackupButton from '../components/ExportBackupButton.svelte';
  import RestorePanel from '../components/RestorePanel.svelte';
  import { pwa } from '../lib/pwa.svelte';
  import { storage } from '../lib/db/storage.svelte';
  import { backupStatus } from '../lib/backup/backup.svelte';
  import { formatDateTime } from '../lib/util/format';

  const version = __APP_VERSION__;

  const databaseLabel = $derived(
    storage.status === 'ready' ? 'Ready' : storage.status === 'error' ? 'Error' : 'Opening…',
  );
  const protectedLabel = $derived(
    storage.persisted === true ? 'Yes' : storage.persisted === false ? 'No' : 'Not available',
  );

  // True when the app was opened from its Home Screen icon (not a browser tab).
  const openedFromHomeScreen =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  // True once the offline copy of the app is active on this phone.
  let offlineCopyActive = $state(Boolean(navigator.serviceWorker?.controller));

  $effect(() => {
    if (pwa.offlineReady) offlineCopyActive = true;
    const container = navigator.serviceWorker;
    if (!container) return;
    const update = () => (offlineCopyActive = Boolean(container.controller));
    container.addEventListener('controllerchange', update);
    return () => container.removeEventListener('controllerchange', update);
  });
</script>

<TopBar title="Settings" />

<div class="content">
  <h2 class="section-title">Backup &amp; restore</h2>
  <section class="card backup">
    <p class="last-backup">
      Last backup:
      <strong class:never={backupStatus.lastBackupAt === null}>
        {backupStatus.lastBackupAt === undefined
          ? '…'
          : backupStatus.lastBackupAt === null
            ? 'Never on this phone'
            : formatDateTime(backupStatus.lastBackupAt)}
      </strong>
    </p>
    <p class="muted small">
      A backup is one file with all your products. Keep it somewhere other than this app: the Files app,
      Google Drive, or send it to another phone.
    </p>
    <ExportBackupButton label="Back up now" showDownload />
    <p class="muted small">
      Backups include product photos, so they can be large. For a quick, small file (products only):
    </p>
    <ExportBackupButton label="Back up without photos" primary={false} withPhotos={false} />
    <hr />
    <RestorePanel />
  </section>

  <details class="card guide">
    <summary>How to move your products to a new phone</summary>
    <ol>
      <li>On the <strong>old phone</strong>: Settings → <strong>Back up now</strong>.</li>
      <li>
        Send the backup file to the new phone: AirDrop, Nearby/Quick Share, Messenger, email, Google Drive or a
        USB cable.
      </li>
      <li>
        On the <strong>new phone</strong>: open the app link, add it to the Home Screen, and open it from the icon.
      </li>
      <li>Settings → <strong>Restore from a backup file</strong> → choose the file → <strong>Replace my products</strong>.</li>
    </ol>
  </details>

  <details class="card guide">
    <summary>Keeping your products safe</summary>
    <ul>
      <li>Back up <strong>at least once a week</strong>, and after adding many products.</li>
      <li>Keep the backup file <strong>outside this app</strong>, ideally in two places.</li>
      <li>
        <strong>Back up before</strong> removing the app from the Home Screen, clearing browser data, or resetting the
        phone. Those can delete all products.
      </li>
      <li>Updating the app does <strong>not</strong> delete your products.</li>
    </ul>
  </details>

  <h2 class="section-title">App status</h2>
  <dl class="card status">
    <div>
      <dt>Opened from Home Screen</dt>
      <dd class:yes={openedFromHomeScreen}>{openedFromHomeScreen ? 'Yes' : 'No'}</dd>
    </div>
    <div>
      <dt>Works offline</dt>
      <dd class:yes={offlineCopyActive}>{offlineCopyActive ? 'Yes' : 'Not yet'}</dd>
    </div>
    <div>
      <dt>Database</dt>
      <dd class:yes={storage.status === 'ready'} class:bad={storage.status === 'error'}>{databaseLabel}</dd>
    </div>
    <div>
      <dt>Protected from automatic clearing</dt>
      <dd class:yes={storage.persisted === true}>{protectedLabel}</dd>
    </div>
    <div>
      <dt>App version</dt>
      <dd>{version}</dd>
    </div>
  </dl>
  {#if storage.status === 'error'}
    <p class="error-text" role="alert">{storage.errorMessage}</p>
  {/if}
  {#if !openedFromHomeScreen}
    <p class="muted hint">
      Tip: add this app to your Home Screen and always open it from there. On iPhone, a Safari tab and the
      Home Screen app keep separate product data.
    </p>
  {/if}
</div>

<style>
  .backup {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .backup p {
    margin: 0;
  }

  .last-backup strong.never {
    color: var(--color-low-text);
  }

  .small {
    font-size: var(--text-sm);
  }

  hr {
    width: 100%;
    margin: var(--space-1) 0;
    border: 0;
    border-top: 1px solid var(--color-border);
  }

  .guide summary {
    min-height: 32px;
    font-weight: 700;
    cursor: pointer;
  }

  .guide ol,
  .guide ul {
    margin: var(--space-3) 0 0;
    padding-left: var(--space-5);
  }

  .guide li + li {
    margin-top: var(--space-2);
  }

  .status {
    margin: 0;
    padding: 0;
  }

  .status div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
  }

  .status div + div {
    border-top: 1px solid var(--color-border);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  dd.yes {
    color: var(--color-ok-text);
  }

  dd.bad,
  .error-text {
    color: var(--color-danger);
  }

  .error-text {
    margin: 0;
  }

  .hint {
    margin: 0;
    font-size: var(--text-sm);
  }
</style>
